import { AlertCircle, RadioTower, Settings2 } from "lucide-react"
import { useEffect, useState } from "react"
import { FullscreenToggle } from "~/components/common/fullscreen-toggle"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { Separator } from "~/components/ui/separator"
import { LAST_CONNECTED_PEER_ID_KEY } from "~/lib/consts"
import { useConnection } from "~/providers/connection-provider"
import { Footer } from "./footer"
import { TurnServerForm } from "./turn-server-form"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"

export function Menu() {
  const {
    selfPeerId,
    turnServer,
    setTurnServer,
    useTurnServer,
    setUseTurnServer,
    connect,
    peerError,
  } = useConnection()

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
          <Alert
            variant="destructive"
            className="animate-in slide-in-from-bottom *:not-[svg]:ml-2 bg-destructive/10 backdrop-blur-md"
          >
            <AlertCircle />
            <AlertTitle className="font-semibold">
              Error: {peerError.type}
            </AlertTitle>
            <AlertDescription className="text-balance">
              {peerError.message}
            </AlertDescription>
          </Alert>
        )}
        <Separator />
        <div className="text-lg font-semibold text-center text-muted-foreground">
          TURN server
        </div>
        <div className="flex items-center justify-center gap-x-2">
          <Checkbox
            id="throttle-safety"
            checked={useTurnServer}
            onCheckedChange={(checked) => {
              setUseTurnServer(!!checked)
            }}
          />
          <Label htmlFor="throttle-safety" className="cursor-pointer">
            Use TURN server
          </Label>
        </div>
        {useTurnServer && turnServer && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">
                <Settings2 />
                Configure TURN server
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col gap-y-2 w-64 [&_svg]:text-muted-foreground animate-in fade-in">
              <TurnServerForm server={turnServer} onApply={setTurnServer} />
            </PopoverContent>
          </Popover>
        )}
      </div>
      <Footer />
    </div>
  )
}
