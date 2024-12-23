import { logger } from './logger.ts'

// const Peer = require('peerjs-on-node').Peer
import Peer from 'npm:peerjs-on-node'

export class Connection {
  private static instance: Connection
  public static init(peerId: string) {
    logger.log('Initializing connection with peer id:', peerId)
    this.instance = new Connection(peerId)
  }

  private constructor(private readonly peerId: string) {
    // this.peer = new Peer(peerId)

    // const handleConnection = useCallback((conn: DataConnection) => {
    //   console.log('Establishing connection with peer:', conn.peer)
    //   setPeerError(null)
    //   conn.on('open', () => {
    //     console.log('Connected to peer')
    //     setConnections((prev) => [...prev, conn])
    //   })
    //   conn.on('close', () => {
    //     console.log('Connection closed')
    //     setConnections((prev) => prev.filter((c) => c !== conn))
    //   })
    //   conn.on('data', (data) => {
    //     console.log(data)
    //   })
    //   conn.on('error', (err) => {
    //     console.error('Connection error', err)
    //   })
    // }, [])

    try {
      const peer = new Peer(peerId)
      logger.log(peer)
    } catch (error) {
      logger.error('Error initializing peer:', error)
    }
    // setPeer(peer)
    // peer.on('open', (id) => {
    //   console.log(`Peer ID opened. Id: ${id}`)
    //   setSelfPeerId(id)
    // })
    // peer.on('close', () => {
    //   console.log('Peer closed')
    //   setSelfPeerId(null)
    //   setConnections([])
    // })

    // peer.on('connection', handleConnection)
    // peer.on('error', (err) => {
    //   console.error('Peer error', err)
    //   setPeerError(err)
    // })

    // let reconnectingTimeout: number | null = null
    // peer.on('disconnected', () => {
    //   if (reconnectingTimeout) {
    //     clearTimeout(reconnectingTimeout)
    //   }
    //   console.info('Disconnected, reconnecting in 1 second')
    //   reconnectingTimeout = setTimeout(() => {
    //     peer.reconnect()
    //     reconnectingTimeout = null
    //   }, 1_000)
    // })

    // const connect = useCallback((peerId: string) => {
    //   if (!peer) {
    //     throw new Error('Peer not initialized')
    //   }

    //   const connection = peer.connect(peerId)
    //   handleConnection(connection)
    // }, [peer])
  }

  public static broadcast(message: { type: string; data: any }) {
    // this.peer.broadcast(message)
  }
}
