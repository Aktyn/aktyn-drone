import WebSocket from "ws"
import { logger } from "../logger"
import { Connection } from "../p2p"
//@ts-expect-error There are no types for node-rtsp-stream
import Stream from "node-rtsp-stream"
import { startCamera } from "./rpicam"

export async function startStreamServer() {
  const streamUrl = process.env.CAMERA_STREAM_URL ?? "tcp://127.0.0.1:8888"
  const wsPort = 9999
  const width = 480 //1920; 480
  const height = 360 //1080; 360

  const libcameraProcess = startCamera(streamUrl, width, height)
  libcameraProcess.stdin?.on("data", (data) => {
    logger.log("libcameraProcess.stdin.on data", data)
  })

  await new Promise((resolve) => setTimeout(resolve, 5_000))

  new Stream({
    name: "TCP/H264",
    streamUrl,
    wsPort,
    width,
    height,
    ffmpegOptions: {
      "-stats": "",
      "-r": 30,
      "-q:v": 3,
      "-probesize": "48M",
    },
  })

  logger.log(
    `Stream server started with url: ${streamUrl} and ws port: ${wsPort}`,
  )

  // ------------------------------------------------------------
  // const peerId = process.env.PEER_ID ?? randomString(24)
  // const peer = new Peer(peerId)
  // let conn

  // peer.on("open", (/** @type {string} */ id) => {
  //   console.log(`Peer ID opened. Id: ${id}`)
  // })
  // peer.on("connection", (connection) => {
  //   conn = connection
  //   console.log("Incoming peer connection:", conn.peer)

  //   conn.on("open", () => {
  //     console.log("Peer connection opened")
  //   })

  //   conn.on("data", (data) => {
  //     try {
  //       // Forward the data to the python script
  //       const io = pythonScriptProcess.stdin
  //       if (!io || !io.writable) {
  //         console.error("Python script stdin is not writable")
  //         return
  //       }

  //       // Add newline to ensure Python readline() gets complete lines
  //       const dataString =
  //         typeof data === "string" ? data : JSON.stringify(data)
  //       console.log("Sending data to python script:", dataString)
  //       io.write(dataString + "\n", (error) => {
  //         if (error) {
  //           console.error("Error writing to python script stdin:", error)
  //         }
  //       })
  //     } catch (error) {
  //       console.error("Error sending data to python script:", error)
  //     }
  //   })
  // })

  const socket = new WebSocket(`ws://127.0.0.1:${wsPort}`)
  socket.binaryType = "arraybuffer"
  socket.onopen = () => {
    logger.info("WebSocket connected")
  }

  socket.onmessage = (event) => {
    console.log("WebSocket message received")
    if (Connection.hasConnections()) {
      const uint8Array = new Uint8Array(event.data as ArrayBuffer)
      Connection.broadcastBytes(uint8Array)
    }
  }

  socket.onerror = (error) => {
    logger.error("WebSocket error:", error)
  }

  socket.onclose = () => {
    logger.info("WebSocket closed")
  }

  // let lastBatteryPercentage = 0
  // const pythonScriptProcess = initFlightController(
  //   /**
  //    * @param {{type: 'battery', value: number} | {type: 'attitude', value: {pitch: number, roll: number, yaw: number}}} message
  //    */
  //   (message) => {
  //     if (message.type === "battery") {
  //       if (message.value === lastBatteryPercentage) {
  //         return
  //       }
  //       lastBatteryPercentage = message.value
  //       console.log("Battery percentage:", message.value)
  //     }

  //     if (message && conn && conn.open) {
  //       conn.send(JSON.stringify(message))
  //     }
  //   },
  // )

  // cleanup
  return () => {
    try {
      libcameraProcess.kill()
    } catch (error) {
      logger.error("Error killing libcamera process:", error)
    }

    // try {
    //   pythonScriptProcess.kill()
    // } catch (error) {
    //   console.error("Error killing python script process:", error)
    // }
  }
}
