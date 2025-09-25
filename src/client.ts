import readline from "node:readline"
import logger, { Text } from "../lib/logger"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const ws = new WebSocket("ws://localhost:4000")

ws.onmessage = (event) => {
  console.log(`\n[chat] ${event.data}`)
  rl.prompt(true)
}

ws.onopen = () => {
  console.log("Connected to server. Type your message:")
  rl.prompt()
}

ws.onclose = (data) => {
  if (data.code == 1006) {
    logger(Text("RED", data.reason))
  } else {
    console.log("Disconnected from server.")
  }

  process.exit(0)
}

rl.on("line", (line) => {
  if (line.trim() === "/quit") {
    ws.close()
    rl.close()
    return
  }

  ws.send(JSON.stringify({ "action": "subscribe", "topic": "1" }))

  setTimeout(() => {
    ws.send(JSON.stringify({
      "action": "publish", "topic": "1", "message": line
    }))
  }, 25)
  rl.prompt()
})
