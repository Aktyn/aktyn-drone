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

class PeerDataSource extends EventTarget {
  constructor(_, options) {
    super();
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
    // this.socket.onerror = this.onError.bind(this);
    this.socket.onerror = (error) =>
      this.dispatchEvent(new ErrorEvent("error", { error }));
    // this.socket.onclose = this.onClose.bind(this);
  }

  resume(_secondsHeadroom) {}

  onOpen() {
    this.progress = 1;
  }

  // onError(error) {
  //   console.error("PeerDataSource error:", error);
  // }

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
  const connectionError = document.getElementById("connectionError");

  if (!canvas || !connectButton || !peerIdInput || !connectionError) {
    throw new Error(
      "No canvas, connectButton, peerIdInput or connectionError found"
    );
  }

  const steering = new SteeringControls();
  //TODO: listen to leftJoystick and rightJoystick events and send messages to the peer

  // @ts-ignore
  const peer = new Peer();
  peer.on("open", (id) => {
    console.log("My peer ID is: " + id);
  });

  connectButton.addEventListener("click", () => {
    connectButton.disabled = true;
    connectionError.textContent = "";

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

    p2pPlayer.source.addEventListener("error", (error) => {
      console.error("p2pPlayer error:", error);
      connectionError.textContent = `PeerDataSource error: ${error.message}`;
      connectButton.disabled = false;
    });

    const conn = peer.connect(dronePeerId);

    conn.on("open", () => {
      console.log("Connected to peer");
      p2pPlayer.source.onOpen();
      connectButton.disabled = true;
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
      connectButton.disabled = false;
    });

    conn.on("error", (error) => {
      console.error("Connection error:", error);
      // p2pPlayer.source.onError(error);
    });
  });
});

class SteeringControls {
  constructor() {
    this.leftJoystick = document.getElementById("leftJoystick");
    this.rightJoystick = document.getElementById("rightJoystick");

    if (!this.leftJoystick || !this.rightJoystick) {
      throw new Error("No leftJoystick or rightJoystick found");
    }

    for (const joystick of [this.leftJoystick, this.rightJoystick]) {
      this.setupJoystickGestures(joystick);
    }
  }

  /*
   * @param {HTMLElement} joystick
   */
  setupJoystickGestures(joystick) {
    const joystickButton = joystick.querySelector("button");
    if (!joystickButton) {
      throw new Error("No button found in joystick");
    }

    const areaRect = joystick.getBoundingClientRect();
    const areaCenterX = areaRect.left + areaRect.width / 2;
    const areaCenterY = areaRect.top + areaRect.height / 2;

    let isJoystickDown = false;

    const onJoystickDown = (ev) => {
      console.log("Joystick down", ev);
      isJoystickDown = true;
      joystickButton.style.transition = "";
    };

    const onJoystickMove = (ev) => {
      if (isJoystickDown) {
        const { x, y } = ev;
        const deltaX = clamp(
          x - areaCenterX,
          -areaRect.width / 2,
          areaRect.width / 2
        );
        const deltaY = clamp(
          y - areaCenterY,
          -areaRect.height / 2,
          areaRect.height / 2
        );

        joystickButton.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        console.log("Joystick move", deltaX, deltaY);
        //TODO: emit event with normalized deltaX and deltaY
      }
    };

    const onJoystickUp = (ev) => {
      console.log("Joystick up", ev);
      isJoystickDown = false;
      joystickButton.style.transition = "transform 0.2s ease-in-out";
      joystickButton.style.transform = "translate(0px, 0px)";
    };

    joystickButton.addEventListener("pointerdown", onJoystickDown);
    document.addEventListener("pointermove", onJoystickMove);
    document.addEventListener("pointerup", onJoystickUp);
  }
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
