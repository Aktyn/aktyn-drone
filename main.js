// @ts-check
"use strict";

const Stream = require("node-rtsp-stream");
const WebSocket = require("ws");
require("dotenv").config();
const Peer = require("peerjs-on-node").Peer;

/**
 * @param {string} streamUrl
 * @param {number} port
 */
function startStreamServer(streamUrl, port) {
  //TODO: execute below command beforehand
  // `libcamera-vid -t 0 --nopreview --width 480 --height 360 --listen -o ${process.env.CAMERA_STREAM_URL}`

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
        handleMessage(JSON.parse(data));
      } catch (error) {
        console.error("Error parsing string data from peer:", error);
      }
    });

    // const interval = setInterval(() => {
    //   conn.send(
    //     JSON.stringify({ type: "battery", value: 0.5 + Math.random() * 0.5 })
    //   );
    //   conn.send(
    //     JSON.stringify({
    //       type: "yaw",
    //       value: (Math.random() * 2 - 1) * Math.PI,
    //     })
    //   );
    //   conn.send(
    //     JSON.stringify({
    //       type: "pitch",
    //       value: (Math.random() * 2 - 1) * Math.PI,
    //     })
    //   );
    //   conn.send(
    //     JSON.stringify({
    //       type: "roll",
    //       value: (Math.random() * 2 - 1) * Math.PI,
    //     })
    //   );
    // }, 2000);

    // conn.on("close", () => {
    //   clearInterval(interval);
    // });
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
}

const streamUrl = process.env.CAMERA_STREAM_URL ?? "tcp://127.0.0.1:8887";
const wsPort = 9999;
startStreamServer(streamUrl, wsPort);

/**
 * @param {{type: 'steering', value: {throttle: number, yaw: number, pitch: number, roll: number}}} message
 */
function handleMessage(message) {
  // console.log("Received message from peer:", message);
  switch (message.type) {
    case "steering":
      console.log("Steering:", message.value);
      break;
  }
}

function randomString(length) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}
