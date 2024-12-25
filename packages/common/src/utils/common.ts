import { v4 as uuidv4 } from "uuid"

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
