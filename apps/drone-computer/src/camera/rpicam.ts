import {
  type ChildProcessWithoutNullStreams,
  execSync,
  spawn,
} from "child_process"
import jpeg from "jpeg-js"
import net from "net"
import { logger } from "../logger"

const executable = "rpicam-vid"

export function startCamera(
  url: string,
  width = 480,
  height = 360,
  framerate = 20,
) {
  const mock = process.env.MOCK_RPICAM_VID === "true"
  if (mock) {
    return new Promise<ChildProcessWithoutNullStreams>((resolve, reject) => {
      const address = url.replace("tcp://", "")
      const [host, portStr] = address.split(":")
      if (!portStr || !host) {
        return reject(new Error(`Invalid camera URL for mock: ${url}`))
      }
      const port = parseInt(portStr, 10)

      const server = net.createServer((socket) => {
        logger.log("Mock camera client connected")

        const boundary = "boundarydonotcross"
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace;boundary=${boundary}\r\n\r\n`,
        )

        let frameCount = 0

        const interval = setInterval(() => {
          if (!socket.writable) {
            return
          }

          const frame = createMockFrame(width, height, frameCount++)
          const jpegData = jpeg.encode(frame, 50)

          const header =
            `--${boundary}\r\n` +
            `Content-Type: image/jpeg\r\n` +
            `Content-Length: ${jpegData.data.length}\r\n\r\n`

          const frameBuffer = Buffer.concat([
            Buffer.from(header),
            jpegData.data,
            Buffer.from("\r\n"),
          ])

          socket.write(frameBuffer)
        }, 1000 / framerate)

        socket.on("close", () => {
          logger.log("Mock camera client disconnected")
          clearInterval(interval)
        })

        socket.on("error", (err) => {
          logger.error("Mock camera socket error:", err)
        })
      })

      server.on("error", (err) => {
        logger.error("Mock camera server error:", err)
        reject(err)
      })

      server.listen(port, host, () => {
        logger.log(`Mock camera server listening on ${host}:${port}`)
        const mockProcess = {
          kill: () => {
            server.close()
            logger.log("Mock camera server stopped")
          },
        } as unknown as ChildProcessWithoutNullStreams
        resolve(mockProcess)
      })
    })
  }

  try {
    execSync(`pkill -f ${executable}`)
    logger.warn(`Killed existing ${executable} processes`)
  } catch {
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

function createMockFrame(width: number, height: number, count: number) {
  const frameData = Buffer.alloc(width * height * 4)

  // Simple black background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v =
        Math.ceil((x + Math.sin((count / 120) * Math.PI) * 64) / 64) % 2 ===
        Math.ceil((y - Math.cos((count / 120) * Math.PI) * 64) / 64) % 2
          ? 64
          : 128

      const i = (y * width + x) * 4
      frameData[i] = v // R
      frameData[i + 1] = v // G
      frameData[i + 2] = v // B
      frameData[i + 3] = 255 // A
    }
  }

  return {
    data: frameData,
    width,
    height,
  }
}
