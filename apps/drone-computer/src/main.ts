import { MessageType, randomString } from "@aktyn-drone/common"
import { config } from "dotenv"
import { logger } from "./logger"
import { Connection } from "./p2p"

config()

const peerId = process.env.PEER_ID ?? randomString(24)
Connection.init(peerId)

const cleanups: (() => void)[] = []

// startStreamServer()
//   .then((cleanup) => cleanups.push(cleanup))
//   .catch(console.error)

Connection.onMessage((message) => {
  switch (message.type) {
    case MessageType.REQUEST_CAMERA_STREAM:
      console.log("Camera stream requested", message.data) //TODO: implement
      break
  }
})

process.on("SIGINT", () => {
  logger.info("Shutting down...")
  cleanups.forEach((cleanup) => cleanup())
  process.exit()
})
