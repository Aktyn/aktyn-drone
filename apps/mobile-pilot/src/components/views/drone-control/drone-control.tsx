import {
  type LogMessageData,
  MessageType,
  type TelemetryDataFull,
} from "@aktyn-drone/common"
import { Joystick, Logs as LogsIcon, MapIcon, Unplug } from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
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
import { LogsPanel } from "./logs-panel/logs-panel"
import { MapView } from "./map/map-view"
import { SettingsMenu } from "./settings-menu"
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
    latitude: -Infinity,
    longitude: -Infinity,
    groundSpeed: -Infinity,
    heading: -Infinity,
    altitude: -Infinity,
    satellites: -Infinity,
    rpiTemperature: -Infinity,
  })

  const isFullScreenRef = useStateToRef(isFullscreen)
  useEffect(() => {
    if (!isFullScreenRef.current && isTouchDevice()) {
      void toggleFullscreen()
    }

    const todayLogsTimeout = setTimeout(() => {
      send({
        type: MessageType.REQUEST_TODAY_LOGS,
        data: {},
      })
    }, 100)

    const telemetryTimeout = setTimeout(() => {
      send({
        type: MessageType.REQUEST_TELEMETRY,
        data: {},
      })
    }, 1_000)

    return () => {
      clearTimeout(telemetryTimeout)
      clearTimeout(todayLogsTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useConnectionMessageHandler((message) => {
    const formatDate = (date: Date) =>
      date.toLocaleTimeString("en-GB", {
        hourCycle: "h24",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

    switch (message.type) {
      case MessageType.LOG:
        if (message.data.timestamp - MINUTE > lastLogTimestampPin.current) {
          lastLogTimestampPin.current = message.data.timestamp
          setLogs((prev) => [
            ...prev,
            formatDate(new Date(message.data.timestamp)),
            message.data,
          ])
        } else {
          setLogs((prev) => [...prev, message.data])
        }
        break
      case MessageType.TODAY_LOGS:
        {
          const todayLogs: typeof logs = []

          const lines = (message.data.todayLogsFileContent ?? "").split("\n")
          for (const line of lines) {
            const minuteSeparator = line.match(/--- (\d{2}:\d{2}) ---/)
            if (minuteSeparator) {
              todayLogs.push(
                formatDate(
                  new Date(
                    `${new Date().toDateString()} ${minuteSeparator[1]}`,
                  ),
                ),
              )
              continue
            }

            const logLine = line.match(/^\[(.*)\] (.*)/)
            if (logLine) {
              todayLogs.push({
                timestamp: Date.now(),
                method: logLine[1] as never,
                args: [logLine[2]],
              })
            }
          }
          setLogs((prev) => [...todayLogs, ...prev])
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
      <ScrollArea className="w-full py-1 animate-in slide-in-from-top z-10 overflow-visible">
        <div
          className={cn(
            "flex gap-y-1 items-center justify-between transition-colors",
            maximizeCameraPreview && "bg-background/50 backdrop-blur-sm",
          )}
        >
          <Stats className="px-2" telemetry={telemetry} />
          <Separator className="h-8 lg:hidden mx-1" orientation="vertical" />
          <Navigation view={view} setView={setView} />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex-grow flex flex-col overflow-hidden">
        {view === View.DRONE_CONTROL && (
          <ControlPanel
            pitch={telemetry.pitch}
            roll={telemetry.roll}
            yaw={telemetry.yaw}
            onPreviewMaximizedChange={setMaximizeCameraPreview}
            latitude={telemetry.latitude ?? 0}
            longitude={telemetry.longitude ?? 0}
            heading={
              (telemetry.heading === -Infinity ? 0 : telemetry.heading) ?? 0
            }
          />
        )}
        {view === View.MAP &&
          (!awaitingLocation &&
          typeof telemetry.latitude === "number" &&
          typeof telemetry.longitude === "number" &&
          typeof telemetry.satellites === "number" &&
          typeof telemetry.heading === "number" ? (
            <MapView
              latitude={telemetry.latitude}
              longitude={telemetry.longitude}
              satellites={telemetry.satellites}
              heading={telemetry.heading === -Infinity ? 0 : telemetry.heading}
            />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center gap-2 pb-2 font-bold text-lg text-muted-foreground overflow-hidden">
              <div>Awaiting GPS coordinates...</div>
              <DroneCameraPreview />
            </div>
          ))}
        {view === View.LOGS && (
          <LogsPanel logs={logs} onClear={handleClearLogs} />
        )}
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
        <SettingsMenu />
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
