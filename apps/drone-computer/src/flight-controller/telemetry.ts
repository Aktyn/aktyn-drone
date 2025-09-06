import {
  type AltitudeTelemetryData,
  type BatteryTelemetryData,
  type GpsTelemetryData,
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

export enum TelemetryDataType {
  ERROR = "ERROR",
  INFO = "INFO",
  ATTITUDE = "ATTITUDE",
  BATTERY = "BATTERY",
  GPS = "GPS",
  VARIO = "VARIO",
  BARO_ALTITUDE = "BARO_ALTITUDE",
  LINK_STATISTICS = "LINK_STATISTICS",
}

export type TelemetryUpdateData =
  | {
      type: TelemetryDataType.ERROR | TelemetryDataType.INFO
      message: string
    }
  | ({
      type: TelemetryDataType.ATTITUDE
    } & AltitudeTelemetryData)
  | ({
      type: TelemetryDataType.BATTERY
    } & BatteryTelemetryData)
  | ({
      type: TelemetryDataType.GPS
    } & GpsTelemetryData)
  | {
      type:
        | TelemetryDataType.VARIO
        | TelemetryDataType.BARO_ALTITUDE
        | TelemetryDataType.LINK_STATISTICS
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
    rpiTemperature: { value: -Infinity, tolerance: 0.1 },
  } as const satisfies TelemetryComparatorState
  private homePoint: {
    latitude: number
    longitude: number
  } | null = null

  update(data: TelemetryUpdateData) {
    switch (data.type) {
      default:
        logger.warn("Unhandled message:", JSON.stringify(data))
        break
      case TelemetryDataType.ERROR:
        logger.error("Python script error:", data.message)
        break
      case TelemetryDataType.INFO:
        logger.info("Python script info:", data.message)
        break
      case TelemetryDataType.ATTITUDE:
        this.synchronizeTelemetry({
          type: TelemetryType.ATTITUDE,
          pitch: data.pitch,
          roll: data.roll,
          yaw: data.yaw,
        })
        break
      case TelemetryDataType.BATTERY:
        this.synchronizeTelemetry({
          type: TelemetryType.BATTERY,
          percentage: data.percentage,
        })
        break
      case TelemetryDataType.GPS:
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
      case TelemetryDataType.VARIO:
      case TelemetryDataType.BARO_ALTITUDE:
      case TelemetryDataType.LINK_STATISTICS:
        logger.warn("Unsupported message type:", data.type)
        break
    }
  }

  sendFullTelemetry(conn?: DataConnection) {
    Connection.broadcast(
      {
        type: MessageType.TELEMETRY_FULL,
        data: Object.entries(this.comparatorState).reduce(
          (acc, [key, value]) => {
            acc[key as keyof typeof acc] = value.value
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

    Connection.broadcast({
      type: MessageType.TELEMETRY_UPDATE,
      data,
    })
  }

  synchronizeTelemetry(data: TelemetryData) {
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

  setHomePoint() {
    logger.info(
      `Setting home point at ${this.comparatorState.latitude.value} ${this.comparatorState.longitude.value}`,
    )
    this.homePoint = {
      latitude: this.comparatorState.latitude.value,
      longitude: this.comparatorState.longitude.value,
    }
  }

  getHomePoint() {
    return this.homePoint
  }
}
