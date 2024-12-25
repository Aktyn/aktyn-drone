import { randomString } from "@aktyn-drone/common"
import { config } from "dotenv"
import { startStreamServer } from "./camera"
import { logger } from "./logger"
import { Connection } from "./p2p"

config()

const peerId = process.env.PEER_ID ?? randomString(24)
Connection.init(peerId)

async function main() {
  const cleanupCameraStream = await startStreamServer()

  process.on("SIGINT", () => {
    logger.info("Shutting down...")
    cleanupCameraStream()
    process.exit()
  })
}

main().catch((error) => {
  logger.error("Error starting main", error)
  process.exit(1)
})
