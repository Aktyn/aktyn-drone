//@ts-check
"use strict";

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
    this.socket?.close();
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
      // @ts-ignore
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

/**
 * @param {any} peer
 * @param {SteeringControls} steering
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLButtonElement} connectButton
 * @param {HTMLInputElement} peerIdInput
 * @param {HTMLElement} connectionError
 * @param {HTMLElement} dronePreview
 */
function connect(
  peer,
  steering,
  canvas,
  connectButton,
  peerIdInput,
  connectionError,
  dronePreview
) {
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
      try {
        handleMessage(JSON.parse(data), dronePreview);
      } catch (error) {
        console.error("Error parsing string data from peer:", error);
      }
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

  /** @param {Event} event */
  const handleSteeringChanged = (event) => {
    /** @type {SteeringControls | null} */
    // @ts-ignore
    const target = event.target;
    // console.log("steeringChanged", target?.steering);
    if (conn && conn.open && target?.steering) {
      conn.send(JSON.stringify({ type: "steering", value: target.steering }));
    }
  };

  steering.addEventListener("steeringChanged", handleSteeringChanged);
}

/**
 * @param {{type: 'battery', value: number} | {type: 'yaw', value: number} | {type: 'pitch', value: number} | {type: 'roll', value: number}} message
 * @param {HTMLElement} dronePreview
 */
function handleMessage(message, dronePreview) {
  console.log("handleMessage", message);

  switch (message.type) {
    case "battery":
      {
        console.log("Battery level:", message.value);

        const batteryPercentage = document.getElementById("batteryPercentage");
        if (batteryPercentage) {
          batteryPercentage.textContent = `${Math.round(message.value * 100)}%`;
        }

        /** @type {HTMLProgressElement | null} */
        // @ts-ignore
        const batteryProgress = document.getElementById("battery");
        if (batteryProgress) {
          batteryProgress.value = message.value * 100;
        }
      }
      break;
    case "yaw":
      {
        const yawValue = document.getElementById("yaw-value");
        if (yawValue) {
          yawValue.textContent = `${Math.round(
            radiansToDegrees(message.value)
          )}°`;
        }
        dronePreview.style.setProperty(
          "--yaw",
          radiansToDegrees(message.value) + "deg"
        );
      }
      break;
    case "pitch":
      {
        const pitchValue = document.getElementById("pitch-value");
        if (pitchValue) {
          pitchValue.textContent = `${Math.round(
            radiansToDegrees(message.value)
          )}°`;
        }
        dronePreview.style.setProperty(
          "--pitch",
          radiansToDegrees(message.value) + "deg"
        );
      }
      break;
    case "roll":
      {
        const rollValue = document.getElementById("roll-value");
        if (rollValue) {
          rollValue.textContent = `${Math.round(
            radiansToDegrees(message.value)
          )}°`;
        }
        dronePreview.style.setProperty(
          "--roll",
          radiansToDegrees(message.value) + "deg"
        );
      }
      break;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("videoPlayer");
  const connectButton = document.getElementById("connectButton");
  const peerIdInput = document.getElementById("peerIdInput");
  const connectionError = document.getElementById("connectionError");
  const dronePreview = document.getElementById("drone");

  if (
    !canvas ||
    !connectButton ||
    !peerIdInput ||
    !connectionError ||
    !dronePreview
  ) {
    throw new Error(
      "No canvas, connectButton, peerIdInput, connectionError or dronePreview found"
    );
  }

  const steering = new SteeringControls();

  // @ts-ignore
  const peer = new Peer();
  peer.on("open", (/** @type {string} */ id) => {
    console.log(`Peer ID opened. Id: ${id}`);
  });

  connectButton.addEventListener("click", () =>
    connect(
      peer,
      steering,
      // @ts-ignore
      canvas,
      connectButton,
      peerIdInput,
      connectionError,
      dronePreview
    )
  );
});

class SteeringControls extends EventTarget {
  #throttleStickValue = 0;
  #throttleFactor = 0;
  #yaw = 0.5;
  #pitch = 0.5;
  #roll = 0.5;

  constructor() {
    super();

    this.leftJoystick = document.getElementById("leftJoystick");
    this.rightJoystick = document.getElementById("rightJoystick");
    /** @type {HTMLProgressElement} */
    // @ts-ignore
    this.throttle = document.getElementById("throttle");
    this.throttlePercentage = document.getElementById("throttlePercentage");

    if (
      !this.leftJoystick ||
      !this.rightJoystick ||
      !this.throttle ||
      !this.throttlePercentage
    ) {
      throw new Error("No leftJoystick or rightJoystick found");
    }

    for (const joystick of [this.leftJoystick, this.rightJoystick]) {
      this.setupJoystickGestures(
        joystick,
        joystick === this.leftJoystick ? "left" : "right"
      );
    }

    this.#startUpdateThrottleLoop();
  }

  get steering() {
    return {
      throttle: this.#throttleFactor,
      yaw: this.#yaw,
      pitch: this.#pitch,
      roll: this.#roll,
    };
  }

  #startUpdateThrottleLoop() {
    let lastUpdateTimestamp = 0;

    const update = (timestamp) => {
      const deltaTime = (timestamp - lastUpdateTimestamp) / 1000;
      lastUpdateTimestamp = timestamp;

      const previousThrottleFactor = this.#throttleFactor;

      const speedFactor = 1;
      this.#throttleFactor = clamp(
        this.#throttleFactor +
          this.#throttleStickValue * deltaTime * speedFactor,
        0,
        1
      );

      if (previousThrottleFactor !== this.#throttleFactor) {
        this.throttle.value = this.#throttleFactor * 100;
        this.throttlePercentage.textContent = `${Math.round(
          this.#throttleFactor * 100
        )}%`;
        this.dispatchEvent(new Event("steeringChanged"));
      }

      window.requestAnimationFrame(update);
    };

    update(0);
  }

  /*
   * @param {HTMLElement} joystick
   * @param {"left" | "right"} side
   */
  setupJoystickGestures(joystick, side) {
    const joystickButton = joystick.querySelector("button");
    if (!joystickButton) {
      throw new Error("No button found in joystick");
    }

    let areaRect;
    let areaCenterX;
    let areaCenterY;

    const onWindowResize = () => {
      areaRect = joystick.getBoundingClientRect();
      areaCenterX = areaRect.left + areaRect.width / 2;
      areaCenterY = areaRect.top + areaRect.height / 2;
    };
    window.addEventListener("resize", onWindowResize);
    onWindowResize();

    let isJoystickDown = false;

    const onJoystickDown = (ev) => {
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

        const valueX = deltaX / (areaRect.width / 2);
        const valueY = -deltaY / (areaRect.height / 2);

        if (side === "left") {
          this.#throttleStickValue = valueY;
          this.#yaw = (valueX + 1) / 2;
        } else {
          this.#pitch = (valueY + 1) / 2;
          this.#roll = (valueX + 1) / 2;
        }
        this.dispatchEvent(new Event("steeringChanged"));

        //TODO: emit event with normalized deltaX and deltaY
      }
    };

    const onJoystickUp = (ev) => {
      if (!isJoystickDown) {
        return;
      }
      isJoystickDown = false;
      joystickButton.style.transition = "transform 0.2s ease-in-out";
      joystickButton.style.transform = "translate(0px, 0px)";
      this.#throttleStickValue = 0;
      this.#yaw = 0.5;
      this.#pitch = 0.5;
      this.#roll = 0.5;
      this.dispatchEvent(new Event("steeringChanged"));
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

/** @param {number} radians */
function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}
