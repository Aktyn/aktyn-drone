import { MessageType } from "@aktyn-drone/common"
import { memo, type PropsWithChildren, useEffect, useRef } from "react"
import { PeerDataSource } from "~/lib/p2p-data-source"
import { base64ToUint8Array, cn } from "~/lib/utils"
import { useConnectionMessageHandler } from "~/providers/connection-provider"

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
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const p2pPlayerRef = useRef<InstanceType<
      typeof window.JSMpeg.Player
    > | null>(null)

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

      const p2pPlayer = new window.JSMpeg.Player(null, {
        source: PeerDataSource,
        canvas,
        autoplay: true,
        audio: false,
        loop: false,
        stream: true,
      })
      p2pPlayerRef.current = p2pPlayer

      p2pPlayer.source.onOpen()

      return () => {
        try {
          p2pPlayer.source.destroy()
          p2pPlayer.destroy()
        } catch (error) {
          console.error("Error destroying p2pPlayer", error)
        }
        p2pPlayerRef.current = null
      }
    }, [])

    return (
      <div
        className={cn(
          "rounded-lg overflow-hidden bg-background border relative",
          className,
        )}
      >
        <canvas ref={canvasRef} width={480} height={360}></canvas>
        {children}
      </div>
    )
  },
)

DroneCameraPreview.displayName = "DroneCameraPreview"
