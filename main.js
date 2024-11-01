"use strict";
// @ts-check

const Stream = require("node-rtsp-stream");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const express = require("express");
const puppeteer = require("puppeteer-core");
require("dotenv").config();

console.log(process.env); //TODO: remove

const scripts = ["peerjs.min.js", "client.js"];

function startStreamServer(streamUrl, port) {
  // Create a stream instance
  const stream = new Stream({
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

  // Create an Express app
  const app = express();
  const server = http.createServer(app);

  // Serve the client page
  app.get("/", (req, res) => {
    res.send(getClientHtml());
  });

  scripts.forEach((script) => {
    app.get(`/${script}`, (req, res) => {
      const scriptPath = path.join(__dirname, script);
      fs.readFile(scriptPath, (err, data) => {
        if (err) {
          res.status(404).send("File not found");
        } else {
          res.type("application/javascript").send(data);
        }
      });
    });
  });

  // Start the server
  server.listen(8080, () => {
    console.log("HTTP server running on http://localhost:8080");
  });

  // Handle the video stream
  const wss = new WebSocket.Server({ server });
  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    ws.on("message", (message) => {
      // Broadcast the video data to all connected peers
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
  });

  // Start the Puppeteer client
  startPuppeteerClient();
}

//TODO: find a way to send p2p data without the need of puppeteer
function getClientHtml() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TCP/H264 Stream Viewer test</title>
      ${scripts.map((script) => `<script src="${script}"></script>`).join("")}
    </head>
    <body>
    </body>
    </html>
  `;
}

async function startPuppeteerClient() {
  const browser = await puppeteer.launch({
    headless: true,
    timeout: 120000,
    channel: "chrome",
    /**
     * Use below line on raspberry pi after installing chromium-browser with `sudo apt install chromium-browser chromium-codecs-ffmpeg`
     * */
    executablePath: process.env.CHROME_EXECUTABLE_PATH, // It should be "/usr/bin/chromium-browser" on Raspberry Pi
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = (await browser.pages()).at(0) ?? (await browser.newPage());
  // await page.setContent(getClientHtml());
  await page.goto(`http://localhost:8080?peerId=${process.env.PEER_ID}`);

  page.on("console", (msg) => console.log("Page log:", msg.text()));

  console.log("Puppeteer client connected and running");

  // Keep the browser open
  browser.on("disconnected", () => {
    // startPuppeteerClient()
    process.exit(0);
  });
}

const streamUrl = process.env.CAMERA_STREAM_URL ?? "tcp://127.0.0.1:8887";
const wsPort = 9999;

startStreamServer(streamUrl, wsPort);
