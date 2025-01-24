import { MessageType, type Message } from "@aktyn-drone/common"
import { EventEmitter } from "events"
import type { DataConnection, Peer as PeerJS } from "../types/peerjs"
import { getTodayLogs, logger } from "./logger"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Peer = require("peerjs-on-node").Peer as typeof PeerJS

type MessageListener = (message: Message, conn: DataConnection) => void

type EventMap = {
  message: Parameters<MessageListener>
  disconnect: []
}

export class Connection extends EventEmitter<EventMap> {
  private static instance: Connection | null = null

  protected static getInstance(): Connection | null {
    return this.instance
  }

  declare emit: (
    event: keyof EventMap,
    ...args: EventMap[keyof EventMap]
  ) => boolean
  declare on: <T extends keyof EventMap>(
    event: T,
    listener: (...args: EventMap[T]) => void,
  ) => this
  declare off: <T extends keyof EventMap>(
    event: T,
    listener: (...args: EventMap[T]) => void,
  ) => this

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
      this.emit("disconnect")
    })

    //TODO: implement ping-pong and initiate safety measures after connection is lost for over N seconds
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
      case MessageType.REQUEST_TODAY_LOGS:
        Connection.broadcast(
          {
            type: MessageType.TODAY_LOGS,
            data: { todayLogsFileContent: getTodayLogs() },
          },
          [conn],
        )
        break
      case MessageType.REQUEST_CAMERA_STREAM:
      case MessageType.CLOSE_CAMERA_STREAM:
      case MessageType.REQUEST_TELEMETRY:
      case MessageType.SET_THROTTLE:
      case MessageType.SEND_EULER_ANGLES:
      case MessageType.SET_AUX:
      case MessageType.REQUEST_HOME_POINT:
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

  @requiresInstanceBase
  public static addListener<K extends keyof EventMap>(
    event: K,
    listener: (...args: EventMap[K]) => void,
  ) {
    return this.instance!.on(event, listener)
  }

  @requiresInstanceBase
  public static removeListener<K extends keyof EventMap>(
    event: K,
    listener: (...args: EventMap[K]) => void,
  ) {
    return this.instance!.off(event, listener)
  }
}

function requiresInstanceBase(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) {
  return {
    ...descriptor,
    value: function descriptorValue<K extends keyof EventMap>(
      this: Connection & { instance: typeof Connection },
      event: K,
      listener: (...args: EventMap[K]) => void,
    ) {
      if (!this.instance) {
        throw new Error("Connection not initialized")
      }
      return descriptor.value.apply(this, [event, listener])
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
