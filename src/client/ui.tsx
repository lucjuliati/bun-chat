import logger, { logError, Text } from "@/lib/logger"
import type { Connection, Topic } from "@/types"
import blessed, { Widgets } from "blessed"

export class UI {
  ws: WebSocket
  connection: Connection
  screen: Widgets.Screen = blessed.screen({
    smartCSR: true,
    title: "Bun Chat"
  })
  statusBox: Widgets.BoxElement | undefined
  messageBox: Widgets.BoxElement | undefined
  input: Widgets.TextboxElement | undefined

  render() {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
    this.screen.render()
  }

  constructor(ws: WebSocket, connection: Connection) {
    this.ws = ws
    this.connection = connection

    this.messageBox = blessed.box({
      top: 0,
      left: 0,
      width: "80%",
      height: "90%",
      content: "Type something below...",
      tags: true,
      border: { type: "bg" },
      style: {
        fg: "white",
        border: { fg: "cyan" }
      }
    })

    this.statusBox = blessed.box({
      top: 0,
      right: 0,
      width: "20%",
      height: "40%",
      padding: { left: 1 },
      label: "Status",
      border: { type: "bg", },
      style: { fg: "red", },
      content: "Disconnected"
    })

    const commandsBox = blessed.box({
      top: "45%",
      right: 0,
      width: "20%",
      height: "60%",
      label: "Commands",
      padding: { left: 1 },
      border: { type: "bg" },
      style: { fg: "white", },
      content: "/list\n/create\n/join\n/clear\n/quit"
    })

    this.input = blessed.textbox({
      bottom: 0,
      left: 0,
      width: "80%",
      height: 3,
      keys: true,
      mouse: true,
      inputOnFocus: true,
      border: { type: "line" },
      style: {
        fg: "white",
        border: { fg: "white" }
      }
    })

    this.screen.append(this.messageBox)
    this.screen.append(this.statusBox)
    this.screen.append(commandsBox)
    this.screen.append(this.input)
    this.input!.focus()

    this.input.on("submit", (text: string) => {
      const message = text.trim()
      if (!message) return

      this.input!.clearValue()
      this.screen.render()
      this.input!.focus()

      if (message.startsWith("/")) {
        const [command, ...args] = message.slice(1).split(" ")
        this.handleCommand(command!, args)
        return
      }

      if (!this.connection.isConnected || !this.connection.topic) {
        this.write(logError("You are not connected to a room!"))
        return
      }

      this.ws.send(JSON.stringify({
        action: "publish",
        topic: this.connection.topic,
        message
      }))
    })

    this.screen.key(["escape", "q"], () => {
      ws.close()

      connection.isConnected = false
      connection.topic = undefined
      process.exit(0)
    })
  }

  updateStatus = (connected: boolean) => {
    let status = "Disconnected"
    if (connected) {
      this.statusBox!.style.fg = "green"
      this.statusBox!.setContent("Connected")
    } else {
      this.statusBox!.style.fg = "red"
      this.statusBox!.setContent("Disconnected")
    }

    this.connection.isConnected = connected
    this.screen.render()
  }

  clear = () => {
    this.messageBox!.setContent("")
    this.screen.render()
  }

  write = (message: string) => {
    message = message.trim()
    if (!message) return

    const box = this.messageBox!
    const current = box.getContent() ?? ""

    const newContent = current ? `${current}\n${message}` : message
    box.setContent(newContent)

    this.screen.render()
    this.input!.clearValue()
  }

  listRooms(data: Topic[]) {
    let rooms = ""
    data.forEach((topic) => {
      rooms += `${topic.name}\n`
    })

    this.clear()
    this.write(`${rooms}\nJoin a room with /join <name>`)
  }

  handleCommand = async (command: string, args?: string[]) => {
    if (command === "list") {
      this.ws.send(JSON.stringify({ action: "list_topics" }))
      return
    } else if (command === "create") {
      // await createRoomPrompt()
    } else if (command === "join") {
      if (args?.length === 0) {
        this.write(logError("No room name provided"))
      } else {
        const topic = args?.[0]
        this.ws.send(JSON.stringify({ action: "subscribe", topic }))
        this.connection.topic = topic
        this.connection.isConnected = true
        this.write(
          logger([
            Text("GREEN", "Connected to"),
            Text("RESET", topic ?? "")
          ], { supressLog: true })
        )
      }
    } else if (command === "quit") {
      this.ws.close()
      process.exit(0)
    } else if (command === "clear") {
      this.clear()
    } else {
      this.write(logError(`Unknown command: ${command}`))
    }
  }
}
