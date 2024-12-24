import type { DataConnection, Peer as PeerJS } from "../types/peerjs";
import { MessageType, type Message } from "@aktyn-drone/common";
import { logger } from "./logger";
import { EventEmitter } from "stream";
// import Stream from 'node-rtsp-stream'
// import WebSocket from 'ws'

const Peer = require("peerjs-on-node").Peer as typeof PeerJS;

export class Connection {
  private static instance: Connection | null = null;
  public static init(peerId: string) {
    logger.log("Initializing connection with peer id:", peerId);
    this.instance = new Connection(peerId);
  }

  private connections: DataConnection[] = [];

  private constructor(private readonly peerId: string) {
    const peer = new Peer(peerId);

    const peerEventEmitter = peer as unknown as EventEmitter;

    peerEventEmitter.on("open", (id) => {
      logger.log(`Peer ID opened. Id: ${id}`);
    });
    peerEventEmitter.on("close", () => {
      logger.log("Peer closed");
      this.connections = [];
    });

    peerEventEmitter.on("connection", this.handleConnection.bind(this));
    peerEventEmitter.on("error", (err) => {
      logger.error("Peer error", err);
    });

    let reconnectingTimeout: NodeJS.Timeout | null = null;
    peerEventEmitter.on("disconnected", () => {
      if (reconnectingTimeout) {
        clearTimeout(reconnectingTimeout);
      }
      logger.info("Disconnected, reconnecting in 1 second");
      reconnectingTimeout = setTimeout(() => {
        peer.reconnect();
        reconnectingTimeout = null;
      }, 1_000);
    });
  }

  private handleConnection(conn: DataConnection & EventEmitter) {
    logger.log("Establishing connection with peer:", conn.peer);
    conn.on("open", () => {
      this.connections.push(conn);
      logger.log("Connected to peer:", conn.peer);
    });

    conn.on("close", () => {
      logger.log("Connection closed");
      this.connections = this.connections.filter((c) => c !== conn);
    });

    conn.on("data", (data) => {
      if (typeof data === "object" && data !== null) {
        this.handleMessage(data, conn);
      }
    });

    conn.on("error", (err) => {
      logger.error("Connection error", err.type, err.message);
    });
  }

  private handleMessage(message: Message, conn: DataConnection) {
    switch (message.type) {
      default:
        logger.warn("Unhandled message", message);
        break;
      case MessageType.PING:
        Connection.broadcast(
          {
            type: MessageType.PONG,
            data: { pingId: message.data.id },
          },
          [conn]
        );
        break;
    }
  }

  public static broadcast(message: Message, connections?: DataConnection[]) {
    (connections ?? this.instance?.connections ?? []).forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }
}
