import readline from "node:readline"
import logger, { Text } from "../lib/logger"
import type { SocketEvent, Topic } from "../types"
import { Menu, type PostMessage } from "../lib/menu"

const ws = new WebSocket("ws://localhost:4000")
const menu = new Menu(ws)

function handleInput(postMessage: PostMessage | null) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  })

  if (postMessage?.action == "help") {
    handleCommand(rl, "/help")
    return
  }

  if (postMessage?.action == "list") {
    ws.send(JSON.stringify({ action: "list_topics" }))
    return
  }

  rl.on("line", (line) => {
    const message = line.trim()

    if (message.length === 0) {
      rl.prompt()
      return
    }

    if (message.startsWith("/")) {
      let args = message.split(" ")
      args.shift()
      handleCommand(rl, message, args)
      return
    }

    const event: SocketEvent = { action: "publish", topic: "1", message: message }
    ws.send(JSON.stringify(event))
    rl.prompt()
    console.log("sending", event.message)
  })

  rl.prompt()
}

function handleCommand(
  rl: readline.Interface,
  command: string,
  args?: string[]
) {
  if (command === "/join") {
    console.log(command, args)
  } else if (command === "/help") {
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

ws.onmessage = (event) => {
  const eventData = JSON.parse(event.data)

  if (eventData.message) {
    process.stdout.write(`${eventData.message}\n`)
  }

  if (eventData.name == "list_topics") {
    let rooms = ""
    eventData.data.forEach((topic: Topic) => {
      rooms += `${topic.name}\n`
    })

    console.log(`${rooms}\n`)
    console.log("Join a room with /join <id>")
    // rl.prompt()
  }
}