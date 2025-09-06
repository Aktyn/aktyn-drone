import { readFileSync } from "fs"
import { logger } from "../logger"

export function getRpiTemperature(): number {
  try {
    const temp = readFileSync(
      "/sys/class/thermal/thermal_zone0/temp",
    ).toString()
    return parseInt(temp) / 1000
  } catch (error) {
    logger.error("Failed to read RPi temperature:", error)
    return 0
  }
}
