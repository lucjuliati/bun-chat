import database from "@/lib/database"
import logger, { Text } from "@/lib/logger"
import { TopicController } from "@/src/server/topic-controller"
import type { SocketEvent, WebSocketInstance } from "@/types"
import { contentType } from "@/src/utils"
import { file } from "bun"
import * as z from "zod"

const db = await database.start()
const topicController = new TopicController(db)

const server = Bun.serve<WebSocketInstance, {}>({
  async fetch(req, server) {
    const id = crypto.randomUUID().slice(0, 13)
    const data = { id, topics: new Set() }
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
      let event: SocketEvent

      try {
        event = JSON.parse(message.toString())
        z.object({
          topic: z.string().optional(),
          action: z.enum(["subscribe", "unsubscribe", "list_rooms", "publish"]),
          message: z.string().optional(),
        }).parse(event)

      } catch (e) {
        console.log(`Received non-JSON message: ${message}`)

        if (e instanceof z.ZodError) {
          ws.send(JSON.stringify({ error: "Invalid message format" }))
        }

        return
      }

      switch (event.action) {
        case "subscribe": {
          await topicController.subscribe(event.topic, ws)
          break
        }
        case "unsubscribe": {
          topicController.unsubscribe(event.topic, ws)
          break
        }
        case "list_rooms": {
          await topicController.listRooms(ws)
          break
        }
        case "publish": {
          topicController.publish(event.topic, ws, server, event)
          break
        }
        default:
          break
      }
    },
    open(ws) {
      logger([
        Text("GREEN", "+"),
        Text("RESET", `${ws.data.id} connected`)
      ])
    },
    close(ws) {
      topicController.close(ws)
    }
  },
  port: 4000,
})

console.log(`Listening on :${server.port}`)