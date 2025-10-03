import type { Database } from "@/lib/database"
import { RoomController } from "./room-controller"
import type { SocketEvent, WSClient } from "@/types"
import * as z from "zod"

export type EventType = {
  "subscribe": { room: string, ws: WSClient }
  "unsubscribe": { room: string, ws: WSClient }
  "publish": { event: SocketEvent, ws: WSClient, server: Bun.Server }
  "list_rooms": { ws: WSClient }
}

export type EventPayload<K extends keyof EventType = keyof EventType> = {
  [P in K]: { name: P, data: EventType[P] }
}[K]

export class EventHandler {
  roomController: RoomController

  constructor(db: Database) {
    this.roomController = new RoomController(db)
  }

  public handle(server: Bun.Server, ws: WSClient, message: string) {
    try {
      let event: SocketEvent
      event = JSON.parse(message)

      z.object({
        room: z.string().optional(),
        action: z.enum(["subscribe", "unsubscribe", "list_rooms", "publish"]),
        message: z.string().optional(),
      }).parse(event)

      switch (event?.action) {
        case "subscribe":
          this.subscribe({ room: event.room!, ws: ws! })
          break
        case "unsubscribe":
          this.unsubscribe({ room: event.room!, ws: ws! })
          break
        case "list_rooms":
          this.list_rooms({ ws: ws! })
          break
        case "publish":
          this.publish({ event: event!, ws: ws!, server: server! })
          break
      }
    } catch (err) {
      console.log(`Received non-JSON message: ${message}`)

      if (err instanceof z.ZodError) {
        ws.send(JSON.stringify({ error: "Invalid message format" }))
      }

      return
    }
  }

  private async subscribe({ room, ws }: EventType["subscribe"]) {
    await this.roomController.subscribe(room, ws)
  }

  private unsubscribe({ room, ws }: EventType["unsubscribe"]) {
    this.roomController.unsubscribe(room, ws)
  }

  private publish({ event, ws, server, }: EventType["publish"]) {
    this.roomController.publish(event, ws, server)
  }

  private async list_rooms({ ws }: EventType["list_rooms"]) {
    await this.roomController.listRooms(ws)
  }

  public close(client: WSClient) {
    this.roomController.close(client)
  }
}
