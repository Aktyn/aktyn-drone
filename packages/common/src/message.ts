import type { TelemetryData, TelemetryDataFull } from "./telemetry-data"
import type { LogFunctions } from "./utils/types"

export enum MessageType {
  PING = "ping",
  PONG = "pong",
  LOG = "log",
  REQUEST_CAMERA_STREAM = "request_camera_stream",
  CLOSE_CAMERA_STREAM = "close_camera_stream",
  CAMERA_DATA = "camera_data",
  TELEMETRY_UPDATE = "telemetry_update",
  REQUEST_TELEMETRY = "request_telemetry",
  TELEMETRY_FULL = "telemetry_full",
}

type MessageBase<Type extends MessageType, Data extends object> = {
  type: Type
  data: Data
}

export type Message =
  | MessageBase<
      MessageType.PING,
      {
        id: number | string
      }
    >
  | MessageBase<
      MessageType.PONG,
      {
        pingId: number | string
      }
    >
  | MessageBase<
      MessageType.LOG,
      {
        method: keyof LogFunctions
        timestamp: number
        args: unknown[]
      }
    >
  | MessageBase<
      MessageType.REQUEST_CAMERA_STREAM,
      {
        width: number
        height: number
      }
    >
  | MessageBase<
      MessageType.CLOSE_CAMERA_STREAM,
      {
        streamId: string
      }
    >
  | MessageBase<
      MessageType.CAMERA_DATA,
      {
        base64: string
      }
    >
  | MessageBase<MessageType.TELEMETRY_UPDATE, TelemetryData>
  // eslint-disable-next-line @typescript-eslint/ban-types
  | MessageBase<MessageType.REQUEST_TELEMETRY, {}>
  | MessageBase<MessageType.TELEMETRY_FULL, TelemetryDataFull>
