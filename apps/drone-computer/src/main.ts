import { randomString } from "@aktyn-drone/common"
import { config } from "dotenv"
import { initCameraModule } from "./camera/camera-module"
import { initFlightControllerModule } from "./flight-controller/flight-controller-module"
import { logger } from "./logger"
import { Connection } from "./p2p"
import { SafetyMeasures } from "./safety-measures"

config()

const peerId = process.env.PEER_ID ?? randomString(24)
Connection.init(peerId)

const cameraModule = initCameraModule()
const flightControllerModule = initFlightControllerModule()

const safetyMeasures = new SafetyMeasures(flightControllerModule)

process.on("SIGINT", () => {
  logger.info("Shutting down...")

  safetyMeasures.destroy()

  cameraModule.cleanup()
  flightControllerModule.cleanup()
  process.exit()
})
