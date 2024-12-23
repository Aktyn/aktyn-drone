import { Connection } from "./p2p";
import { randomString } from "@aktyn-drone/common";
import { config } from "dotenv";

config();

const peerId = process.env.PEER_ID ?? randomString(24);
Connection.init(peerId);
