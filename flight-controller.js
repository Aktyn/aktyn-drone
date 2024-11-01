// @ts-check
"use strict";

const { spawn } = require("child_process");
const path = require("path");

function handleMessage(message) {
  switch (message.type) {
    case "ATTITUDE":
      // console.log("Attitude data:", message);
      return {
        type: "attitude",
        value: {
          pitch: message.pitch,
          roll: message.roll,
          yaw: message.yaw,
        },
      };
    case "BATTERY":
      // console.log("Battery data:", message);
      return {
        type: "battery",
        value: message.percentage / 100,
      };
    // TODO:  handle other cases
  }
  console.warn("Unhandled message type:", message.type);
}

/**
 * @param {function} callback
 */
function initFlightController(callback) {
  const pythonScriptProcess = spawn(
    path.join(__dirname, "flight_controller_interface", "main.py"),
    {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    }
  );

  pythonScriptProcess.stdout.on("data", (data) => {
    try {
      const stringValue = data.toString().trim().replace(/\n/g, "");
      if (!stringValue.match(/^\{[\s\S]*\}$/)) {
        console.warn("Invalid JSON string:", stringValue);
        return;
      }
      const messageToSend = handleMessage(JSON.parse(stringValue));
      if (messageToSend) {
        callback(messageToSend);
      }
    } catch (error) {
      console.error("Error parsing Python script output:", error);
      console.warn("Raw output:", data.toString());
    }
  });

  pythonScriptProcess.stderr.on("data", (data) => {
    console.error("Python script error:", data.toString());
  });

  pythonScriptProcess.on("close", (code) => {
    console.log(
      `Python script exited with code ${code}; Restarting in 5 seconds...`
    );
    setTimeout(() => {
      initFlightController(callback);
    }, 5000);
  });

  return pythonScriptProcess;
}

module.exports = { initFlightController };
