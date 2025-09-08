import type { TelemetryData, TelemetryDataFull } from "./telemetry-data"
import type { LogFunctions } from "./utils/types"

export enum MessageType {
  PING = "ping",
  PONG = "pong",
  LOG = "log",
  REQUEST_TODAY_LOGS = "request_today_logs",
  TODAY_LOGS = "today_logs",
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
  AUX_VALUE = "aux_values",
  REQUEST_HOME_POINT = "request_home_point",
  HOME_POINT_COORDINATES = "home_point_coordinates",
  REQUEST_AUX = "request_aux",
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
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  | MessageBase<MessageType.REQUEST_TODAY_LOGS, {}>
  | MessageBase<MessageType.TODAY_LOGS, { todayLogsFileContent: string }>
  | MessageBase<
      MessageType.REQUEST_CAMERA_STREAM,
      {
        width: number
        height: number
        framerate: number
      }
    >
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  | MessageBase<MessageType.CLOSE_CAMERA_STREAM, {}>
  | MessageBase<
      MessageType.CAMERA_DATA,
      {
        base64: string
      }
    >
  | MessageBase<MessageType.TELEMETRY_UPDATE, TelemetryData>
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  | MessageBase<MessageType.REQUEST_TELEMETRY, {}>
  | MessageBase<MessageType.TELEMETRY_FULL, TelemetryDataFull>
  | MessageBase<
      MessageType.SET_THROTTLE,
      {
        /** Percentage value, 0 to 100 */
        throttle: number
      }
    >
  | MessageBase<
      MessageType.SEND_EULER_ANGLES,
      { yaw: number; pitch: number; roll: number }
    >
  | MessageBase<MessageType.SET_AUX, { auxIndex: AuxIndex; value: number }>
  | MessageBase<MessageType.AUX_VALUE, { auxIndex: AuxIndex; value: number }>
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  | MessageBase<MessageType.REQUEST_HOME_POINT, {}>
  | MessageBase<
      MessageType.HOME_POINT_COORDINATES,
      { latitude: number; longitude: number }
    >
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  | MessageBase<MessageType.REQUEST_AUX, {}>

export type AuxIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
