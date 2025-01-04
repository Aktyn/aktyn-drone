import { RadioTower, Settings2 } from "lucide-react"
import { useEffect, useState } from "react"
import { FullscreenToggle } from "~/components/common/fullscreen-toggle"
import { Button } from "~/components/ui/button.tsx"
import { Input } from "~/components/ui/input.tsx"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { LAST_CONNECTED_PEER_ID_KEY } from "~/lib/consts"
import { useConnection } from "~/providers/connection-provider.tsx"
import { Footer } from "./footer"
import { TurnServerForm } from "./turn-server-form"

export function Menu() {
  const { selfPeerId, turnServer, setTurnServer, connect, peerError } =
    useConnection()

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
    <div className="flex-grow grid grid-rows-[1fr_auto_auto_1fr] items-between justify-stretch w-full h-full">
      <div className="animate-in slide-in-from-top grid grid-cols-[1fr_auto_1fr] items-start justify-between">
        <span className="col-start-2 text-3xl font-bold p-4 text-center">
          Aktyn Drone Pilot
        </span>
        <FullscreenToggle className="justify-self-end m-2" />
      </div>
      {selfPeerId ? (
        <div className="text-center text-sm text-pretty text-muted-foreground py-4">
          Your peer id: <span className="font-bold">{selfPeerId ?? "-"}</span>
        </div>
      ) : (
        <span />
      )}
      <div className="w-80 max-w-full mx-auto flex-grow flex flex-col items-stretch justify-center gap-4 animate-in zoom-in-50 fade-in">
        <Input
          className="w-full max-w-full bg-background/50 backdrop-blur-sm text-center"
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
          variant="default"
          onClick={handleConnect}
          disabled={connecting || !peerId || !selfPeerId}
        >
          <RadioTower />
          {connecting ? "Connecting..." : "Connect"}
        </Button>
        {peerError && (
          <div className="text-base text-red-400 flex flex-col items-center animate-in slide-in-from-bottom">
            <strong>Error: {peerError.type}</strong>
            <div>{peerError.message}</div>
          </div>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">
              <Settings2 />
              Configure TURN server
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-y-2 w-64 [&_svg]:text-muted-foreground">
            <TurnServerForm
              defaultValues={turnServer}
              onApply={setTurnServer}
            />
          </PopoverContent>
        </Popover>
      </div>
      <Footer />
    </div>
  )
}
