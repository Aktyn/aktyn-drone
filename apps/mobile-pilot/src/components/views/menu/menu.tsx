import { useEffect, useState } from "react"
import { FullscreenToggle } from "~/components/common/fullscreen-toggle"
import { Button } from "~/components/ui/button.tsx"
import { Input } from "~/components/ui/input.tsx"
import { LAST_CONNECTED_PEER_ID_KEY } from "~/lib/consts"
import { useConnection } from "~/providers/connection-provider.tsx"
import { Footer } from "./footer"

export function Menu() {
  const { selfPeerId, connect, peerError } = useConnection()

  const [peerId, setPeerId] = useState(
    localStorage.getItem(LAST_CONNECTED_PEER_ID_KEY) ?? "",
  )
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (peerError) {
      setConnecting(false)
    }
  }, [peerError])

  const handleConnect = () => {
    if (!peerId) {
      throw new Error("Peer id is required")
    }

    setConnecting(true)
    connect(peerId)
  }

  return (
    <div className="flex-grow grid grid-rows-[1fr_auto_1fr] items-between justify-stretch w-full h-full">
      <div className="animate-in slide-in-from-top grid grid-cols-[1fr_auto_1fr] items-start justify-between">
        <span className="col-start-2 text-3xl font-bold p-4 text-center">
          Aktyn Drone Pilot
        </span>
        <FullscreenToggle className="justify-self-end m-2" />
      </div>
      <div className="flex-grow flex flex-col items-center justify-center gap-4 animate-in zoom-in-50 fade-in">
        <div className="text-center text-sm text-pretty text-muted-foreground">
          Your peer id: <span className="font-bold">{selfPeerId ?? "-"}</span>
        </div>
        <Input
          className="w-80 max-w-full bg-background/50 backdrop-blur-sm text-center"
          placeholder="Enter peer id of drone computer"
          value={peerId}
          disabled={connecting || !selfPeerId}
          onChange={(event) => setPeerId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleConnect()
            }
          }}
        />
        <Button
          onClick={handleConnect}
          disabled={connecting || !peerId || !selfPeerId}
        >
          {connecting ? "Connecting..." : "Connect"}
        </Button>
        {peerError && (
          <div className="text-base text-red-400 flex flex-col items-center animate-in slide-in-from-bottom">
            <strong>Error: {peerError.type}</strong>
            <div>{peerError.message}</div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
