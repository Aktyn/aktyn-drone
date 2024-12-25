import { MessageType, type Message } from "@aktyn-drone/common"
import { EventEmitter } from "events"
import type { DataConnection, Peer as PeerJS } from "../types/peerjs"
import { logger } from "./logger"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Peer = require("peerjs-on-node").Peer as typeof PeerJS

type MessageListener = (message: Message, conn: DataConnection) => void

const requiresInstance = requiresInstanceBase as unknown as (
  target: object,
  context: object,
) => void

export class Connection extends EventEmitter {
  private static instance: Connection | null = null

  protected static getInstance(): Connection | null {
    return this.instance
  }

  declare emit: (
    event: "message",
    ...args: Parameters<MessageListener>
  ) => boolean
  declare on: (event: "message", listener: MessageListener) => this
  declare off: (event: "message", listener: MessageListener) => this

  public static init(peerId: string) {
    logger.log("Initializing connection with peer id:", peerId)
    this.instance = new Connection(peerId)
  }

  private connections: DataConnection[] = []

  public static hasConnections() {
    return !!this.instance?.connections.length
  }

  private constructor(private readonly peerId: string) {
    super()

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
      case MessageType.REQUEST_CAMERA_STREAM:
        // noop
        break
    }
    this.emit("message", message, conn)
  }

  private static broadcastMessage(
    message: Message,
    connections?: DataConnection[],
    chunked?: boolean,
  ) {
    ;(connections ?? this.instance?.connections ?? []).forEach((conn) => {
      if (conn.open) {
        handleSendResult(conn.send(JSON.stringify(message), chunked))
      }
    })
  }

  public static broadcast(message: Message, connections?: DataConnection[]) {
    Connection.broadcastMessage(message, connections, false)
  }
  public static broadcastChunked(
    message: Message,
    connections?: DataConnection[],
  ) {
    Connection.broadcastMessage(message, connections, true)
  }

  @requiresInstance
  public static onMessage(listener: MessageListener) {
    this.instance!.on("message", listener)
  }

  @requiresInstance
  public static offMessage(listener: MessageListener) {
    this.instance!.off("message", listener)
  }
}

function requiresInstanceBase(
  _target: object,
  _propertyKey: "onMessage" | "offMessage",
  descriptor: PropertyDescriptor,
) {
  return {
    ...descriptor,
    value: function (
      this: Connection & { instance: typeof Connection },
      listener: MessageListener,
    ) {
      if (!this.instance) {
        throw new Error("Connection not initialized")
      }
      return descriptor.value.apply(this, [listener])
    },
  }
}

function handleSendResult(result: void | Promise<void>) {
  if (result instanceof Promise) {
    result.catch((error) => {
      console.error("Error sending message", error)
    })
  }
}
