interface PeerDataSourceOptions {
  reconnectInterval?: number
  onSourceEstablished?: (source: PeerDataSource) => void
  onSourceCompleted?: () => void
}

interface Destination {
  write: (data: ArrayBuffer) => void
}

export class PeerDataSource {
  private destination: Destination | null
  private reconnectInterval: number
  private shouldAttemptReconnect: boolean
  private established: boolean
  public progress: number
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null
  private onEstablishedCallback?: (source: PeerDataSource) => void

  constructor(_: unknown, options: PeerDataSourceOptions) {
    this.destination = null
    this.reconnectInterval =
      options.reconnectInterval !== undefined ? options.reconnectInterval : 5
    this.shouldAttemptReconnect = !!this.reconnectInterval
    this.established = false
    this.progress = 0
    this.reconnectTimeoutId = null
    this.onEstablishedCallback = options.onSourceEstablished
  }

  connect(destination: Destination) {
    this.destination = destination
  }

  destroy() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
    }
    this.shouldAttemptReconnect = false
  }

  start() {
    this.shouldAttemptReconnect = !!this.reconnectInterval
    this.progress = 0
    this.established = false
  }

  resume(_secondsHeadroom: number) {}

  onOpen() {
    this.progress = 1
  }

  onClose() {
    if (this.shouldAttemptReconnect) {
      if (this.reconnectTimeoutId) {
        clearTimeout(this.reconnectTimeoutId)
        this.reconnectTimeoutId = null
      }
      this.reconnectTimeoutId = setTimeout(() => {
        this.start()
      }, this.reconnectInterval * 1e3)
    }
  }

  onMessage(ev: { data: ArrayBuffer }) {
    const isFirstChunk = !this.established
    this.established = true
    if (isFirstChunk && this.onEstablishedCallback) {
      this.onEstablishedCallback(this)
    }
    if (this.destination) {
      try {
        this.destination.write(ev.data)
      } catch (error) {
        console.error("Error writing data to destination", error)
      }
    }
  }
}
