import { Connection } from "./p2p";

type LogFunctions = {
  [key in keyof typeof console]: (typeof console)[key] extends () => void
    ? (typeof console)[key]
    : never;
};
const methods = ["log", "info", "warn", "error"] as const satisfies Array<
  keyof LogFunctions
>;

export const logger = Object.fromEntries(
  methods.map((method) => [method, logFunctionFactory(method)])
);

function logFunctionFactory<MethodType extends keyof LogFunctions>(
  method: MethodType
) {
  return (...args: Parameters<LogFunctions[MethodType]>) => {
    //@ts-expect-error Typing is not working
    console[method](...args);

    Connection.broadcast({
      type: "log",
      data: {
        method,
        args,
      },
    });
  };
}
