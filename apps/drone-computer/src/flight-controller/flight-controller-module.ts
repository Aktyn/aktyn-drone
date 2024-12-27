import { type Message, MessageType } from "@aktyn-drone/common"
import { spawn } from "child_process"
import path from "path"
import type { DataConnection } from "../../types/peerjs"
import { logger } from "../logger"
import { Connection } from "../p2p"
import { Telemetry } from "./telemetry"

export function initFlightControllerModule() {
  logger.info("Initializing flight controller module")

  const telemetry = new Telemetry()

  const pythonScriptProcess = spawn(
    path.join(__dirname, "..", "..", "scripts", "main.py"),
    {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    },
  )

  pythonScriptProcess.stdout.on("data", (data) => {
    try {
      const stringValue = data.toString().trim().replace(/\n/g, "")
      if (!stringValue) {
        return
      }
      if (!stringValue.match(/^\{[\s\S]*\}$/)) {
        logger.warn("Invalid JSON string:", stringValue)
        return
      }

      telemetry.update(JSON.parse(stringValue))
    } catch (error) {
      logger.error("Error parsing Python script output:", error)
      logger.warn("Raw output:", data.toString())
    }
  })

  pythonScriptProcess.stderr.on("data", (data) => {
    logger.error("Python script error:", data.toString())
  })

  pythonScriptProcess.on("close", (code) => {
    logger.error(
      `Python script exited with code ${code}`, // Restarting in 5 seconds...
    )
    //TODO: implement similar logic
    // setTimeout(() => {
    //   initFlightController(callback);
    // }, 5000);
  })

  const handleMessage = (message: Message, conn: DataConnection) => {
    switch (message.type) {
      case MessageType.REQUEST_TELEMETRY:
        telemetry.sendFullTelemetry(conn)
        break
    }
  }

  Connection.addListener("message", handleMessage)

  return {
    cleanup: () => {
      Connection.removeListener("message", handleMessage)

      try {
        pythonScriptProcess.kill()
      } catch (error) {
        logger.error("Error killing python script process:", error)
      }
    },
  }
}
