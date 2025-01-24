import { clamp, MessageType } from "@aktyn-drone/common"
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

type DroneCameraPreviewProps = PropsWithChildren<{
  className?: string
  hideNoPreviewInfo?: boolean
}>

export const DroneCameraPreview = memo<DroneCameraPreviewProps>(
  ({ children, className, hideNoPreviewInfo }) => {
    const { send, isConnected } = useConnection()
    const { settings } = useSettings()
    const { showCameraPreview, cameraResolution, cameraFramerate } = settings

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

      let timeout: NodeJS.Timeout | undefined
      if (showCameraPreview) {
        console.info(
          `Requesting camera stream\nresolution: ${JSON.stringify(
            cameraResolution,
          )}\nframerate: ${cameraFramerate}`,
        )
        timeout = setTimeout(() => {
          send({
            type: MessageType.REQUEST_CAMERA_STREAM,
            data: {
              width: cameraResolution.width,
              height: cameraResolution.height,
              framerate: clamp(cameraFramerate, 1, 60),
            },
          })
        }, 16)
      } else {
        send({
          type: MessageType.CLOSE_CAMERA_STREAM,
          data: {},
        })
      }

      return () => {
        if (timeout) {
          clearTimeout(timeout)
        }
      }
    }, [
      send,
      isConnected,
      cameraResolution,
      showCameraPreview,
      cameraFramerate,
    ])

    useInterval(
      () => {
        const canvas = canvasRef.current
        const image = imageRef.current
        if (!canvas || !image || !showCameraPreview) return

        getCanvasSnapshot(canvas)
          .then((url) => {
            image.src = url
          })
          .catch(console.error)
      },
      10_000,
      [showCameraPreview],
    )

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
      if (!canvas || !showCameraPreview) {
        return
      }

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
    }, [snapshot, showCameraPreview])

    if (!showCameraPreview) {
      if (hideNoPreviewInfo) {
        return null
      }

      return (
        <div
          className={cn(
            "rounded-lg flex items-center justify-center border shadow-lg p-8 aspect-[4/3] backdrop-blur-sm bg-background/50",
            className,
          )}
        >
          <span className="text-muted-foreground text-2xl text-center font-bold">
            Camera preview is disabled
          </span>
        </div>
      )
    }

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
