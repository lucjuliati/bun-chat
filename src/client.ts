import readline from "node:readline"
import logger, { Text } from "../lib/logger"
import type { SocketEvent } from "../types"
import { Menu, type PostMessage } from "../lib/menu"

const ws = new WebSocket("ws://localhost:4000")
const menu = new Menu(ws)

function handleInput(postMessage: PostMessage | null) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  })

  rl.on("line", (line) => {
    const message = line.trim()

    if (message.length === 0) {
      rl.prompt()
      return
    }

    if (message.startsWith("/")) {
      handleCommand(message, rl)
      return
    }

    const event: SocketEvent = { action: "publish", topic: "1", message: message }
    ws.send(JSON.stringify(event))
    rl.prompt()
    console.log("sending", event.message)
  })

  rl.prompt()
}

ws.onmessage = (event) => {
  const chatMessage = JSON.parse(event.data)
  if (chatMessage.message) {
    process.stdout.write(`${chatMessage.message}\n`)
  }
}

ws.onopen = () => {
  console.log("Connected")
  menu.render()
  menu.waitForEnd().then((postMessage) => handleInput(postMessage))
}

ws.onclose = (data) => {
  if (data.code === 1006) {
    logger(Text("RED", data.reason))
  } else {
    console.log("Disconnected from server.")
  }

  process.exit(0)
}

function handleCommand(command: string, rl: readline.Interface) {
  if (command === "/help") {
    console.log("Available commands:", "/help", "/menu", "/quit", "/clear")
    rl.prompt()
  } else if (command === "/menu") {
    menu.render()
    rl.prompt()
  } else if (command === "/quit") {
    ws.close()
    rl.close()
    process.exit(0)
  } else if (command === "/clear") {
    console.clear()
    rl.prompt()
  } else {
    console.log("Unknown command:", command)
    rl.prompt()
  }
}