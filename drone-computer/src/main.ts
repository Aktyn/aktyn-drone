import process from "node:process";
import { randomString } from "@aktyn-drone/common";

const peerId = process.env.PEER_ID ?? randomString(24);
console.log("PEER_ID", peerId);
