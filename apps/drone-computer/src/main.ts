import { randomString } from "@aktyn-drone/common"
import { config } from "dotenv"
import { logger } from "./logger"
import { Connection } from "./p2p"
import { initCameraModule } from "./camera/camera-module"
import { initFlightControllerModule } from "./flight-controller/flight-controller-module"

config()

const peerId = process.env.PEER_ID ?? randomString(24)
Connection.init(peerId)

const cameraModule = initCameraModule()
const flightControllerModule = initFlightControllerModule()

process.on("SIGINT", () => {
  logger.info("Shutting down...")
  cameraModule.cleanup()
  flightControllerModule.cleanup()
  process.exit()
})
