import { MessageType } from "@aktyn-drone/common"
import type { FlightControllerModule } from "./flight-controller/flight-controller-module"
import { logger } from "./logger"
import { Connection } from "./p2p"

export class SafetyMeasures {
  private initSafetyMeasures = this.initiate.bind(this)
  private startCountdown = this.startSafetyMeasuresCountdown.bind(this)
  private cancelCountdown = this.cancelSafetyMeasuresCountdown.bind(this)
  private safetyMeasuresTimeout: NodeJS.Timeout | null = null

  constructor(private readonly flightControllerModule: FlightControllerModule) {
    Connection.addListener("disconnect", this.startCountdown)
    Connection.addListener("connectionOpened", this.cancelCountdown)
    Connection.addListener("ping-timeout", this.initSafetyMeasures)
  }

  destroy() {
    Connection.removeListener("disconnect", this.startCountdown)
    Connection.removeListener("connectionOpened", this.cancelCountdown)
    Connection.removeListener("ping-timeout", this.initSafetyMeasures)
  }

  private startSafetyMeasuresCountdown() {
    if (Connection.hasConnections()) {
      return
    }

    this.safetyMeasuresTimeout = setTimeout(
      () => {
        this.initiate()
        this.safetyMeasuresTimeout = null
      },
      1_000 * 60 * 5, // 5 minutes
    )
  }

  private cancelSafetyMeasuresCountdown() {
    if (this.safetyMeasuresTimeout) {
      clearTimeout(this.safetyMeasuresTimeout)
      this.safetyMeasuresTimeout = null
    }
  }

  private initiate() {
    logger.info("Initiating safety measures")

    this.flightControllerModule.sendMessageToPython({
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
}
