import { spawn, execSync } from "child_process"
import { logger } from "../logger"

const executable = "rpicam-vid"

export function startCamera(url: string, width = 480, height = 360) {
  logger.info("Starting camera listening on:", url)

  try {
    execSync(`pkill -f ${executable}`)
    logger.info("Killed existing rpicam-vid processes")
  } catch (error) {
    logger.log("No existing rpicam-vid processes found")
  }

  const args = [
    "-t",
    "0",
    "--nopreview",
    "--denoise",
    "cdn_fast",
    "--hdr",
    "off",
    "--framerate",
    "30",
    "--width",
    width.toString(),
    "--height",
    height.toString(),
    "--codec",
    "mjpeg",
    "--quality",
    "80",
    // "--intra",
    // "5",
    "--listen",
    "-o",
    url,
  ]

  logger.log(`Spawning rpicam-vid ${args.join(" ")}`)
  return spawn(executable, args, {
    stdio: "pipe",
  })
}
