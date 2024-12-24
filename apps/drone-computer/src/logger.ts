import { MessageType, type LogFunctions } from "@aktyn-drone/common"
import { Connection } from "./p2p"

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

    Connection.broadcast({
      type: MessageType.LOG,
      data: {
        method,
        timestamp: Date.now(),
        args,
      },
    })
  }
}
