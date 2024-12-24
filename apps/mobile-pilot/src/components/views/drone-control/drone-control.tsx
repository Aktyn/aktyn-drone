import { MessageType } from "@aktyn-drone/common"
import { Joystick, Logs as LogsIcon, Unplug } from "lucide-react"
import { useState } from "react"
import { FullscreenToggle } from "~/components/common/fullscreen-toggle"
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area"
import { Separator } from "~/components/ui/separator"
import { cn } from "~/lib/utils"
import {
  useConnection,
  useConnectionMessageHandler,
} from "~/providers/connection-provider"
import { Button, type ButtonProps } from "../../ui/button"
import { type LogMessageData, Logs } from "./logs"
import { Stats } from "./stats"

enum View {
  DRONE_CONTROL = "drone-control",
  LOGS = "logs",
}

export function DroneControl() {
  const { isConnected, disconnect } = useConnection()

  const [logs, setLogs] = useState<Array<LogMessageData>>([])
  const [view, setView] = useState<View>(View.DRONE_CONTROL)

  useConnectionMessageHandler((message) => {
    console.log("TEST", message)

    switch (message.type) {
      case MessageType.LOG:
        setLogs((prev) => [...prev, message.data])
        break
    }
  })

  return (
    <div className="flex-grow flex flex-col w-full max-h-dvh overflow-hidden">
      <div className="flex flex-wrap-reverse gap-2 items-center justify-between py-2 animate-in slide-in-from-top">
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
        {view === View.DRONE_CONTROL && <div>Drone control</div>}
        {view === View.LOGS && <Logs logs={logs} />}
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
