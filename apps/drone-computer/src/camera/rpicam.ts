import {
  type ChildProcessWithoutNullStreams,
  execSync,
  spawn,
} from "child_process"
import { logger } from "../logger"

const executable = "rpicam-vid"

export function startCamera(
  url: string,
  width = 480,
  height = 360,
  framerate = 20,
) {
  try {
    execSync(`pkill -f ${executable}`)
    logger.warn(`Killed existing ${executable} processes`)
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
    framerate.toString(),
    "--width",
    width.toString(),
    "--height",
    height.toString(),
    "--bitrate",
    "10kbps",
    "--codec",
    "mjpeg",
    "--quality",
    "50",
    "--intra",
    framerate.toString(),
    "--listen",
    "-o",
    url,
  ]

  return new Promise<ChildProcessWithoutNullStreams>((resolve, reject) => {
    logger.log(`Spawning ${executable} ${args.join(" ")}`)
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
