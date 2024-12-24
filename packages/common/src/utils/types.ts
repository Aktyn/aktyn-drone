export type LogFunctions = {
  [key in keyof typeof console as (typeof console)[key] extends (
    ...args: never[]
  ) => void
    ? key extends string
      ? key
      : never
    : never]: (typeof console)[key]
}
