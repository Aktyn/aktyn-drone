import {
  MessageType,
  type TelemetryData,
  type TelemetryDataFull,
  TelemetryType,
} from "@aktyn-drone/common"
import type { DataConnection } from "../../types/peerjs"
import { logger } from "../logger"
import { Connection } from "../p2p"

type TelemetryComparatorState = {
  [K in keyof TelemetryDataFull]: { value: number; tolerance: number }
}

export class Telemetry {
  private readonly comparatorState = {
    pitch: { value: -Infinity, tolerance: 0.01 },
    roll: { value: -Infinity, tolerance: 0.01 },
    yaw: { value: -Infinity, tolerance: 0.01 },
    percentage: { value: -Infinity, tolerance: 1 },
    latitude: { value: -Infinity, tolerance: 0.0000001 },
    longitude: { value: -Infinity, tolerance: 0.0000001 },
    groundSpeed: { value: -Infinity, tolerance: 0.1 },
    heading: { value: -Infinity, tolerance: 1 },
    altitude: { value: -Infinity, tolerance: 0.1 },
    satellites: { value: -Infinity, tolerance: 1 },
  } as const satisfies TelemetryComparatorState

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(data: Record<string, any>) {
    switch (data.type) {
      default:
        logger.warn("Unhandled message:", JSON.stringify(data))
        break
      case "ERROR":
        logger.error("Python script error:", data.message)
        break
      case "INFO":
        logger.info("Python script info:", data.message)
        break
      case "ATTITUDE":
        this.synchronizeTelemetry({
          type: TelemetryType.ATTITUDE,
          pitch: data.pitch,
          roll: data.roll,
          yaw: data.yaw,
        })
        break
      case "BATTERY":
        this.synchronizeTelemetry({
          type: TelemetryType.BATTERY,
          percentage: data.percentage,
        })
        break
      case "GPS":
        this.synchronizeTelemetry({
          type: TelemetryType.GPS,
          latitude: data.latitude,
          longitude: data.longitude,
          groundSpeed: data.groundSpeed, //cm/s
          heading: data.heading, //degrees
          altitude: data.altitude, //meters
          satellites: data.satellites,
        })
        break
      case "VARIO":
      case "BARO_ALTITUDE":
      case "LINK_STATISTICS":
        logger.warn("Unsupported message type:", data.type)
        break
      // case "VARIO":
      //   return {
      //     type: "vario",
      //     value: {
      //       verticalSpeed: data.verticalSpeed, // meters per second
      //     },
      //   }
      // case "BARO_ALTITUDE":
      //   return {
      //     type: "baroAltitude",
      //     value: {
      //       altitude: data.altitude, // meters
      //     },
      //   }
      // case "LINK_STATISTICS":
      //   return {
      //     type: "linkStatistics",
      //     value: {
      //       rssi1: data.rssi1,
      //       rssi2: data.rssi2,
      //       linkQuality: data.linkQuality,
      //       snr: data.snr,
      //     },
      //   }
    }
  }

  sendFullTelemetry(conn?: DataConnection) {
    Connection.broadcast(
      {
        type: MessageType.TELEMETRY_FULL,
        data: Object.entries(this.comparatorState).reduce(
          (acc, [key, value]) => {
            acc[key as keyof typeof acc] = value.value as never
            return acc
          },
          {} as TelemetryDataFull,
        ),
      },
      conn ? [conn] : undefined,
    )
  }

  private updateState(data: TelemetryData) {
    for (const key in data) {
      if (key === "type") {
        continue
      }
      Object.assign(
        this.comparatorState[key as keyof typeof this.comparatorState],
        {
          value: data[key as keyof TelemetryData],
        },
      )
    }
  }

  private handleTelemetryChange(data: TelemetryData) {
    this.updateState(data)

    // logger.log("Telemetry:", data) //It causes a lot of logs
    Connection.broadcast({
      type: MessageType.TELEMETRY_UPDATE,
      data,
    })
  }

  private synchronizeTelemetry(data: TelemetryData) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, ...dataWithoutType } = data

    for (const key in dataWithoutType) {
      const state =
        this.comparatorState[key as keyof typeof this.comparatorState]
      const diff = Math.abs(
        dataWithoutType[key as keyof typeof dataWithoutType] - state.value,
      )
      if (diff > state.tolerance) {
        this.handleTelemetryChange(data)
        break
      }
    }
  }
}
