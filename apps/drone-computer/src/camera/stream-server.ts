import { MessageType, wait } from "@aktyn-drone/common"
import WebSocket from "ws"
import { uint8ArrayToBase64 } from "../lib/utils"
import { logger } from "../logger"
import { Connection } from "../p2p"
import { startCamera } from "./rpicam"
//@ts-expect-error There are no types for node-rtsp-stream
import Stream from "node-rtsp-stream"

export async function startStreamServer(
  width: number,
  height: number,
  framerate: number,
) {
  const streamUrl = process.env.CAMERA_STREAM_URL ?? "tcp://127.0.0.1:8888"
  const wsPort = 9999

  logger.log(`Starting camera stream on url: ${streamUrl}`)
  const libcameraProcess = await startCamera(
    streamUrl,
    width,
    height,
    framerate,
  )
  logger.log("Camera stream started")
  await wait(1_000)

  logger.log("Starting stream server")
  const stream = new Stream({
    name: "TCP/MJPEG",
    streamUrl,
    wsPort,
    width,
    height,
    ffmpegOptions: {
      "-stats": "",
      "-r": Math.max(framerate, 20).toString(),
      "-q:v": "1",
      "-probesize": "48M",
    },
  })
  logger.log(
    `Stream server started with url: ${streamUrl} and ws port: ${wsPort}`,
  )

  const socket = new WebSocket(`ws://127.0.0.1:${wsPort}`)
  socket.binaryType = "arraybuffer"
  socket.onopen = () => {
    logger.info("WebSocket connected")
  }

  socket.onmessage = (event) => {
    if (Connection.hasConnections()) {
      const uint8Array = new Uint8Array(event.data as ArrayBuffer)
      Connection.broadcastChunked({
        type: MessageType.CAMERA_DATA,
        data: { base64: uint8ArrayToBase64(uint8Array) },
      })
    }
  }

  socket.onerror = (error) => {
    logger.error("WebSocket error:", error)
  }

  socket.onclose = () => {
    logger.info("WebSocket closed")
  }

  // cleanup
  return () => {
    try {
      socket.close()
    } catch (error) {
      logger.error("Error closing WebSocket:", error)
    }

    try {
      stream.stop()
    } catch (error) {
      logger.error("Error stopping stream:", error)
    }

    try {
      libcameraProcess.kill()
    } catch (error) {
      logger.error("Error killing libcamera process:", error)
    }
  }
}
