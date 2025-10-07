import { colors, logError } from "@/lib/logger"
import type { Connection, Room, WebSocketAction } from "@/types"
import blessed, { Widgets } from "blessed"

export class UI {
  private connection: Connection
  private sendAction: (action: WebSocketAction) => void
  private history: string[] = []
  private historyIndex: number = -1

  private screen: Widgets.Screen = blessed.screen({
    smartCSR: true,
    title: "Bun Chat"
  })
  private statusBox: Widgets.BoxElement | undefined
  private messageBox: Widgets.BoxElement | undefined
  private input: Widgets.TextboxElement | undefined

  render() {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
    this.screen.render()
  }

  constructor(connection: Connection, sendAction: (action: WebSocketAction) => void) {
    this.connection = connection
    this.sendAction = sendAction

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

      if (!this.connection.isConnected || !this.connection.room) {
        this.write(logError("You are not connected to a room!"))
        return
      }

      this.sendAction({ action: "publish", room: this.connection.room, message })
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
      this.sendAction({ action: "quit" })
    })
  }

  updateStatus = (connected: boolean) => {
    if (connected) {
      let text = "{green-fg}Connected\n"
      text += `{white-fg}Room: ${this.connection.room}{/}\n`
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

    const current = this.messageBox!.getContent() ?? ""

    const newContent = current ? `${current}\n${message}` : message
    this.messageBox!.setContent(newContent)
    this.messageBox?.setScrollPerc(100)

    this.screen.render()
    this.input!.clearValue()
  }

  listRooms(data: Room[]) {
    let rooms = `Rooms:\n${colors.YELLOW}`
    if (data.length > 0) {
      rooms += data.map(room => room.name ?? "").join(", ")
      rooms += (colors.RESET + "\n")

      this.clear()
      this.write(`${rooms}Join a room with /join <name>`)
    } else {
      this.write(logError("No rooms found!"))
    }
  }

  joinRoom(args?: string[]) {
    try {
      let room: string

      if (!args) {
        this.write(logError("No room name provided!"))
        return
      }

      room = args[0]?.trim() ?? ""

      if (this.connection.room === room) {
        return
      }

      if (room.length === 0) {
        this.write(logError("No room name provided"))
      } else {
        this.sendAction({ action: "subscribe", room })
      }
    } catch {
      this.write(logError("Error while joining room"))
    }
  }

  leaveRoom() {
    if (this.connection.room && this.connection.isConnected) {
      this.sendAction({ action: "unsubscribe", room: this.connection.room })
      this.connection.room = undefined
      this.connection.hash = undefined
      this.updateStatus(false)
      this.clear()
    }
  }

  handleCommand = async (command: string, args?: string[]) => {
    if (command === "rooms") {
      this.sendAction({ action: "list_rooms" })
      return
    } else if (command === "join") {
      this.joinRoom(args)
    } else if (command === "leave" || command === "exit") {
      this.leaveRoom()
    } else if (command === "quit") {
      this.sendAction({ action: "quit" })
    } else if (command === "clear") {
      this.clear()
    } else {
      this.write(logError(`Unknown command: ${command}`))
    }
  }
}

type Styles = {
  "message": Widgets.BoxOptions
  "input": Widgets.BoxOptions
  "status": Widgets.BoxOptions
  "commands": Widgets.BoxOptions
}

const styles: Styles = {
  message: {
    top: 0,
    left: 0,
    width: "75%",
    height: "90%",
    scrollable: true,
    alwaysScroll: true,
    content: "Welcome. use /rooms to list available rooms or /join to join/create a room",
    tags: true,
    border: { type: "bg" },
    style: {
      fg: "white",
      border: { fg: "cyan" }
    }
  },
  input: {
    bottom: 0,
    left: 0,
    width: "75%",
    height: 3,
    keys: true,
    mouse: true,
    inputOnFocus: true,
    border: { type: "line" },
    style: {
      fg: "white",
      border: { fg: "white" }
    }
  },
  status: {
    top: 0,
    right: 0,
    width: "25%",
    height: "40%",
    padding: { left: 1 },
    label: "Status",
    border: { type: "bg", },
    tags: true,
    style: { fg: "red", },
    content: "Disconnected"
  },
  commands: {
    top: "45%",
    right: 0,
    width: "25%",
    height: "60%",
    label: "Commands",
    padding: { left: 1 },
    border: { type: "bg" },
    style: { fg: "white", },
    content: "/rooms\n/join\n/leave\n/clear\n/quit"
  }
}