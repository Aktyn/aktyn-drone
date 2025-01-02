import { type Message, MessageType } from "@aktyn-drone/common"
import { type ChildProcessWithoutNullStreams, spawn } from "child_process"
import path from "path"
import type { DataConnection } from "../../types/peerjs"
import { logger } from "../logger"
import { Connection } from "../p2p"
import { Telemetry } from "./telemetry"

export function initFlightControllerModule() {
  logger.info("Initializing flight controller module")

  const telemetry = new Telemetry()

  let pythonScriptProcess: ChildProcessWithoutNullStreams | null = null

  const start = () => {
    pythonScriptProcess = startPythonScript(telemetry, () => {
      setTimeout(start, 5000)
    })
  }
  start()

  const sendMessageToPython = (data: object) => {
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
        sendMessageToPython({
          type: "set-aux",
          value: {
            index: message.data.auxIndex,
            value: message.data.value / 100,
          },
        })
        break
    }
  }

  Connection.addListener("message", handleMessage)

  return {
    cleanup: () => {
      Connection.removeListener("message", handleMessage)

      try {
        pythonScriptProcess?.kill()
      } catch (error) {
        logger.error("Error killing python script process:", error)
      }
    },
  }
}

function startPythonScript(
  telemetry: Telemetry,
  onClose: (code: number | null) => void,
) {
  const pythonProcess = spawn(
    path.join(__dirname, "..", "..", "scripts", "main.py"),
    {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    },
  )

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
