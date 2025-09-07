import { type Message, MessageType, uuid, wait } from "@aktyn-drone/common"
import { type DataConnection, Peer, type PeerError } from "peerjs"
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useStateToRef } from "~/hooks/useStateToRef"
import {
  getTurnServer,
  LAST_CONNECTED_PEER_ID_KEY,
  TURN_SERVER_KEY,
  type TurnServer,
  USE_TURN_SERVER_KEY,
} from "~/lib/consts"

const ConnectionContext = createContext({
  selfPeerId: null as string | null,
  turnServer: {} as TurnServer,
  setTurnServer: (_turnServer: TurnServer) => {},
  useTurnServer: false,
  setUseTurnServer: (_useTurnServer: boolean) => {},
  connect: (_peerId: string) => {},
  disconnect: () => {},
  reconnect: () => Promise.resolve(),
  isConnected: false,
  peerError: null as PeerError<string> | null,
  unstableConnection: false,
  send: (_message: Message) => {},
  addMessageListener: (_listener: MessageListener) => {},
  removeMessageListener: (_listener: MessageListener) => {},
})

type MessageListener = (message: Message, connection: DataConnection) => void

export function ConnectionProvider({ children }: PropsWithChildren) {
  const listenersRef = useRef<MessageListener[]>([])
  const awaitingIdsRef = useRef(new Map<string, string | null>())

  const [turnServer, setTurnServer] = useState(getTurnServer())
  const [useTurnServer, setUseTurnServerInternal] = useState(
    localStorage.getItem(USE_TURN_SERVER_KEY) === "true",
  )
  const [selfPeerId, setSelfPeerId] = useState<string | null>(null)
  const [peer, setPeer] = useState<Peer | null>(null)
  const [connections, setConnections] = useState<DataConnection[]>([])
  const [peerError, setPeerError] = useState<PeerError<string> | null>(null)
  const [unstableConnection, setUnstableConnection] = useState(false)

  const connectionsRef = useStateToRef(connections)
  const broadcast = useCallback(
    (message: Message, connections?: DataConnection[]) => {
      ;(connections ?? connectionsRef.current).forEach((conn) => {
        if (conn.open) {
          const result = conn.send(JSON.stringify(message))
          if (result instanceof Promise) {
            result.catch((error) => {
              console.error("Error sending message", error)
            })
          }
        }
      })
    },
    [connectionsRef],
  )

  const handleConnection = useCallback(
    (conn: DataConnection) => {
      console.info("Establishing connection with peer:", conn.peer)
      setPeerError(null)

      let pingInterval: NodeJS.Timeout | null = null
      awaitingIdsRef.current.set(conn.connectionId, null)
      conn.on("open", () => {
        console.info("Connected to peer")
        setConnections((prev) => [...prev, conn])
        localStorage.setItem(LAST_CONNECTED_PEER_ID_KEY, conn.peer)

        pingInterval = setInterval(() => {
          setUnstableConnection(
            awaitingIdsRef.current.get(conn.connectionId) !== null,
          )

          const id = uuid()
          awaitingIdsRef.current.set(conn.connectionId, id)
          broadcast(
            {
              type: MessageType.PING,
              data: { id },
            },
            [conn],
          )
        }, 5_000)
      })

      conn.on("close", () => {
        console.info("Connection closed")
        setConnections((prev) => prev.filter((c) => c !== conn))
        awaitingIdsRef.current.delete(conn.connectionId)
        if (pingInterval) {
          clearInterval(pingInterval)
          pingInterval = null
        }
      })

      conn.on("data", (data) => {
        if (typeof data === "object" && data !== null) {
          handleMessage(data as Message)
        } else if (typeof data === "string") {
          try {
            handleMessage(JSON.parse(data))
          } catch (error) {
            console.error("Error parsing message", error)
          }
        }
      })

      conn.on("error", (err) => {
        console.error("Connection error", err)
      })

      const handleMessage = (message: Message) => {
        switch (message.type) {
          default:
            console.warn("Unhandled message", message)
            break

          case MessageType.PONG:
            setUnstableConnection(
              message.data.pingId !==
                awaitingIdsRef.current.get(conn.connectionId),
            )
            awaitingIdsRef.current.set(conn.connectionId, null)
            break
          case MessageType.LOG:
          case MessageType.TODAY_LOGS:
          case MessageType.CAMERA_DATA:
          case MessageType.TELEMETRY_UPDATE:
          case MessageType.TELEMETRY_FULL:
          case MessageType.HOME_POINT_COORDINATES:
          case MessageType.AUX_VALUE:
            // noop
            break
        }

        listenersRef.current.forEach((listener) => {
          listener(message, conn)
        })
      }
    },
    [broadcast],
  )

  useEffect(() => {
    if (turnServer) {
      localStorage.setItem(TURN_SERVER_KEY, JSON.stringify(turnServer))
    }

    if (turnServer && useTurnServer) {
      console.info("Creating peer with turn server", turnServer)
    } else {
      console.info("Creating peer without turn server")
    }
    const peer = new Peer({
      secure: false,
      config: {
        iceServers: turnServer && useTurnServer ? [turnServer] : [],
      },
    })
    setPeer(peer)
    peer.on("open", (id) => {
      console.info(`Peer ID opened. Id: ${id}`)
      setSelfPeerId(id)
    })
    peer.on("close", () => {
      console.info("Peer closed")
      setSelfPeerId(null)
      setConnections([])
    })

    peer.on("connection", handleConnection)
    peer.on("error", (err) => {
      console.error("Peer error", err)
      setPeerError(err)
    })

    let reconnectingTimeout: NodeJS.Timeout | null = null
    peer.on("disconnected", () => {
      if (reconnectingTimeout) {
        clearTimeout(reconnectingTimeout)
      }
      console.info("Disconnected, reconnecting in 1 second")
      reconnectingTimeout = setTimeout(() => {
        peer.reconnect()
        reconnectingTimeout = null
      }, 1_000)
    })

    return () => {
      peer.removeAllListeners()
      peer.destroy()
    }
  }, [handleConnection, turnServer, useTurnServer])

  const connect = useCallback(
    (peerId: string) => {
      if (!peer) {
        throw new Error("Peer not initialized")
      }

      const connection = peer.connect(peerId)
      handleConnection(connection)
    },
    [handleConnection, peer],
  )

  const disconnect = useCallback(() => {
    try {
      setConnections((connections) => {
        connections.forEach((conn) => {
          conn.close()
        })
        return []
      })
      setSelfPeerId(null)
      setUnstableConnection(false)
      setPeerError(null)
      peer?.disconnect()
    } catch (error) {
      console.error("Error disconnecting", error)
    }
  }, [peer])

  const reconnect = useCallback(async () => {
    const lastPeerId = localStorage.getItem(LAST_CONNECTED_PEER_ID_KEY)

    if (!lastPeerId) {
      throw new Error("No last connected peer id")
    }

    try {
      if (selfPeerId) {
        disconnect()
        await wait(2_000)
      }
    } catch {
      // noop
    }

    console.info("Reconnecting to last peer id:", lastPeerId)

    setUnstableConnection(false)
    connect(lastPeerId)
  }, [connect, disconnect, selfPeerId])

  const addMessageListener = useCallback((listener: MessageListener) => {
    listenersRef.current.push(listener)
  }, [])

  const removeMessageListener = useCallback((listener: MessageListener) => {
    listenersRef.current = listenersRef.current.filter((l) => l !== listener)
  }, [])

  const setUseTurnServer = useCallback((useTurnServer: boolean) => {
    setUseTurnServerInternal(useTurnServer)
    localStorage.setItem(USE_TURN_SERVER_KEY, useTurnServer ? "true" : "false")
  }, [])

  return (
    <ConnectionContext
      value={{
        selfPeerId,
        turnServer,
        setTurnServer,
        useTurnServer,
        setUseTurnServer,
        connect,
        disconnect,
        reconnect,
        isConnected: connections.length > 0,
        peerError,
        unstableConnection,
        send: broadcast,
        addMessageListener,
        removeMessageListener,
      }}
    >
      {children}
    </ConnectionContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConnection() {
  return useContext(ConnectionContext)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConnectionMessageHandler(callback: MessageListener) {
  const { addMessageListener, removeMessageListener } = useConnection()

  useEffect(() => {
    addMessageListener(callback)
    return () => {
      removeMessageListener(callback)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
