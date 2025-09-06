export type AltitudeTelemetryData = {
  /** radians */
  pitch: number

  /** radians */
  roll: number

  /** radians */
  yaw: number
}
export type BatteryTelemetryData = {
  percentage: number
}
export type GpsTelemetryData = {
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
type MiscellaneousTelemetryData = {
  /** degrees Celsius */
  rpiTemperature: number
}

export type TelemetryDataFull = AltitudeTelemetryData &
  BatteryTelemetryData &
  GpsTelemetryData &
  MiscellaneousTelemetryData

export enum TelemetryType {
  ATTITUDE = "attitude",
  BATTERY = "battery",
  GPS = "gps",
  MISCELLANEOUS = "miscellaneous",
}

export type TelemetryData =
  | ({
      type: TelemetryType.ATTITUDE
    } & AltitudeTelemetryData)
  | ({
      type: TelemetryType.BATTERY
    } & BatteryTelemetryData)
  | ({
      type: TelemetryType.GPS
    } & GpsTelemetryData)
  | ({
      type: TelemetryType.MISCELLANEOUS
    } & MiscellaneousTelemetryData)
