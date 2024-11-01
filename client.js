"use strict";
// @ts-check

document.addEventListener("DOMContentLoaded", function () {
  const port = 9999;

  const socket = new WebSocket(`ws://localhost:${port}`);
  socket.binaryType = "arraybuffer";
  console.log("WS:", socket);

  const peerId = new URL(window.location.href).searchParams.get("peerId");

  // @ts-ignore
  const peer = new Peer(peerId ?? randomString(24));
  let conn;

  peer.on("open", (id) => {
    console.log("My peer ID is: " + id);
  });

  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  //TODO: receive data through a puppeteer methods instead of another websocket
  socket.onmessage = (event) => {
    if (conn && conn.open) {
      console.log("Passing websocket data to connected peer");
      const uint8Array = new Uint8Array(event.data);
      conn.send(uint8Array);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket closed");
  };

  // Handle incoming connections
  peer.on("connection", (connection) => {
    conn = connection;
    console.log("Incoming peer connection");

    conn.on("open", () => {
      console.log("Peer connection opened");
    });

    conn.on("data", (data) => {
      console.log("Received data from peer:", data);
    });
  });
});

function randomString(length) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}
