import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function base64ToUint8Array(base64: string) {
  try {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  } catch (error) {
    return null
  }
}

export function cmPerSecondToKmPerHour(cmPerSecond: number) {
  return cmPerSecond * 0.036
}

export function radiansToDegrees(radians: number) {
  return radians * (180 / Math.PI)
}

export function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0
}
