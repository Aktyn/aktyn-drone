import {
  type AltitudeTelemetryData,
  clamp,
  type GpsTelemetryData,
} from "@aktyn-drone/common"
import type {
  ChildProcessWithoutNullStreams,
  MessageOptions,
  SendHandle,
  Serializable,
} from "child_process"
import { EventEmitter } from "events"
import { Readable, Writable } from "stream"
import { logger } from "../logger"
import type { PythonScriptMessage } from "./flight-controller-module"
import { TelemetryDataType, type TelemetryUpdateData } from "./telemetry"

class MockWritableStream extends Writable {
  constructor(private readonly handleWrite: (data: string) => void) {
    super()
  }

  write(
    chunk: string | Buffer,
    encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
    callback?: (error?: Error | null) => void,
  ) {
    this.handleWrite(
      typeof chunk === "string"
        ? chunk
        : chunk.toString(typeof encoding === "string" ? encoding : undefined),
    )

    if (!encoding || typeof encoding === "function") {
      return super.write(chunk, encoding ?? callback)
    } else {
      return super.write(chunk, encoding, callback)
    }
  }

  _write(
    _chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    callback()
  }
}

class MockReadableStream extends Readable {
  _read(_size: number): void {}
}

export class MockedPythonScriptProcess
  extends EventEmitter
  implements ChildProcessWithoutNullStreams
{
  stdin: Writable = new MockWritableStream(this.handleWrite.bind(this))
  stdout: Readable = new MockReadableStream()
  stderr: Readable = new MockReadableStream()

  pid: number | undefined = 12345
  connected: boolean = false
  spawnfile: string = "mock"
  spawnargs: string[] = []
  stdio: [Writable, Readable, Readable, Readable, Readable] = [
    this.stdin,
    this.stdout,
    this.stderr,
    new MockReadableStream(),
    new MockReadableStream(),
  ]
  killed: boolean = false
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null

  private throttle = 0
  private mockSlowUpdatesInterval: NodeJS.Timeout | null = null
  private mockFastUpdatesInterval: NodeJS.Timeout | null = null
  private batteryPercentage = 50
  private yawFactor = 0.5
  private attitude: AltitudeTelemetryData = {
    pitch: 0,
    roll: 0,
    yaw: 0,
  }
  private gpsData: GpsTelemetryData = {
    latitude: 51.770816,
    longitude: 19.417706,
    groundSpeed: 0,
    heading: 0,
    altitude: 200,
    satellites: 8,
  }

  constructor() {
    super()

    this.mockUpdates()
  }

  kill(_signal?: NodeJS.Signals | number): boolean {
    this.killed = true
    this.exitCode = 0
    this.emit("close", 0)

    if (this.mockSlowUpdatesInterval) {
      clearInterval(this.mockSlowUpdatesInterval)
      this.mockSlowUpdatesInterval = null
    }

    if (this.mockFastUpdatesInterval) {
      clearInterval(this.mockFastUpdatesInterval)
      this.mockFastUpdatesInterval = null
    }

    return true
  }
  send(
    _message: Serializable,
    sendHandle?: SendHandle | ((error: Error | null) => void),
    options?: MessageOptions | ((error: Error | null) => void),
    callback?: (error: Error | null) => void,
  ): boolean {
    if (typeof sendHandle === "function") {
      callback = sendHandle
      sendHandle = undefined
      options = undefined
    } else if (typeof options === "function") {
      callback = options
      options = undefined
    }
    if (callback) {
      callback(null)
    }
    return true
  }
  disconnect(): void {}
  unref(): void {}
  ref(): void {}
  [Symbol.dispose](): void {
    // Mock implementation for Symbol.dispose
  }

  // -------------------------------

  private mockUpdates() {
    if (this.mockSlowUpdatesInterval) {
      clearInterval(this.mockSlowUpdatesInterval)
    }

    this.mockSlowUpdatesInterval = setInterval(() => {
      this.secondaryUpdate()
    }, 1_000)

    if (this.mockFastUpdatesInterval) {
      clearInterval(this.mockFastUpdatesInterval)
    }

    let last = Date.now()
    this.mockFastUpdatesInterval = setInterval(() => {
      const now = Date.now()
      const dt = now - last
      last = now
      this.update(dt / 1000)
    }, 1_000 / 60)
  }

  private update(deltaTime: number) {
    if (Math.abs(this.yawFactor - 0.5) > EPSILON) {
      this.attitude.yaw += factorToRadians(this.yawFactor) * deltaTime

      this.emitData({
        type: TelemetryDataType.ATTITUDE,
        ...this.attitude,
      })

      this.gpsData.heading = this.attitude.yaw * (180 / Math.PI)
      this.emitData({
        type: TelemetryDataType.GPS,
        ...this.gpsData,
      })
    }

    if (Math.abs(this.attitude.pitch) > EPSILON) {
      const speed = this.throttle * (-this.attitude.pitch / Math.PI) * 100
      const direction = this.attitude.yaw

      const distanceMeters = speed * deltaTime
      const earthRadiusMeters = 6371000

      const currentLatitudeRad = this.gpsData.latitude * (Math.PI / 180)

      const deltaLatRad =
        (distanceMeters * Math.cos(direction)) / earthRadiusMeters
      const deltaLonRad =
        (distanceMeters * Math.sin(direction)) /
        (earthRadiusMeters * Math.cos(currentLatitudeRad))

      this.gpsData.latitude += deltaLatRad * (180 / Math.PI)
      this.gpsData.longitude += deltaLonRad * (180 / Math.PI)
      this.gpsData.groundSpeed = Math.abs(speed * 100)
      this.gpsData.heading = direction * (180 / Math.PI) //degrees

      this.emitData({
        type: TelemetryDataType.GPS,
        ...this.gpsData,
      })
    } else if (this.gpsData.groundSpeed !== 0) {
      this.gpsData.groundSpeed = 0

      this.emitData({
        type: TelemetryDataType.GPS,
        ...this.gpsData,
      })
    }
  }

  private secondaryUpdate() {
    const action = Math.floor(Math.random() * 2)

    switch (action) {
      case 0:
        {
          this.batteryPercentage = clamp(
            this.batteryPercentage + (Math.random() > 0.5 ? -1 : 1),
            0,
            100,
          )

          this.emitData({
            type: TelemetryDataType.BATTERY,
            percentage: this.batteryPercentage,
          })
        }
        break
      case 1:
        {
          this.gpsData.satellites = clamp(
            this.gpsData.satellites + (Math.random() > 0.5 ? -1 : 1),
            3,
            16,
          )

          this.emitData({
            type: TelemetryDataType.GPS,
            ...this.gpsData,
            // groundSpeed: Math.random() * 100, //cm/s
            // heading: Math.random() * 360 - 180, //degrees
            // altitude: 200 + Math.random() * 100, //meters
          })
        }
        break
    }
  }

  private handleWrite(stringifiedData: string) {
    const data = JSON.parse(stringifiedData) as PythonScriptMessage

    switch (data.type) {
      case "set-throttle":
        {
          this.throttle = data.value.throttle

          this.gpsData.altitude = 200 + data.value.throttle * 100
          this.emitData({
            type: TelemetryDataType.GPS,
            ...this.gpsData,
            // groundSpeed: Math.random() * 100, //cm/s
            // heading: Math.random() * 360 - 180, //degrees
            // altitude: 200 + Math.random() * 100, //meters
          })
        }
        break
      case "euler-angles":
        {
          this.yawFactor = data.value.yaw
          this.attitude.pitch = factorToRadians(data.value.pitch)
          this.attitude.roll = factorToRadians(data.value.roll)

          this.emitData({
            type: TelemetryDataType.ATTITUDE,
            ...this.attitude,
          })
        }
        break
      case "set-aux":
        // noop
        break
      default:
        logger.warn("Unhandled message:", JSON.stringify(data))
        break
    }
  }

  //TODO: debounce by update.type
  private emitData(update: TelemetryUpdateData) {
    this.stdout.emit("data", JSON.stringify(update) + "\n")
  }
}

function factorToRadians(factor: number) {
  return (factor * 2 - 1) * Math.PI
}

const EPSILON = 1e-6
