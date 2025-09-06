import {
  type AuxIndex,
  type Message,
  MessageType,
  TelemetryType,
} from "@aktyn-drone/common"
import { type ChildProcessWithoutNullStreams, spawn } from "child_process"
import path from "path"
import type { DataConnection } from "../../types/peerjs"
import { logger } from "../logger"
import { Connection } from "../p2p"
import { MockedPythonScriptProcess } from "./python-script-process.mock"
import { Telemetry } from "./telemetry"
import { getRpiTemperature } from "./temperature-monitor"

export type PythonScriptMessage =
  | {
      type: "set-throttle"
      value: {
        /** Normalized throttle value */
        throttle: number
      }
    }
  | {
      type: "set-aux"
      value: {
        index: AuxIndex
        /** Normalized aux value */
        value: number
      }
    }
  | {
      type: "euler-angles"
      value: {
        /** Normalized yaw value */
        yaw: number
        /** Normalized pitch value */
        pitch: number
        /** Normalized roll value */
        roll: number
      }
    }

export function initFlightControllerModule() {
  const mock = process.env.MOCK_FLIGHT_CONTROLLER === "true"

  logger.info(`Initializing${mock ? " mocked" : ""} flight controller module`)

  const telemetry = new Telemetry()

  const temperatureMonitorInterval = setInterval(() => {
    telemetry.synchronizeTelemetry({
      type: TelemetryType.MISCELLANEOUS,
      rpiTemperature: getRpiTemperature(),
    })
  }, 5_000)

  let pythonScriptProcess: ChildProcessWithoutNullStreams | null = null

  const start = () => {
    pythonScriptProcess = startPythonScript(
      telemetry,
      () => {
        setTimeout(start, 5000)
      },
      mock,
    )
  }
  start()

  const sendMessageToPython = (data: PythonScriptMessage) => {
    try {
      const io = pythonScriptProcess?.stdin
      if (!io || !io.writable) {
        logger.error("Python script stdin is not writable")
        return
      }
      io.write(JSON.stringify(data) + "\n", (error) => {
        if (error) {
          logger.error("Error writing to python script stdin:", error)
        }
      })
    } catch (error) {
      logger.error("Error sending message to python script:", error)
    }
  }

  const handleMessage = (message: Message, conn: DataConnection) => {
    switch (message.type) {
      case MessageType.REQUEST_TELEMETRY:
        telemetry.sendFullTelemetry(conn)
        break
      case MessageType.SET_THROTTLE:
        sendMessageToPython({
          type: "set-throttle",
          value: { throttle: message.data.throttle / 100 },
        })
        break
      case MessageType.SEND_EULER_ANGLES:
        sendMessageToPython({
          type: "euler-angles",
          value: {
            yaw: rangeToFactor(message.data.yaw),
            pitch: rangeToFactor(message.data.pitch),
            roll: rangeToFactor(message.data.roll),
          },
        })
        break
      case MessageType.SET_AUX:
        if (
          message.data.auxIndex === 0 &&
          Math.abs(message.data.value - 90.66) < 0.1
        ) {
          telemetry.setHomePoint()
        }
        sendMessageToPython({
          type: "set-aux",
          value: {
            index: message.data.auxIndex,
            value: message.data.value / 100,
          },
        })
        break
      case MessageType.REQUEST_HOME_POINT:
        {
          const homePoint = telemetry.getHomePoint()
          if (homePoint) {
            Connection.broadcast({
              type: MessageType.HOME_POINT_COORDINATES,
              data: homePoint,
            })
          }
        }
        break
    }
  }

  Connection.addListener("message", handleMessage)

  return {
    cleanup: () => {
      Connection.removeListener("message", handleMessage)

      clearInterval(temperatureMonitorInterval)

      try {
        pythonScriptProcess?.kill()
      } catch (error) {
        logger.error("Error killing python script process:", error)
      }
    },
    sendMessageToPython,
  }
}

function startPythonScript(
  telemetry: Telemetry,
  onClose: (code: number | null) => void,
  mock: boolean,
) {
  const pythonProcess = mock
    ? new MockedPythonScriptProcess()
    : spawn(path.join(__dirname, "..", "..", "scripts", "main.py"), {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      })

  pythonProcess.stdout.on("data", (data) => {
    try {
      const lines = data
        ?.toString()
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean)
      if (!lines || !lines.length) {
        return
      }
      for (const line of lines) {
        if (!line.match(/^\{[\s\S]*\}$/)) {
          logger.warn("Invalid JSON string:", line)
          return
        }
        try {
          telemetry.update(JSON.parse(line))
        } catch (error) {
          logger.error("Error parsing Python output line:", error)
          logger.warn("Line:", line)
        }
      }
    } catch (error) {
      logger.error("Error parsing Python script output:", error)
      logger.warn("Raw output:", data.toString())
    }
  })

  pythonProcess.stderr.on("data", (data) => {
    logger.error("Python script error:", data.toString())
  })

  pythonProcess.on("close", (code) => {
    logger.error(
      `Python script exited with code ${code}`, // Restarting in 5 seconds...
    )
    onClose(code)
  })

  return pythonProcess
}

function rangeToFactor(value: number) {
  return (value + 1) / 2
}
