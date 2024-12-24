export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function randomString(length: number) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}
