import { type Message, MessageType } from "@aktyn-drone/common"
import { logger } from "../logger"
import { Connection } from "../p2p"
import { startStreamServer } from "./stream-server"

export function initCameraModule() {
  logger.info("Initializing camera module")

  let streamCleanup: (() => void) | undefined
  let currentStreamResolution:
    | (Message & {
        type: MessageType.REQUEST_CAMERA_STREAM
      })["data"]
    | undefined

  const cleanupStream = () => {
    streamCleanup?.()
    streamCleanup = undefined
    currentStreamResolution = undefined
  }

  const handleMessage = (message: Message) => {
    switch (message.type) {
      case MessageType.REQUEST_CAMERA_STREAM:
        logger.info("Camera stream requested", message.data)
        if (
          !currentStreamResolution ||
          currentStreamResolution.width !== message.data.width ||
          currentStreamResolution.height !== message.data.height
        ) {
          cleanupStream()
          currentStreamResolution = message.data
          startStreamServer(message.data.width, message.data.height)
            .then((cleanup) => {
              streamCleanup = cleanup
            })
            .catch((error) => {
              logger.error(error)
              cleanupStream()
            })
        }
        break
      case MessageType.CLOSE_CAMERA_STREAM:
        cleanupStream()
        break
    }
  }

  const handleDisconnect = () => {
    if (!Connection.hasConnections()) {
      logger.info("No connections, closing camera stream")
      cleanupStream()
    }
  }

  Connection.addListener("message", handleMessage)
  Connection.addListener("disconnect", handleDisconnect)

  return {
    cleanup: () => {
      Connection.removeListener("message", handleMessage)
      Connection.removeListener("disconnect", handleDisconnect)
      cleanupStream()
    },
  }
}
