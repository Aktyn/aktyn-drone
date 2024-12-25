import {
  type ChildProcessWithoutNullStreams,
  execSync,
  spawn,
} from "child_process"
import { logger } from "../logger"

const executable = "rpicam-vid"

export function startCamera(url: string, width = 480, height = 360) {
  try {
    execSync(`pkill -f ${executable}`)
    logger.warn("Killed existing rpicam-vid processes")
  } catch (error) {
    // noop
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

  return new Promise<ChildProcessWithoutNullStreams>((resolve, reject) => {
    logger.log(`Spawning rpicam-vid ${args.join(" ")}`)
    const camProcess = spawn(executable, args, {
      stdio: "pipe",
    })

    let timeout: NodeJS.Timeout | null = setTimeout(() => {
      timeout = null
      reject(new Error("Timeout waiting for camera stream"))
    }, 10_000)

    camProcess.stdio[2]?.on("data", (data) => {
      try {
        const message = Buffer.from(data).toString("utf8")
        // logger.log(message)

        if (message.match(/Registered camera/i) && timeout) {
          clearTimeout(timeout)
          resolve(camProcess)
        }
      } catch (error) {
        reject(error)
      }
    })
  })
}
