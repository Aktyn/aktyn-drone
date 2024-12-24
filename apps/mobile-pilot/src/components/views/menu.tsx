import { Fullscreen, Minimize } from "lucide-react"
import { Button } from "~/components/ui/button.tsx"
import { Separator } from "~/components/ui/separator.tsx"
import { useEffect, useState } from "react"
import { Input } from "~/components/ui/input.tsx"
import { useConnection } from "~/providers/connection-provider.tsx"
import { LAST_CONNECTED_PEER_ID_KEY } from "~/lib/consts"

interface ScreenOrientationLock {
  lock(orientation: "landscape" | "portrait"): Promise<void>
}

interface ExtendedScreen extends Screen {
  orientation: ScreenOrientation & ScreenOrientationLock
}

export function Menu() {
  const { selfPeerId, connect, peerError } = useConnection()

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [peerId, setPeerId] = useState(
    localStorage.getItem(LAST_CONNECTED_PEER_ID_KEY) ?? "",
  )
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      const hasFullscreenElement = !!document.fullscreenElement

      setIsFullscreen(hasFullscreenElement)

      if (hasFullscreenElement) {
        const extendedScreen = screen as ExtendedScreen
        if (extendedScreen.orientation?.lock) {
          extendedScreen.orientation
            .lock("landscape")
            .catch((error: Error) =>
              console.warn("Failed to lock screen orientation:", error),
            )
        }
      }
    }
    handleFullscreenChange()

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error)
    }
  }

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
        <Button
          variant="ghost"
          size="icon"
          className="justify-self-end m-2 [&_svg]:size-6"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize /> : <Fullscreen />}
        </Button>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center gap-4 animate-in zoom-in-50 fade-in">
        <div className="text-sm text-muted-foreground">
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
      <footer className="self-end px-1 w-full text-xs text-muted-foreground flex items-center justify-end gap-x-2 animate-in slide-in-from-bottom">
        <div>
          Created by <span className="font-bold">Aktyn</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div>
          <a
            className="hover:text-primary"
            href="https://github.com/Aktyn"
            target="_blank"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
