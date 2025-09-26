import readline from "node:readline"

const options = ["Create room", "List rooms", "Join room", "Help", "Quit"] as const
let selected = 0

type Option = typeof options[number]

export type PostMessage = {
  action: "create" | "join" | "list" | "help" | "quit"
  topic?: string
  message?: string
}

const isTTY = !!process.stdin.isTTY
console.log(isTTY)
if (isTTY) process.stdin.setRawMode(true)

export class Menu {
  ws: WebSocket
  private resolvePromise!: (value: PostMessage | null) => void
  private rejectPromise!: (reason?: any) => void
  private menuPromise: Promise<PostMessage | null>

  constructor(ws: WebSocket) {
    this.ws = ws

    this.menuPromise = new Promise((resolve, reject) => {
      this.resolvePromise = resolve
      this.rejectPromise = reject
    })

    readline.emitKeypressEvents(process.stdin)
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }

    process.stdin.on("keypress", (_, key: readline.Key) => {
      if (key.name === "up") {
        selected = (selected - 1 + options.length) % options.length
        this.render()
      } else if (key.name === "down") {
        selected = (selected + 1) % options.length
        this.render()
      } else if (key.name === "return") {
        this.handleSelection(options[selected]!)
      } else if (key.ctrl && key.name === "c") {
        this.end({ action: "quit", })
      } else {
        this.render()
      }
    })
  }

  waitForEnd(): Promise<PostMessage | null> {
    return this.menuPromise
  }

  end(value: PostMessage | null) {
    this.resolvePromise(value)
    process.stdin.removeAllListeners("keypress")
    if (isTTY) process.stdin.setRawMode(false)
  }

  render() {
    console.clear()
    console.log("=== User Menu ===\n")

    options.forEach((opt, idx) => {
      if (idx === selected) {
        console.log(`> \x1b[36m${opt}\x1b[0m`)
      } else {
        console.log(`  ${opt}`)
      }
    })
  }

  handleSelection(choice: Option) {
    console.clear()

    switch (choice) {
      case "Create room":
        this.createRoomPrompt()
        break
      case "List rooms":
        this.end({ action: "list" })
        break
      case "Join room":
        console.log("Joining room...")
        this.end({ action: "join" })
        break
      case "Help":
        this.end({ action: "help" })
        break
      case "Quit":
        console.log("Disconnecting...!")
        this.end({ action: "quit" })
        break
    }
  }

  async createRoomPrompt() {
    process.stdin.removeAllListeners("keypress")
    if (isTTY) process.stdin.setRawMode(false)

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question("Enter new room name: ", async (room) => {
      rl.close()

      if (room.trim().length === 0) {
        return this.createRoomPrompt()
      }

      console.log(`\n${room} Created!`)
      console.log(`\nJoining ${room}...`)
      this.ws.send(JSON.stringify({ action: "subscribe", topic: "1" }))

      await new Promise((resolve) => setTimeout(resolve, 750))

      setTimeout(() => {
        if (isTTY) process.stdin.setRawMode(true)
        readline.emitKeypressEvents(process.stdin)

        process.stdin.on("keypress", (_, key: readline.Key) => {
          if (key.name === "up") {
            selected = (selected - 1 + options.length) % options.length
            this.render()
          } else if (key.name === "down") {
            selected = (selected + 1) % options.length
            this.render()
          } else if (key.name === "return") {
            this.handleSelection(options[selected]!)
          }
        })

        process.stdin.removeAllListeners("keypress")
        this.end({ action: "create", topic: room.trim() })
      }, 10)
    })
  }
}
