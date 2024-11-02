// @ts-check
"use strict";

const Stream = require("node-rtsp-stream");
const WebSocket = require("ws");
require("dotenv").config();
const Peer = require("peerjs-on-node").Peer;
const { startCamera } = require("./libcamera");
const { initFlightController } = require("./flight-controller");

/**
 * @param {string} streamUrl
 * @param {number} port
 */
function startStreamServer(streamUrl, port) {
  const libcameraProcess = startCamera();

  // Create a stream instance
  new Stream({
    name: "TCP/H264 Stream",
    streamUrl: streamUrl,
    wsPort: port,
    width: 480,
    height: 360,
    //ffmpegOptions: {
    //"-stats": "",
    //"-r": 30,
    //"-q:v": 3,
    //},
  });

  console.log(`Stream server started on ws://localhost:${port}`);

  // ------------------------------------------------------------
  const peerId = process.env.PEER_ID ?? randomString(24);
  const peer = new Peer(peerId);
  let conn;

  peer.on("open", (/** @type {string} */ id) => {
    console.log(`Peer ID opened. Id: ${id}`);
  });
  peer.on("connection", (connection) => {
    conn = connection;
    console.log("Incoming peer connection:", conn.peer);

    conn.on("open", () => {
      console.log("Peer connection opened");
    });

    conn.on("data", (data) => {
      try {
        // Forward the data to the python script
        const io = pythonScriptProcess.stdin;
        if (!io || !io.writable) {
          console.error("Python script stdin is not writable");
          return;
        }

        // Add newline to ensure Python readline() gets complete lines
        const dataString =
          typeof data === "string" ? data : JSON.stringify(data);
        io.write(dataString + "\n", (error) => {
          if (error) {
            console.error("Error writing to python script stdin:", error);
          }
        });
      } catch (error) {
        console.error("Error sending data to python script:", error);
      }
    });
  });

  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  socket.binaryType = "arraybuffer";
  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  socket.onmessage = (event) => {
    if (conn && conn.open) {
      // @ts-ignore
      const uint8Array = new Uint8Array(event.data);
      conn.send(uint8Array);
    } else {
      // console.log("No connection to peer. Dropping message.");
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket closed");
  };

  let lastBatteryPercentage = 0;
  const pythonScriptProcess = initFlightController(
    /**
     * @param {{type: 'battery', value: number} | {type: 'attitude', value: {pitch: number, roll: number, yaw: number}}} message
     */
    (message) => {
      if (message.type === "battery") {
        if (message.value === lastBatteryPercentage) {
          return;
        }
        lastBatteryPercentage = message.value;
        console.log("Battery percentage:", message.value);
      }

      if (message && conn && conn.open) {
        conn.send(JSON.stringify(message));
      }
    }
  );

  return () => {
    try {
      libcameraProcess.kill();
    } catch (error) {
      console.error("Error killing libcamera process:", error);
    }

    try {
      pythonScriptProcess.kill();
    } catch (error) {
      console.error("Error killing python script process:", error);
    }
  };
}

const streamUrl = process.env.CAMERA_STREAM_URL ?? "tcp://127.0.0.1:8887";
const wsPort = 9999;
const cleanup = startStreamServer(streamUrl, wsPort);

// /**
//  * @param {{type: 'steering', value: {throttle: number, yaw: number, pitch: number, roll: number}}} message
//  */
// function handleMessage(message) {
//   // console.log("Received message from peer:", message);
//   switch (message.type) {
//     case "steering":
//       console.log("Steering:", message.value);
//       break;
//   }
// }

function randomString(length) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

process.on("SIGINT", () => {
  console.log("Shutting down...");
  cleanup();
  process.exit();
});
