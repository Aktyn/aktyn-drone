// @ts-check
"use strict";

const { spawn } = require("child_process");
const path = require("path");

export function initFlightController(conn) {
  const pythonScript = spawn(
    path.join(__dirname, "flight_controller_interface", "main.py"),
    { env: { ...process.env, PYTHONUNBUFFERED: "1" } }
  );

  pythonScript.stdout.on("data", (data) => {
    try {
      const stringValue = data.toString().trim();
      if (!stringValue.match(/^\{[\s\S]*\}$/)) {
        // not a valid JSON string
        return;
      }
      const messageToSend = handleMessage(JSON.parse(stringValue));
      if (messageToSend && conn && conn.open) {
        conn.send(JSON.stringify(messageToSend));
      }
    } catch (error) {
      console.error("Error parsing Python script output:", error);
      console.warn("Raw output:", data.toString());
    }
  });

  pythonScript.stderr.on("data", (data) => {
    console.error("Python script error:", data.toString());
  });

  pythonScript.on("close", (code) => {
    console.log(
      `Python script exited with code ${code}; Restarting in 5 seconds...`
    );
    setTimeout(() => {
      initFlightController(conn);
    }, 5000);
  });
}

function handleMessage(message) {
  switch (message.type) {
    case "ATTITUDE":
      // console.log("Attitude data:", message);
      return JSON.stringify({
        type: "attitude",
        value: {
          pitch: message.pitch,
          roll: message.roll,
          yaw: message.yaw,
        },
      });
      break;
    case "BATTERY":
      // console.log("Battery data:", message);
      return JSON.stringify({
        type: "battery",
        value: message.percentage / 100,
      });
    // TODO:  handle other cases
  }
}
