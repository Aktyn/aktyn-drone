import { ServerCrash, Unplug } from "lucide-react"
import { DroneControl } from "~/components/views/drone-control/drone-control"
import { Menu } from "~/components/views/menu/menu"
import { useConnection } from "~/providers/connection-provider.tsx"
import { cn } from "./lib/utils"
import { Button } from "./components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert"
import { useEffect, useState } from "react"

function App() {
  const { isConnected, unstableConnection, disconnect, reconnect } =
    useConnection()

  const [secondsToReconnect, setSecondsToReconnect] = useState(0)

  useEffect(() => {
    if (!isConnected && unstableConnection) {
      let seconds = 30
      setSecondsToReconnect(seconds)
      const interval = setInterval(() => {
        seconds -= 1
        setSecondsToReconnect(seconds)
        if (seconds <= 0) {
          reconnect().catch(console.error)
          clearInterval(interval)
        }
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setSecondsToReconnect(0)
    }
  }, [isConnected, reconnect, unstableConnection])

  return (
    <div className="min-h-dvh relative overflow-hidden *:z-[3] flex flex-col justify-center items-center">
      <div className="absolute top-0 z-[1] h-screen w-screen flex items-center justify-center px-4">
        <svg
          className="h-[80%] w-auto fill-transparent stroke-primary/10 stroke-[0.5] animate-in fade-in duration-500"
          viewBox="0 0 24 24"
          role="presentation"
        >
          <path
            d="M17.8764 22.3069L17.915 15.3908L23.83 11.9327L22.2793 11.032L17.915 13.5894L17.8764 8.56434L13.532 6.01854L17.9536 3.49447L17.9536 1.69305L11.9807 5.11748L6.04645 1.69305V3.49447L10.43 6.01819L6.1236 8.56434L6.10432 13.6223L1.72073 11.032L0.170035 11.9327L6.10432 15.4244L6.1236 22.3069L7.6743 21.4062L7.65501 16.3251L12 18.804L16.3637 16.2918L16.3257 21.4062L17.8764 22.3069ZM16.3635 14.4905L12.0014 17.0018L7.65501 14.5228L7.6743 9.46663L11.9815 6.91934L16.3243 9.46422L16.3635 14.4905Z"
            style={{
              fill: "inherit",
              vectorEffect: "non-scaling-stroke",
            }}
          ></path>
        </svg>
      </div>
      <div
        className="absolute top-0 z-[2] h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)] animate-in fade-in slide-in-from-top duration-500"
        style={{
          transitionDuration: "0ms",
        }}
      />
      {isConnected ? <DroneControl /> : <Menu />}
      <Alert
        className={cn(
          "absolute bottom-2 right-2 w-auto border-orange-400/50 bg-orange-400/10 text-orange-400 [&>svg]:text-orange-400 backdrop-blur-md transition-transform",
          isConnected && unstableConnection
            ? "translate-x-0 pointer-events-auto"
            : "translate-x-64 pointer-events-none",
        )}
      >
        <ServerCrash className="size-5" />
        <AlertTitle className="font-semibold">Unstable connection</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          {secondsToReconnect > 0 ? (
            <span className="text-orange-400/60">
              Reconnect attempt in {secondsToReconnect} seconds...
            </span>
          ) : (
            <span>Reconnecting...</span>
          )}
          <Button
            className="hover:bg-destructive hover:border-destructive-foreground hover:text-destructive-foreground border-orange-400/50 bg-orange-400/10"
            variant="outline"
            size="default"
            disabled={!isConnected}
            onClick={disconnect}
          >
            <Unplug />
            <span>Disconnect</span>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default App
