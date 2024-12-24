import { MessageType } from "@aktyn-drone/common"
import { Joystick, Logs as LogsIcon, MapIcon, Unplug } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { FullscreenToggle } from "~/components/common/fullscreen-toggle"
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area"
import { Separator } from "~/components/ui/separator"
import { useFullscreen } from "~/hooks/useFullscreen"
import { cn } from "~/lib/utils"
import {
  useConnection,
  useConnectionMessageHandler,
} from "~/providers/connection-provider"
import { Button, type ButtonProps } from "../../ui/button"
import { ControlPanel } from "./control-panel"
import { type LogMessageData, Logs } from "./logs"
import { Stats } from "./stats"
import { Map } from "./map"
import { useStateToRef } from "~/hooks/useStateToRef"

const MINUTE = 60 * 1000

enum View {
  DRONE_CONTROL = "drone-control",
  MAP = "map",
  LOGS = "logs",
}

export function DroneControl() {
  const lastLogTimestampPin = useRef(0)

  const { isConnected, disconnect } = useConnection()
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  const [logs, setLogs] = useState<Array<LogMessageData | string>>([])
  const [view, setView] = useState<View>(View.DRONE_CONTROL)
  const [coordinates] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const isFullScreenRef = useStateToRef(isFullscreen)
  useEffect(() => {
    if (!isFullScreenRef.current) {
      void toggleFullscreen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useConnectionMessageHandler((message) => {
    switch (message.type) {
      case MessageType.LOG:
        if (message.data.timestamp - MINUTE > lastLogTimestampPin.current) {
          lastLogTimestampPin.current = message.data.timestamp
          setLogs((prev) => [
            ...prev,
            new Date(message.data.timestamp).toLocaleTimeString("en-GB", {
              hourCycle: "h24",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            message.data,
          ])
        } else {
          setLogs((prev) => [...prev, message.data])
        }
        break
    }
  })

  const handleClearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return (
    <div className="flex-grow flex flex-col w-full max-h-dvh overflow-hidden">
      <div className="flex flex-wrap-reverse gap-1 items-center justify-between py-2 animate-in slide-in-from-top">
        <Stats className="px-2" />
        <ScrollArea className="ml-auto">
          <nav className="flex items-center gap-x-2 px-2">
            <NavItem
              active={view === View.DRONE_CONTROL}
              onClick={() => setView(View.DRONE_CONTROL)}
            >
              <Joystick />
              <span>Drone control</span>
            </NavItem>
            <NavItem
              active={view === View.MAP}
              onClick={() => setView(View.MAP)}
            >
              <MapIcon />
              <span>Map</span>
            </NavItem>
            <NavItem
              active={view === View.LOGS}
              onClick={() => setView(View.LOGS)}
            >
              <LogsIcon />
              <span>Logs</span>
            </NavItem>
            <Separator className="h-8" orientation="vertical" />
            <Button
              variant="outline"
              size="sm"
              disabled={!isConnected}
              onClick={disconnect}
            >
              <Unplug />
              <span>Disconnect</span>
            </Button>
            <FullscreenToggle className="" />
          </nav>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      <div className="flex-grow flex flex-col overflow-hidden">
        {view === View.DRONE_CONTROL && <ControlPanel />}
        {view === View.MAP &&
          (coordinates ? (
            <Map
              latitude={coordinates.latitude}
              longitude={coordinates.longitude}
            />
          ) : (
            <div className="flex-grow flex items-center justify-center font-bold text-lg text-muted-foreground">
              Awaiting GPS coordinates...
            </div>
          ))}
        {view === View.LOGS && <Logs logs={logs} onClear={handleClearLogs} />}
      </div>
    </div>
  )
}

function NavItem({
  active,
  ...buttonProps
}: ButtonProps & { active?: boolean }) {
  return (
    <Button
      variant="link"
      size="sm"
      className={cn(
        "text-muted-foreground hover:no-underline hover:text-foreground border border-transparent hover:border-foreground/25 overflow-hidden",
        active && "!text-primary pointer-events-none !border-primary/25",
      )}
      {...buttonProps}
    />
  )
}
