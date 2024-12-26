import { randomString } from "@aktyn-drone/common"
import { config } from "dotenv"
import { logger } from "./logger"
import { Connection } from "./p2p"
import { initCameraModule } from "./camera/camera-module"

config()

const peerId = process.env.PEER_ID ?? randomString(24)
Connection.init(peerId)

const cameraModule = initCameraModule()

process.on("SIGINT", () => {
  logger.info("Shutting down...")
  cameraModule.cleanup()
  process.exit()
})
