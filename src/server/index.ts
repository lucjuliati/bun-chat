import database from "@/lib/database"
import logger, { Text } from "@/lib/logger"
import type { WebSocketInstance } from "@/types"
import { EventHandler } from "./event-handler"
import { contentType } from "@/src/utils"
import { file } from "bun"

const db = await database.start()
const eventHandler = new EventHandler(db)

const server = Bun.serve<WebSocketInstance, {}>({
  port: 4000,
  async fetch(req, server) {
    const id = crypto.randomUUID().slice(0, 13)
    const data = { id, rooms: new Set() }
    const upgrade = server.upgrade(req, { data })

    if (upgrade) return

    const url = new URL(req.url)
    let path = `./public${url.pathname}`

    if (url.pathname === "/") {
      path = "./public/index.html"
    }

    try {
      return new Response(await file(path).arrayBuffer(), {
        headers: {
          "Content-Type": contentType(path),
        },
      })
    } catch {
      return new Response("404 Not Found", { status: 404 })
    }
  },
  websocket: {
    async message(ws, message) {
      eventHandler.handle(server, ws, message.toString())
    },
    open(ws) {
      logger([
        Text("GREEN", "+"),
        Text("RESET", `${ws.data.id} connected`)
      ])
    },
    close(ws) {
      eventHandler.close(ws)
    }
  },
})

console.log(`Listening on :${server.port}`)