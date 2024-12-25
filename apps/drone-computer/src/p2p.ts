import type { DataConnection, Peer as PeerJS } from "../types/peerjs"
import { MessageType, type Message } from "@aktyn-drone/common"
import { logger } from "./logger"
import { type EventEmitter } from "stream"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Peer = require("peerjs-on-node").Peer as typeof PeerJS

export class Connection {
  private static instance: Connection | null = null
  public static init(peerId: string) {
    logger.log("Initializing connection with peer id:", peerId)
    this.instance = new Connection(peerId)
  }

  private connections: DataConnection[] = []

  public static hasConnections() {
    return !!this.instance?.connections.length
  }

  private constructor(private readonly peerId: string) {
    const peer = new Peer(peerId)

    const peerEventEmitter = peer as unknown as EventEmitter

    peerEventEmitter.on("open", (id) => {
      logger.log(`Peer ID opened. Id: ${id}`)
    })
    peerEventEmitter.on("close", () => {
      logger.log("Peer closed")
      this.connections = []
    })

    peerEventEmitter.on("connection", this.handleConnection.bind(this))
    peerEventEmitter.on("error", (err) => {
      logger.error("Peer error", err)
    })

    let reconnectingTimeout: NodeJS.Timeout | null = null
    peerEventEmitter.on("disconnected", () => {
      if (reconnectingTimeout) {
        clearTimeout(reconnectingTimeout)
      }
      logger.info("Disconnected, reconnecting in 1 second")
      reconnectingTimeout = setTimeout(() => {
        peer.reconnect()
        reconnectingTimeout = null
      }, 1_000)
    })
  }

  private handleConnection(conn: DataConnection & EventEmitter) {
    logger.log("Establishing connection with peer:", conn.peer)
    conn.on("open", () => {
      this.connections.push(conn)
      logger.log("Connected to peer:", conn.peer)
    })

    conn.on("close", () => {
      logger.log("Connection closed")
      this.connections = this.connections.filter((c) => c !== conn)
    })

    conn.on("data", (data) => {
      if (typeof data === "object" && data !== null) {
        this.handleMessage(data, conn)
      } else if (typeof data === "string") {
        try {
          this.handleMessage(JSON.parse(data), conn)
        } catch (error) {
          logger.error("Error parsing message", error)
        }
      }
    })

    conn.on("error", (err) => {
      logger.error("Connection error", err.type, err.message)
    })
  }

  private handleMessage(message: Message, conn: DataConnection) {
    switch (message.type) {
      default:
        logger.warn("Unhandled message", message)
        break
      case MessageType.PING:
        Connection.broadcast(
          {
            type: MessageType.PONG,
            data: { pingId: message.data.id },
          },
          [conn],
        )
        break
    }
  }

  public static broadcast(message: Message, connections?: DataConnection[]) {
    ;(connections ?? this.instance?.connections ?? []).forEach((conn) => {
      if (conn.open) {
        handleSend(conn.send(JSON.stringify(message)))
      }
    })
  }

  public static broadcastBytes(
    bytes: Uint8Array,
    connections?: DataConnection[],
  ) {
    ;(connections ?? this.instance?.connections ?? []).forEach((conn) => {
      if (conn.open) {
        try {
          const base64 = uint8ArrayToBase64(bytes)
          handleSend(conn.send(base64, true))
        } catch (error) {
          console.error("Error sending message", error)
        }
      }
    })
  }
}

function handleSend(result: void | Promise<void>) {
  if (result instanceof Promise) {
    result.catch((error) => {
      console.error("Error sending message", error)
    })
  }
}

function uint8ArrayToBase64(uint8Array: Uint8Array) {
  return Buffer.from(uint8Array).toString("base64")
}
