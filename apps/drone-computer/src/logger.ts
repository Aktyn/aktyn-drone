import {
  MessageType,
  stringifyLogArguments,
  type LogFunctions,
} from "@aktyn-drone/common"
import fs from "fs"
import path from "path"
import { Connection } from "./p2p"

const logsDirectory = path.join(process.env.HOME ?? process.cwd(), "drone-logs")
if (!fs.existsSync(logsDirectory)) {
  console.info(`Creating logs directory at ${logsDirectory}`)
  fs.mkdirSync(logsDirectory, { recursive: true })
}

const methods = ["log", "info", "warn", "error"] as const satisfies Array<
  keyof LogFunctions
>

export const logger = Object.fromEntries(
  methods.map((method) => [method, logFunctionFactory(method)]),
)

function logFunctionFactory<MethodType extends keyof LogFunctions & string>(
  method: MethodType,
) {
  return (...args: Parameters<LogFunctions[MethodType]>) => {
    //@ts-expect-error Typing is not working
    // eslint-disable-next-line no-console
    console[method](...args)

    const timestamp = Date.now()

    Connection.broadcast({
      type: MessageType.LOG,
      data: {
        method,
        timestamp,
        args,
      },
    })

    saveToFile(`[${method}] ${stringifyLogArguments(args)}`, timestamp)
  }
}

const MINUTE = 60 * 1000
let lastTimestampMinute = 0
function saveToFile(data: string, timestamp: number) {
  const filePath = getTodayLogFilePath()

  const timestampMinute = Math.floor(timestamp / MINUTE)
  if (timestampMinute !== lastTimestampMinute) {
    lastTimestampMinute = timestampMinute
    appendLine(
      filePath,
      `--- ${new Date(timestamp).toLocaleTimeString("en-GB", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      })} ---`,
    )
  }

  appendLine(filePath, data)
}

function getTodayLogFilePath() {
  const date = new Date()
  const dateString = `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`
  return path.join(logsDirectory, `${dateString}.log`)
}

export function getTodayLogs() {
  const filePath = getTodayLogFilePath()
  return fs.readFileSync(filePath, "utf-8")
}

function appendLine(filePath: string, data: string) {
  fs.appendFileSync(filePath, data + "\n")
}

function padZero(value: number, length = 2) {
  return value.toString().padStart(length, "0")
}
