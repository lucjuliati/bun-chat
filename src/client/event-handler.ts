import type { Connection, Topic } from "@/types"
import { color, Text } from "@/lib/logger"
import { UI } from "@/src/client/ui"

export type EventType = {
  "on_join": {
    topic: string
    hash: string
    messages?: { created_at: string, user: string, message: string }[]
  }
  "message": { message: string }
  "list_rooms": { topics: unknown[] }
  "on_user_join": { topic: string, hash: string }
  "on_user_leave": { topic: string, hash: string }
}

export type EventPayload<K extends keyof EventType = keyof EventType> = {
  [P in K]: { name: P, data: EventType[P] }
}[K]

export class EventHandler {
  private ui: UI
  private connection: Connection
  private locale: string

  constructor(ui: UI, connection: Connection, locale: string) {
    this.ui = ui
    this.connection = connection
    this.locale = locale
  }

  public handle<E extends keyof EventType>(event: EventPayload<E>) {
    const handlerMap: {
      [K in keyof EventType]: (data: EventType[K]) => void
    } = {
      message: this.message.bind(this),
      list_rooms: this.list_rooms.bind(this),
      on_join: this.on_join.bind(this),
      on_user_join: this.on_user_join.bind(this),
      on_user_leave: this.on_user_leave.bind(this),
    }

    handlerMap[event.name](event.data)
  }

  private message(data: EventType["message"]) {
    this.ui.write(`${data.message}\n`)
  }

  private list_rooms(data: EventType["list_rooms"]) {
    this.ui.listRooms(data.topics as Topic[])
  }

  private on_join(data: EventType["on_join"]) {
    this.connection.topic = data.topic
    this.connection.hash = data.hash
    this.connection.isConnected = true

    this.ui.updateStatus(true)
    this.ui.clear()

    this.ui.write(
      color([
        Text("GREEN", "Connected to "),
        Text("RESET", data.topic ?? "")
      ])
    )

    let messages = ""
    for (const message of data.messages?.reverse() ?? []) {
      const time = new Date(Number(message.created_at)).toLocaleTimeString(
        this.locale,
        { hour: "2-digit", minute: "2-digit" }
      )
      messages += `[${time}] ${message.user}: ${message.message}\n`
    }
    this.ui.write(messages)
  }

  private on_user_join(data: EventType["on_user_join"]) {
    if (data.topic !== this.connection.topic) return
    this.ui.write(color(Text("GREEN", `${data.hash} joined\n`)))
  }

  private on_user_leave(data: EventType["on_user_leave"]) {
    if (data.topic !== this.connection.topic) return
    this.ui.write(color(Text("RED", `${data.hash} left\n`)))
  }
}
