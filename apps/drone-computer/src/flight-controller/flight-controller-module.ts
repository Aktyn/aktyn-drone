import { spawn } from "child_process"
import path from "path"
import { logger } from "../logger"

export function initFlightControllerModule() {
  logger.info("Initializing flight controller module")

  // const pythonScriptProcess = initFlightController(
  //   /**
  //    * @param {{type: 'battery', value: number} | {type: 'attitude', value: {pitch: number, roll: number, yaw: number}}} message
  //    */
  //   (message) => {
  //     if (message.type === "battery") {
  //       if (message.value === lastBatteryPercentage) {
  //         return;
  //       }
  //       lastBatteryPercentage = message.value;
  //       console.log("Battery percentage:", message.value);
  //     }

  //     if (message && conn && conn.open) {
  //       conn.send(JSON.stringify(message));
  //     }
  //   }
  // );

  const handleTelemetry = (message: ReturnType<typeof parseTelemetryData>) => {
    // if (message.type === MessageType.TELEMETRY) {
    //   Connection.send(message)
    // }
    logger.log("Telemetry:", message)
  }

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
      const telemetry = parseTelemetryData(JSON.parse(stringValue))
      if (telemetry) {
        handleTelemetry(telemetry)
      }
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

  return {
    cleanup: () => {
      // Connection.removeListener("message", handleMessage)
      // Connection.removeListener("disconnect", handleDisconnect)
      // cleanupStream()
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTelemetryData(data: Record<string, any>) {
  switch (data.type) {
    default:
      logger.warn("Unhandled message:", JSON.stringify(data))
      break
    case "ERROR":
      logger.error("Python script error:", data.message)
      break
    case "INFO":
      logger.info("Python script info:", data.message)
      break
    case "ATTITUDE":
      return {
        type: "attitude",
        value: {
          pitch: data.pitch,
          roll: data.roll,
          yaw: data.yaw,
        },
      }
    case "BATTERY":
      return {
        type: "battery",
        value: data.percentage / 100,
      }
    case "GPS":
      return {
        type: "gps",
        value: {
          latitude: data.latitude,
          longitude: data.longitude,
          groundSpeed: data.groundSpeed, //cm/s
          heading: data.heading, //degrees
          altitude: data.altitude, //meters
          satellites: data.satellites,
        },
      }
    // case "BARO_ALTITUDE":
    //   return {
    //     type: "altitude",
    //     value: message.altitude,
    //   };
    // TODO:  handle other cases
  }
}
