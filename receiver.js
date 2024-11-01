"use strict";
//@ts-check

// class PeerDataSource {
//   constructor(ws) {
//     this.ws = ws;
//   }

//   feed(data) {
//     this.ws.send(data);
//   }
// }

class PeerDataSource {
  constructor(_, options) {
    this.url = "ws://localhost:9999";
    this.options = options;
    this.socket = null;
    this.streaming = true;
    this.callbacks = { connect: [], data: [] };
    this.destination = null;
    this.reconnectInterval =
      options.reconnectInterval !== undefined ? options.reconnectInterval : 5;
    this.shouldAttemptReconnect = !!this.reconnectInterval;
    this.completed = false;
    this.established = false;
    this.progress = 0;
    this.reconnectTimeoutId = 0;
    this.onEstablishedCallback = options.onSourceEstablished;
    this.onCompletedCallback = options.onSourceCompleted;
  }

  connect(destination) {
    this.destination = destination;
  }

  destroy() {
    clearTimeout(this.reconnectTimeoutId);
    this.shouldAttemptReconnect = false;
    this.socket.close();
  }

  start() {
    this.shouldAttemptReconnect = !!this.reconnectInterval;
    this.progress = 0;
    this.established = false;
    if (this.options.protocols) {
      this.socket = new WebSocket(this.url, this.options.protocols);
    } else {
      this.socket = new WebSocket(this.url);
    }
    this.socket.binaryType = "arraybuffer";
    // this.socket.onmessage = this.onMessage.bind(this);
    // this.socket.onopen = this.onOpen.bind(this);
    // this.socket.onerror = this.onClose.bind(this);
    // this.socket.onclose = this.onClose.bind(this);
  }

  resume(_secondsHeadroom) {}

  onOpen() {
    this.progress = 1;
  }

  onClose() {
    if (this.shouldAttemptReconnect) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = setTimeout(() => {
        this.start();
      }, this.reconnectInterval * 1e3);
    }
  }

  onMessage(ev) {
    const isFirstChunk = !this.established;
    this.established = true;
    if (isFirstChunk && this.onEstablishedCallback) {
      this.onEstablishedCallback(this);
    }
    if (this.destination) {
      this.destination.write(ev.data);
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("videoPlayer");
  const connectButton = document.getElementById("connectButton");
  const peerIdInput = document.getElementById("peerIdInput");

  if (!canvas || !connectButton || !peerIdInput) {
    throw new Error("No canvas, connectButton or peerIdInput found");
  }

  // @ts-ignore
  const peer = new Peer();
  peer.on("open", (id) => {
    console.log("My peer ID is: " + id);
  });

  connectButton.addEventListener("click", () => {
    const dronePeerId = peerIdInput?.value ?? "fallback-peer-id-aktyn-drone";

    // @ts-ignore
    const p2pPlayer = new JSMpeg.Player(null, {
      source: PeerDataSource,
      canvas,
      autoplay: true,
      audio: false,
      loop: false,
      stream: true,
    });
    console.log("p2pPlayer", p2pPlayer);

    const conn = peer.connect(dronePeerId);

    conn.on("open", () => {
      console.log("Connected to peer");
      p2pPlayer.source.onOpen();
    });

    conn.on("data", (data) => {
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        console.log("Received buffer data from peer");
        p2pPlayer.source.onMessage({ data });
      } else if (typeof data === "string") {
        console.log("Received string data from peer");
        const uint8Array = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          uint8Array[i] = data.charCodeAt(i);
        }
        p2pPlayer.source.onMessage({ data: uint8Array.buffer });
      }
    });

    conn.on("close", () => {
      console.log("Connection closed");
      p2pPlayer.source.onClose();
    });

    conn.on("error", (error) => {
      console.error("Connection error:", error);
      p2pPlayer.source.onError(error);
    });
  });
});
