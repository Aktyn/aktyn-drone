/// <reference lib="deno.ns" />
import { randomString } from '@aktyn-drone/common'
import { Connection } from './p2p.ts'

const peerId = Deno.env.get('PEER_ID') ?? randomString(24)
Connection.init(peerId)
