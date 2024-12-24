import type { Message, MessageType } from "@aktyn-drone/common"
import { ScrollArea } from "~/components/ui/scroll-area"
import { cn } from "~/lib/utils"

export type LogMessageData = (Message & { type: MessageType.LOG })["data"]

type LogsProps = {
  logs: Array<LogMessageData>
}

export function Logs({ logs }: LogsProps) {
  return (
    <div className="flex-grow m-2 bg-background/50 border rounded-lg animate-in fade-in [&_pre]:text-xs [&_pre]:break-words [&_pre]:whitespace-pre-wrap overflow-hidden flex">
      <ScrollArea className="p-2">
        {logs.map((log, index) => (
          <pre
            className={cn(log.method === "log" && "text-foreground")}
            key={`${log.timestamp}-${index}`}
          >
            {log.args.map(String).join(" ")}
          </pre>
        ))}
      </ScrollArea>
    </div>
  )
}
