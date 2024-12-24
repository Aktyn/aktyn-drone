import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type DataConnection, Peer, PeerError } from "peerjs";
import { LAST_CONNECTED_PEER_ID_KEY } from "~/lib/consts";
import { Message, MessageType } from "@aktyn-drone/common";
import { useStateToRef } from "~/hooks/useStateToRef";

const ConnectionContext = createContext({
  selfPeerId: null as string | null,
  connect: (_peerId: string) => {},
  disconnect: () => {},
  isConnected: false,
  peerError: null as PeerError<string> | null,
  unstableConnection: false,
  send: (_message: Message) => {},
});

export function ConnectionProvider({ children }: PropsWithChildren) {
  const [selfPeerId, setSelfPeerId] = useState<string | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [peerError, setPeerError] = useState<PeerError<string> | null>(null);
  const [unstableConnection, setUnstableConnection] = useState(false);

  const connectionsRef = useStateToRef(connections);
  const broadcast = useCallback(
    (message: Message, connections?: DataConnection[]) => {
      (connections ?? connectionsRef.current).forEach((conn) => {
        if (conn.open) {
          conn.send(message);
        }
      });
    },
    [connectionsRef]
  );

  const handleConnection = useCallback((conn: DataConnection) => {
    console.log("Establishing connection with peer:", conn.peer);
    setPeerError(null);

    let pingInterval: NodeJS.Timeout | null = null;
    let awaitingId: string | null = null;
    conn.on("open", () => {
      console.log("Connected to peer");
      setConnections((prev) => [...prev, conn]);
      localStorage.setItem(LAST_CONNECTED_PEER_ID_KEY, conn.peer);

      pingInterval = setInterval(() => {
        setUnstableConnection(!!awaitingId);

        const id = crypto.randomUUID();
        awaitingId = id;
        broadcast(
          {
            type: MessageType.PING,
            data: { id },
          },
          [conn]
        );
      }, 1_000);
    });

    conn.on("close", () => {
      console.log("Connection closed");
      setConnections((prev) => prev.filter((c) => c !== conn));
      awaitingId = null;
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
    });

    conn.on("data", (data) => {
      if (typeof data === "object" && data !== null) {
        handleMessage(data as Message);
      }
    });

    conn.on("error", (err) => {
      console.error("Connection error", err);
    });

    const handleMessage = (message: Message) => {
      switch (message.type) {
        default:
          console.warn("Unhandled message", message);
          break;
        case MessageType.PONG:
          setUnstableConnection(message.data.pingId !== awaitingId);
          awaitingId = null;
          break;
      }
    };
  }, []);

  useEffect(() => {
    const peer = new Peer();
    setPeer(peer);
    peer.on("open", (id) => {
      console.log(`Peer ID opened. Id: ${id}`);
      setSelfPeerId(id);
    });
    peer.on("close", () => {
      console.log("Peer closed");
      setSelfPeerId(null);
      setConnections([]);
    });

    peer.on("connection", handleConnection);
    peer.on("error", (err) => {
      console.error("Peer error", err);
      setPeerError(err);
    });

    let reconnectingTimeout: NodeJS.Timeout | null = null;
    peer.on("disconnected", () => {
      if (reconnectingTimeout) {
        clearTimeout(reconnectingTimeout);
      }
      console.info("Disconnected, reconnecting in 1 second");
      reconnectingTimeout = setTimeout(() => {
        peer.reconnect();
        reconnectingTimeout = null;
      }, 1_000);
    });
  }, [handleConnection]);

  const connect = useCallback(
    (peerId: string) => {
      if (!peer) {
        throw new Error("Peer not initialized");
      }

      const connection = peer.connect(peerId);
      handleConnection(connection);
    },
    [peer]
  );

  const disconnect = useCallback(() => {
    try {
      setConnections((connections) => {
        connections.forEach((conn) => {
          conn.close();
        });
        return [];
      });
      setSelfPeerId(null);
      setUnstableConnection(false);
      setPeerError(null);
      peer?.disconnect();
    } catch (error) {
      console.error("Error disconnecting", error);
    }
  }, [peer]);

  //TODO: receive and show logs (<pre>) from drone-computer

  return (
    <ConnectionContext.Provider
      value={{
        selfPeerId,
        connect,
        disconnect,
        isConnected: connections.length > 0,
        peerError,
        unstableConnection,
        send: broadcast,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext);
}
