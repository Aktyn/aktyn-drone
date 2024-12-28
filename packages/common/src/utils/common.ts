import { v4 as uuidv4 } from "uuid"
import type { Message, MessageType } from "../message"

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function randomString(length: number) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}

export function uuid() {
  return uuidv4()
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type LogMessageData = (Message & { type: MessageType.LOG })["data"]
export function stringifyLogArguments(args: LogMessageData["args"]) {
  return args
    .map((value) => {
      if (typeof value === "object") {
        return JSON.stringify(value)
      }
      return String(value)
    })
    .join(" ")
}
