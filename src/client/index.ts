import { Client } from "./client"

const WS_URL = "ws://localhost:4000"

const client = new Client(WS_URL)
client.start()