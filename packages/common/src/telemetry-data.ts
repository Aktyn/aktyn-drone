export type TelemetryDataFull = {
  pitch: number
  roll: number
  yaw: number
  percentage: number
  latitude: number
  longitude: number
  /** cm/s */
  groundSpeed: number
  /** degrees */
  heading: number
  /** meters */
  altitude: number
  satellites: number
}

export enum TelemetryType {
  ATTITUDE = "attitude",
  BATTERY = "battery",
  GPS = "gps",
}

export type TelemetryData =
  | ({
      type: TelemetryType.ATTITUDE
    } & Pick<TelemetryDataFull, "pitch" | "roll" | "yaw">)
  | ({
      type: TelemetryType.BATTERY
    } & Pick<TelemetryDataFull, "percentage">)
  | ({
      type: TelemetryType.GPS
    } & Pick<
      TelemetryDataFull,
      | "latitude"
      | "longitude"
      | "groundSpeed"
      | "heading"
      | "altitude"
      | "satellites"
    >)
