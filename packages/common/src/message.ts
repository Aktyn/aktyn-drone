import type { LogFunctions } from "./utils/types";

export enum MessageType {
  PING = "ping",
  PONG = "pong",
  LOG = "log",
}

type MessageBase<Type extends MessageType, Data extends object> = {
  type: Type;
  data: Data;
};

export type Message =
  | MessageBase<
      MessageType.PING,
      {
        id: number | string;
      }
    >
  | MessageBase<
      MessageType.PONG,
      {
        pingId: number | string;
      }
    >
  | MessageBase<
      MessageType.LOG,
      {
        method: keyof LogFunctions;
        args: any[];
      }
    >;
