import { MessageType, type TelemetryDataFull } from "@aktyn-drone/common"
import { Joystick, Logs as LogsIcon, MapIcon, Unplug } from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { FullscreenToggle } from "~/components/common/fullscreen-toggle"
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area"
import { Separator } from "~/components/ui/separator"
import { useFullscreen } from "~/hooks/useFullscreen"
import { useStateToRef } from "~/hooks/useStateToRef"
import { cn, isTouchDevice } from "~/lib/utils"
import {
  useConnection,
  useConnectionMessageHandler,
} from "~/providers/connection-provider"
import { Button, type ButtonProps } from "../../ui/button"
import { ControlPanel } from "./control-panel/control-panel"
import { DroneCameraPreview } from "./drone-camera-preview"
import { type LogMessageData, Logs } from "./logs/logs"
import { Map } from "./map/map"
import { Stats } from "./stats"

const MINUTE = 60 * 1000

enum View {
  DRONE_CONTROL = "drone-control",
  MAP = "map",
  LOGS = "logs",
}

export const DroneControl = memo(() => {
  const lastLogTimestampPin = useRef(0)

  const { send } = useConnection()
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  const [logs, setLogs] = useState<Array<LogMessageData | string>>([])
  const [view, setView] = useState<View>(View.DRONE_CONTROL)
  const [maximizeCameraPreview, setMaximizeCameraPreview] = useState(false)
  const [telemetry, setTelemetry] = useState<TelemetryDataFull>({
    pitch: -Infinity,
    roll: -Infinity,
    yaw: -Infinity,
    percentage: -Infinity,
    latitude: -Infinity, //51.776936
    longitude: -Infinity, //19.427419
    groundSpeed: -Infinity,
    heading: -Infinity,
    altitude: -Infinity,
    satellites: -Infinity,
  })

  const isFullScreenRef = useStateToRef(isFullscreen)
  useEffect(() => {
    if (!isFullScreenRef.current && isTouchDevice()) {
      void toggleFullscreen()
    }

    const timeout = setTimeout(() => {
      send({
        type: MessageType.REQUEST_TELEMETRY,
        data: {},
      })
    }, 1_000)

    return () => clearTimeout(timeout)
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
      case MessageType.TELEMETRY_UPDATE:
        {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { type, ...dataWithoutType } = message.data
          setTelemetry((prev) => ({
            ...prev,
            ...dataWithoutType,
          }))
        }
        break
      case MessageType.TELEMETRY_FULL:
        setTelemetry(message.data)
        break
    }
  })

  const handleClearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const awaitingLocation =
    (telemetry.latitude === -Infinity && telemetry.longitude === -Infinity) ||
    (telemetry.latitude === 0 && telemetry.longitude === 0)

  return (
    <div className="flex-grow flex flex-col w-full max-h-dvh overflow-hidden">
      <div
        className={cn(
          "flex flex-wrap-reverse gap-y-1 items-center justify-between py-2 animate-in slide-in-from-top z-10 transition-colors",
          maximizeCameraPreview && "bg-background/50 backdrop-blur-sm",
        )}
      >
        <Stats className="px-2" telemetry={telemetry} />
        <Navigation view={view} setView={setView} />
      </div>
      <div className="flex-grow flex flex-col overflow-hidden">
        {view === View.DRONE_CONTROL && (
          <ControlPanel
            pitch={telemetry.pitch}
            roll={telemetry.roll}
            yaw={telemetry.yaw}
            onPreviewMaximizedChange={setMaximizeCameraPreview}
          />
        )}
        {view === View.MAP &&
          (!awaitingLocation ? (
            <Map
              latitude={telemetry.latitude}
              longitude={telemetry.longitude}
              heading={telemetry.heading === -Infinity ? 0 : telemetry.heading}
            />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center gap-2 pb-2 font-bold text-lg text-muted-foreground overflow-hidden">
              <div>Awaiting GPS coordinates...</div>
              <DroneCameraPreview />
            </div>
          ))}
        {view === View.LOGS && <Logs logs={logs} onClear={handleClearLogs} />}
      </div>
    </div>
  )
})

DroneControl.displayName = "DroneControl"

type NavigationProps = {
  view: View
  setView: (view: View) => void
}

const Navigation = memo<NavigationProps>(({ view, setView }) => {
  const { isConnected, disconnect } = useConnection()

  return (
    <ScrollArea className="ml-auto">
      <nav className="flex items-center gap-x-2 px-2">
        <NavItem
          active={view === View.DRONE_CONTROL}
          onClick={() => setView(View.DRONE_CONTROL)}
        >
          <Joystick />
          <span>Drone controls</span>
        </NavItem>
        <NavItem active={view === View.MAP} onClick={() => setView(View.MAP)}>
          <MapIcon />
          <span>Map</span>
        </NavItem>
        <NavItem active={view === View.LOGS} onClick={() => setView(View.LOGS)}>
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
  )
})

Navigation.displayName = "Navigation"

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
