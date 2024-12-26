import type { Message, MessageType } from "@aktyn-drone/common"
import { Eraser } from "lucide-react"
import { memo, useEffect, useRef } from "react"
import { Button } from "~/components/ui/button"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Separator } from "~/components/ui/separator"
import { cn } from "~/lib/utils"

export type LogMessageData = (Message & { type: MessageType.LOG })["data"]

type LogsProps = {
  logs: Array<LogMessageData | string>
  onClear: () => void
}

export const Logs = memo(({ logs, onClear }: LogsProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const lastLogEntry = containerRef.current?.querySelector(".last-log-entry")
    if (lastLogEntry) {
      lastLogEntry.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  return (
    <div
      ref={containerRef}
      className="flex-grow m-2 mt-0 bg-background/50 border rounded-lg animate-in fade-in [&_pre]:text-xs [&_pre]:break-words [&_pre]:whitespace-pre-wrap overflow-hidden flex relative"
    >
      <ScrollArea className="p-2 w-full">
        {logs.map((log, index, arr) =>
          typeof log === "string" ? (
            <div
              key={index}
              className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 text-xs text-muted-foreground font-medium"
            >
              <Separator />
              <span>{log}</span>
              <Separator />
            </div>
          ) : (
            <pre
              className={cn(
                arr.length - 1 === index && "last-log-entry",
                log.method === "log" && "text-foreground",
                log.method === "info" && "text-cyan-200",
                log.method === "warn" && "text-orange-200",
                log.method === "error" && "text-red-300",
              )}
              key={`${log.timestamp}-${index}`}
            >
              {stringifyLog(log)}
            </pre>
          ),
        )}
      </ScrollArea>
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 backdrop-blur-sm"
        onClick={onClear}
        disabled={logs.length === 0}
      >
        <Eraser className="size-4" />
        <span>Clear logs</span>
      </Button>
    </div>
  )
})

Logs.displayName = "Logs"

function stringifyLog(log: LogMessageData) {
  return log.args
    .map((value) => {
      if (typeof value === "object") {
        return JSON.stringify(value)
      }
      return String(value)
    })
    .join(" ")
}
