import logger, { Text } from "@/lib/logger"
import type { Connection } from "@/types"
import { UI } from "./ui"

const connection: Connection = {
  isConnected: false,
  topic: undefined,
}
const ws = new WebSocket("ws://localhost:4000")
const ui = new UI(ws, connection)
ui.render()

ws.onopen = () => {
  ui.updateStatus(true)
}

ws.onmessage = ({ data }) => {
  const event = JSON.parse(data)

  if (event.message) {
    ui.write(`${event.message}\n`)
  }

  if (event.name == "list_topics") {
    ui.listRooms(event.data)
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