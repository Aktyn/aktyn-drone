import type { DataConnection, Peer as PeerType } from "../types/peerjs";
import { logger } from "./logger";
// import Stream from 'node-rtsp-stream'
// import WebSocket from 'ws'
const Peer = require("peerjs-on-node").Peer as typeof PeerType;

export class Connection {
  private static instance: Connection | null = null;
  public static init(peerId: string) {
    logger.log("Initializing connection with peer id:", peerId);
    this.instance = new Connection(peerId);
  }

  private connections: DataConnection[] = [];

  private constructor(private readonly peerId: string) {
    const peer = new Peer(peerId);

    peer.on("open", (id) => {
      logger.log(`Peer ID opened. Id: ${id}`);
    });
    peer.on("close", () => {
      logger.log("Peer closed");
      this.connections = [];
    });

    peer.on("connection", this.handleConnection.bind(this));
    peer.on("error", (err) => {
      logger.error("Peer error", err);
    });

    let reconnectingTimeout: NodeJS.Timeout | null = null;
    peer.on("disconnected", () => {
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

  private handleConnection(conn: DataConnection) {
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
      console.info("received data:", data);
    });
    conn.on("error", (err) => {
      logger.error("Connection error", err.type, err.message);
    });
  }

  public static broadcast(message: { type: string; data: any }) {
    //TODO: test if this works
    this.instance?.connections.forEach((conn) => {
      if (conn.open) {
        console.log("TEST");
        conn.send(message);
      }
    });
  }
}
