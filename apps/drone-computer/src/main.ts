import { MessageType, randomString } from "@aktyn-drone/common"
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

function initiateSafetyMeasures() {
  logger.info("Initiating safety measures.")

  flightControllerModule.sendMessageToPython({
    type: "set-aux",
    value: {
      index: 3,
      value: 90.66 / 100,
    },
  })
  Connection.broadcast({
    type: MessageType.AUX_VALUE,
    data: {
      auxIndex: 3,
      value: 90.66,
    },
  })
}

Connection.addListener("ping-timeout", initiateSafetyMeasures)

process.on("SIGINT", () => {
  logger.info("Shutting down...")
  Connection.removeListener("ping-timeout", initiateSafetyMeasures)
  cameraModule.cleanup()
  flightControllerModule.cleanup()
  process.exit()
})
