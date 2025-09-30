import logger, { Text } from "@/lib/logger"
import type { Connection } from "@/types"
import { UI } from "./ui"

const connection: Connection = {
  isConnected: false,
  topic: undefined,
}
const locale = Intl.DateTimeFormat().resolvedOptions().locale
const ws = new WebSocket("ws://localhost:4000")
const ui = new UI(ws, connection)
ui.render()

ws.onmessage = ({ data }) => {
  const event = JSON.parse(data)

  if (event.name === "message") {
    ui.write(`${event.data.message}\n`)
  }

  if (event.name === "list_rooms") {
    ui.listRooms(event.data)
  }

  if (event.name === "on_join") {
    let messages = ""

    connection.topic = event.data.topic
    connection.hash = event.data.hash
    connection.isConnected = true

    ui.updateStatus(true)

    ui.write(
      logger([
        Text("GREEN", "Connected to"),
        Text("RESET", event.data.topic ?? "")
      ], { supressLog: true })
    )

    for (const message of event.data.messages?.reverse() ?? []) {
      let time = new Date(Number(message.created_at)).toLocaleTimeString(
        locale,
        { hour: "2-digit", minute: "2-digit" }
      )
      messages += `[${time}] ${message.user}: ${message.message}\n`
    }

    ui.write(messages)
  }

  if (event.name === "on_leave") {
    console.log(event)
  }
}

ws.onclose = (data) => {
  if (data.code === 1006) {
    logger(Text("RED", data.reason))
  } else {
    console.log("Disconnected from server\n")
  }

  ui.updateStatus(false)
  connection.isConnected = false
  connection.topic = undefined
  ws.close()
  process.exit(0)
}

process.on("SIGINT", () => {
  ws.close()
  process.exit(0)
})