import { Chat } from "./chat.js"

export class Controller {
  constructor(chat) {
    this.chat = chat
    this.chat.setController(this)
    this.connection = {
      isConnected: false,
      room: null
    }
    this.ws = new WebSocket(`ws://localhost:4000`)
    this.ws.onopen = this.onOpen.bind(this)
    this.ws.onmessage = this.onMessage.bind(this)
    this.ws.onclose = this.onClose.bind(this)
    this.ws.onerror = this.onError.bind(this)
    window.handleCommand = this.handleCommand.bind(this)
    window.addEventListener("beforeunload", () => this.ws.close())
  }

  onOpen() {
    console.log("Connected to WebSocket server")
  }

  onMessage(event) {
    try {
      const eventData = JSON.parse(event.data)
      console.log(eventData)

      if (eventData.name == "message") {
        const message = eventData.data.message.replace(/\x1B\[[0-9]*[A-Za-z]/g, '')
        this.chat.write(message, { timestamp: new Date().getTime() })
      }

      if (eventData?.name == "on_join") {
        this.onJoin(eventData)
      }

      if (eventData?.name == "on_user_join") {
      }

      if (eventData?.name == "on_user_leave") {
      }

      if (eventData?.name == "list_rooms") {
        this.onListRooms(eventData)
      }
    } catch (err) {
      console.error(err)
    }
  }

  onJoin(event) {
    this.chat.write(`Joined room: ${event.data.room}`)
    this.connection.isConnected = true
    this.connection.room = event.data.room
    this.chat.updateStatus(this.connection)

    let messages = []
    let lastDate = null

    if (event.data.messages) {
      messages = event.data.messages.reverse()
    }

    if (messages.length > 0) {
      const date = new Date(Number(messages[0].created_at))
      if (date.getDate() != new Date().getDate()) {
        this.chat.write(date.toLocaleDateString(navigator.language ?? "en-US"))
      }
    }

    messages?.forEach(message => {
      const date = new Date(Number(message.created_at))
      const time = date.toLocaleTimeString(
        navigator.language ?? "en-US",
        { hour: '2-digit', minute: '2-digit' }
      )
      const content = `[${time}] ${message.user}: ${message.message}`
      this.chat.write(content, { timestamp: Number(message.created_at) })
      console.log(message.message, message.created_at)
      console.log(lastDate?.getDate(), date.getDate())
      if (lastDate != null && (lastDate?.getDate() != date.getDate())) {
        this.chat.write(date.toLocaleDateString(navigator.language ?? "en-US"))
      }
      lastDate = date
    })
  }

  onClose(event) {
    if (event.code === 1006) {
      this.chat.write(`Connection error: ${event.reason}`)
    }
  }

  onError(error) {
    console.error("WebSocket error:", error)
  }

  onListRooms(event) {
    if (event.data.rooms?.length > 0) {
      let rooms = event.data.rooms.map(room => room.name).join(", ")
      this.chat.write(`Rooms: ${rooms}`)
      this.chat.write("Join a room with /join <name>")
    } else {
      this.chat.write("No rooms found!", { color: "tomato" })
    }
  }

  handleCommand(command) {
    let args = command.split(" ")
    command = args[0]
    args.shift()

    if (command === "/rooms") {
      this.ws.send(JSON.stringify({ action: "list_rooms" }))
    } else if (command === "/join") {
      if (!args[0]) {
        this.chat.write("You must provide a room name!", { color: "tomato" })
        return
      }

      if (this.connection.isConnected) {
        this.chat.write("You are already connected to a room. Use /leave to leave it.", { color: "tomato" })
        return
      }

      this.ws.send(JSON.stringify({ action: "subscribe", room: args[0] }))
    } else if (command === "/leave" || command === "/exit") {
      this.connection.isConnected = false
      this.connection.room = null
      this.chat.updateStatus(this.connection)
      this.ws.send(JSON.stringify({ action: "unsubscribe", room: args[0] }))
    } else if (command === "/clear") {
      this.chat.messageBox.innerHTML = ""
      this.chat.input?.focus()
    }
  }
}

const chat = new Chat()
new Controller(chat)