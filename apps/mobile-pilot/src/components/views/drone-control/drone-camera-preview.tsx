import { MessageType } from "@aktyn-drone/common"
import {
  memo,
  type PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react"
import { useInterval } from "~/hooks/useInterval"
import { PeerDataSource } from "~/lib/p2p-data-source"
import { base64ToUint8Array, cn } from "~/lib/utils"
import {
  useConnection,
  useConnectionMessageHandler,
} from "~/providers/connection-provider"
import { useSettings } from "~/providers/settings-provider"

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    JSMpeg: {
      Player: {
        new (
          _: any,
          config: any,
        ): {
          source: InstanceType<typeof PeerDataSource>
          video: {
            destroy: () => void
          }
          destroy: () => void
        }
      }
    }
  }
}

type DroneCameraPreviewProps = PropsWithChildren<{ className?: string }>

export const DroneCameraPreview = memo<DroneCameraPreviewProps>(
  ({ children, className }) => {
    const { send, isConnected } = useConnection()
    const { cameraResolution } = useSettings()

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const p2pPlayerRef = useRef<InstanceType<
      typeof window.JSMpeg.Player
    > | null>(null)

    const [snapshot, setSnapshot] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
      if (!isConnected) {
        return
      }
      console.info("Requesting camera stream with resolution", cameraResolution)
      const timeout = setTimeout(() => {
        send({
          type: MessageType.REQUEST_CAMERA_STREAM,
          data: {
            width: cameraResolution.width,
            height: cameraResolution.height,
          },
        })
      }, 16)

      return () => clearTimeout(timeout)
    }, [send, isConnected, cameraResolution])

    useInterval(() => {
      const canvas = canvasRef.current
      const image = imageRef.current
      if (!canvas || !image) return

      getCanvasSnapshot(canvas)
        .then((url) => {
          image.src = url
        })
        .catch(console.error)
    }, 10_000)

    useConnectionMessageHandler((message) => {
      switch (message.type) {
        case MessageType.CAMERA_DATA:
          {
            const uint8Array = base64ToUint8Array(message.data.base64)
            if (uint8Array && p2pPlayerRef.current) {
              p2pPlayerRef.current.source.onMessage({ data: uint8Array })
            }
          }
          break
      }
    })

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      let readyTimeout: NodeJS.Timeout | null = null

      const p2pPlayer = new window.JSMpeg.Player(null, {
        source: PeerDataSource,
        canvas,
        autoplay: true,
        audio: false,
        loop: false,
        stream: true,
        preserveDrawingBuffer: true,
        onPlay: () => {
          readyTimeout = setTimeout(() => {
            setLoading(false)
            readyTimeout = null
            if (snapshot) {
              URL.revokeObjectURL(snapshot)
            }
          }, 200)
        },
      })
      p2pPlayerRef.current = p2pPlayer

      p2pPlayer.source.onOpen()

      return () => {
        if (readyTimeout) {
          clearTimeout(readyTimeout)
        }

        try {
          p2pPlayer.source.destroy()
          p2pPlayer.destroy()
        } catch (error) {
          console.error("Error destroying p2pPlayer", error)
        }
        p2pPlayerRef.current = null
      }
    }, [snapshot])

    return (
      <div
        className={cn(
          "rounded-lg overflow-hidden bg-background shadow-lg border aspect-[4/3] relative",
          className,
        )}
      >
        <canvas ref={canvasRef} className="size-full bg-background"></canvas>
        <img
          ref={imageRef}
          onLoad={(event) => {
            setLoading(true)
            setSnapshot(event.currentTarget.src)
          }}
          className={cn(
            "absolute inset-0 size-full",
            loading ? "opacity-100" : "opacity-0",
          )}
        />
        {children}
      </div>
    )
  },
  (prevProps, nextProps) => {
    return prevProps.className === nextProps.className
  },
)

DroneCameraPreview.displayName = "DroneCameraPreview"

function getCanvasSnapshot(canvas: HTMLCanvasElement) {
  return new Promise<string>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        return resolve("")
      }
      const url = URL.createObjectURL(blob)
      resolve(url)
    }, "image/jpeg")
  })
}
