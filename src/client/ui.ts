import { colors, logError } from "@/lib/logger"
import type { Connection, Topic } from "@/types"
import blessed, { Widgets } from "blessed"
import styles from "./tui-style"

export class UI {
  ws: WebSocket
  connection: Connection
  history: string[] = []
  historyIndex: number = -1
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

    this.messageBox = blessed.box(styles.message)
    this.statusBox = blessed.box(styles.status)
    const commandsBox = blessed.box(styles.commands)
    this.input = blessed.textbox(styles.input)

    this.screen.append(this.messageBox)
    this.screen.append(this.statusBox)
    this.screen.append(commandsBox)
    this.screen.append(this.input)
    this.input!.focus()

    this.input.on("submit", (text: string) => {
      const message = text.trim()
      if (!message) return

      this.history = Array.from(new Set([...this.history, message]))
      this.historyIndex = -1

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

    this.input.key("up", () => {
      if (this.history.length === 0) return
      if (this.historyIndex === -1) {
        this.historyIndex = this.history.length - 1
      } else if (this.historyIndex > 0) {
        this.historyIndex--
      }

      if (this.history[this.historyIndex]) {
        this.input!.setValue(this.history[this.historyIndex]!)
        this.screen.render()
      }
    })

    this.input.key("down", () => {
      if (this.history.length === 0) return
      if (this.historyIndex === -1) return

      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++
        if (this.history[this.historyIndex]) {
          this.input!.setValue(this.history[this.historyIndex]!)
        }
      } else {
        this.historyIndex = -1
        this.input!.clearValue()
      }
      this.screen.render()
    })


    this.screen.key(["escape", "q"], () => {
      ws.close()

      connection.isConnected = false
      connection.topic = undefined
      process.exit(0)
    })
  }

  updateStatus = (connected: boolean) => {
    if (connected) {
      let text = "{green-fg}Connected\n"
      text += `{white-fg}Room: ${this.connection.topic}{/}\n`
      text += `{white-fg}Hash: ${this.connection.hash}{/}\n`
      this.statusBox?.setContent(text)
    } else {
      this.statusBox?.setContent("{red-fg}Disconnected")
    }

    this.connection.isConnected = connected
    this.screen.render()
    this.statusBox?.render()
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
    let rooms = `Rooms:\n${colors.YELLOW}`
    if (data.length > 0) {
      rooms += data.map(topic => topic.name ?? "").join(", ")
      rooms += (colors.RESET + "\n")

      this.clear()
      this.write(`${rooms}Join a room with /join <name>`)
    } else {
      this.write(logError("No rooms found!"))
    }
  }

  joinRoom(args?: string[]) {
    try {
      let topic: string

      if (!args) {
        this.write(logError("No room name provided!"))
        return
      }

      topic = args[0]?.trim() ?? ""

      if (this.connection.topic === topic) {
        return
      }

      if (topic.length === 0) {
        this.write(logError("No room name provided"))
      } else {
        this.ws.send(JSON.stringify({ action: "subscribe", topic }))
      }
    } catch {
      this.write(logError("Error while joining room"))
    }
  }

  leaveRoom() {
    if (this.connection.topic && this.connection.isConnected) {
      this.ws.send(JSON.stringify({ action: "unsubscribe", topic: this.connection.topic }))
      this.connection.topic = undefined
      this.connection.hash = undefined
      this.updateStatus(false)
      this.clear()
    }
  }

  handleCommand = async (command: string, args?: string[]) => {
    if (command === "rooms") {
      this.ws.send(JSON.stringify({ action: "list_rooms" }))
      return
    } else if (command === "join") {
      this.joinRoom(args)
    } else if (command === "leave") {
      this.leaveRoom()
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
