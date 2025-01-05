export const LAST_CONNECTED_PEER_ID_KEY = "lastConnectedPeerId"
export const USE_TURN_SERVER_KEY = "useTurnServer"
export const TURN_SERVER_KEY = "turnServer"

export type TurnServer = {
  urls: string
  username: string
  credential: string
}

const defaultTurnServer: TurnServer = {
  urls: "turn:global.relay.metered.ca:80",
  username: "e778f30e366a357abc99e7cf",
  credential: "7Dcyfw6ZE/W1xXeG",
}

export function getTurnServer(): TurnServer {
  const cachedTurnServer = localStorage.getItem(TURN_SERVER_KEY)

  return cachedTurnServer
    ? (JSON.parse(cachedTurnServer) ?? defaultTurnServer)
    : defaultTurnServer
}

export const CAMERA_RESOLUTION_KEY = "cameraResolution"
export const CAMERA_RESOLUTIONS = [
  { width: 640, height: 480 },
  { width: 1920, height: 1080 },
]

export const AUX_CHANNELS_COUNT = 12
