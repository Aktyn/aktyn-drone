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
  /** Sends throttle percentage value in range [0, 100] */
  SET_THROTTLE = "set_throttle",
  /** Sends Yaw, Pitch and Roll values in range [-1, 1] */
  SEND_EULER_ANGLES = "send_euler_angles",
  SET_AUX = "set_aux",
  REQUEST_HOME_POINT = "request_home_point",
  HOME_POINT_COORDINATES = "home_point_coordinates",
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
        framerate: number
      }
    >
  // eslint-disable-next-line @typescript-eslint/ban-types
  | MessageBase<MessageType.CLOSE_CAMERA_STREAM, {}>
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
  | MessageBase<MessageType.SET_THROTTLE, { throttle: number }>
  | MessageBase<
      MessageType.SEND_EULER_ANGLES,
      { yaw: number; pitch: number; roll: number }
    >
  | MessageBase<MessageType.SET_AUX, { auxIndex: number; value: number }>
  // eslint-disable-next-line @typescript-eslint/ban-types
  | MessageBase<MessageType.REQUEST_HOME_POINT, {}>
  | MessageBase<
      MessageType.HOME_POINT_COORDINATES,
      { latitude: number; longitude: number }
    >
