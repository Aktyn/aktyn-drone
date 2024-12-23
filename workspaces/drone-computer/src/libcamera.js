// @ts-check
"use strict";

const { spawn } = require("child_process");

function startCamera() {
  const url = process.env.CAMERA_STREAM_URL ?? "tcp://127.0.0.1:8887";

  console.log("Starting camera listening on:", url);

  return spawn("libcamera-vid", [
    "-t",
    "0",
    "--nopreview",
    "--width",
    "480",
    "--height",
    "360",
    "--listen",
    "-o",
    url,
  ]);
}

module.exports = { startCamera };
