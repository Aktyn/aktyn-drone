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

const ConnectionContext = createContext({
  selfPeerId: null as string | null,
  connect: (_peerId: string) => {},
  isConnected: false,
  peerError: null as PeerError<string> | null,
});

export function ConnectionProvider({ children }: PropsWithChildren) {
  const [selfPeerId, setSelfPeerId] = useState<string | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [peerError, setPeerError] = useState<PeerError<string> | null>(null);

  const handleConnection = useCallback((conn: DataConnection) => {
    console.log("Establishing connection with peer:", conn.peer);
    setPeerError(null);

    // let pingInterval: NodeJS.Timeout | null = null;
    conn.on("open", () => {
      console.log("Connected to peer");
      setConnections((prev) => [...prev, conn]);
      localStorage.setItem(LAST_CONNECTED_PEER_ID_KEY, conn.peer);

      //TODO: implement ping-pong to check if connection is stable
      // pingInterval = setInterval(() => {
      //   conn.send({ type: "ping" });
      // }, 1_000);
    });
    conn.on("close", () => {
      console.log("Connection closed");
      setConnections((prev) => prev.filter((c) => c !== conn));
      // if (pingInterval) {
      //   clearInterval(pingInterval);
      //   pingInterval = null;
      // }
    });
    conn.on("data", (data) => {
      console.log(data);
    });
    conn.on("error", (err) => {
      console.error("Connection error", err);
    });
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

  //TODO: receive and show logs (<pre>) from drone-computer

  return (
    <ConnectionContext.Provider
      value={{
        selfPeerId,
        connect,
        isConnected: connections.length > 0,
        peerError,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext);
}
