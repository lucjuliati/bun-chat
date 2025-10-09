import { Chat } from "./chat.js"

const address = `ws://${location.host}`
const locale = navigator.language ?? "en-US"

export class Controller {
  constructor(chat) {
    this.chat = chat
    this.chat.setController(this)

    this.connection = {
      isConnected: false,
      room: null,
      hash: null
    }

    this.reconnect = {
      attempts: 0,
      maxAttempts: 10,
      interval: null,
      delay: 2000
    }

    this.initWebSocket()

    window.addEventListener("beforeunload", () => {
      if (this.connection.isConnected) {
        navigator.sendBeacon("/close", JSON.stringify(this.connection))
      }
      this.ws?.close()
    })
  }

  initWebSocket() {
    this.ws = new WebSocket(address)
    this.ws.onopen = this.onOpen.bind(this)
    this.ws.onmessage = this.onMessage.bind(this)
    this.ws.onclose = this.onClose.bind(this)
    this.ws.onerror = this.onError.bind(this)
  }

  startReconnection() {
    if (this.reconnect.interval) return

    this.reconnect.attempts = 0
    this.reconnect.interval = setInterval(() => {
      if (this.reconnect.attempts >= this.reconnect.maxAttempts) {
        clearInterval(this.reconnect.interval)
        this.reconnect.interval = null
        this.chat.write("Failed to reconnect after 10 attempts.", { color: "tomato" })
        return
      }

      this.reconnect.attempts++

      try {
        this.ws = new WebSocket(address)
        this.ws.onopen = () => {
          clearInterval(this.reconnect.interval)
          this.reconnect.interval = null
          this.onOpen()
        }
        this.ws.onmessage = this.onMessage.bind(this)
        this.ws.onclose = this.onClose.bind(this)
        this.ws.onerror = this.onError.bind(this)
      } catch (err) {
        console.error("Reconnection attempt failed:", err)
      }
    }, this.reconnect.delay)
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

      if (this.connection.room != null) {
        this.chat.write("You are already connected to a room. Use /leave to leave it.", { color: "tomato" })
        return
      }

      this.ws.send(JSON.stringify({ action: "subscribe", room: args[0] }))
    } else if (command === "/leave" || command === "/exit") {
      this.ws.send(JSON.stringify({ action: "unsubscribe", room: this.connection.room }))
      this.connection.isConnected = false
      this.connection.room = null
      this.chat.updateStatus(this.connection)
      this.chat.write("You have left the room.", { color: "#5e5e5eff" })
    } else if (command === "/clear") {
      this.chat.messageBox.innerHTML = ""
      this.chat.input?.focus()
    } else {
      this.chat.write(`Unknown command: "${command}"`, { color: "tomato" })
    }
  }

  onOpen() {
    console.log("Connected to WebSocket server")
    this.connection.isConnected = true
    this.reconnect.attempts = 0

    if (this.reconnect.interval) {
      clearInterval(this.reconnect.interval)
      this.reconnect.interval = null
    }
  }

  onMessage(event) {
    try {
      const eventData = JSON.parse(event.data)

      if (eventData.name == "message") {
        const message = eventData.data.message.replace(/\x1B\[[0-9]*[A-Za-z]/g, '')
        this.chat.write(message, {
          timestamp: new Date().getTime(),
          chat: {
            me: this.connection.hash,
            user: eventData.data.user,
            room: eventData.data.room,
            message: eventData.data.raw,
          }
        })
      }

      if (eventData?.name == "on_join") this.onJoin(eventData)
      if (eventData?.name == "on_user_join") this.onUserJoin(eventData)
      if (eventData?.name == "on_user_leave") this.onUserLeave(eventData)
      if (eventData?.name == "list_rooms") this.onListRooms(eventData)
    } catch (err) {
      console.error(err)
    }
  }

  onJoin(event) {
    this.chat.write(`Joined room: ${event.data.room}`)
    this.connection.isConnected = true
    this.connection.room = event.data.room
    this.connection.hash = event.data.hash
    this.chat.updateStatus(this.connection)

    let messages = []
    let lastDate = null

    if (event.data.messages) messages = event.data.messages.reverse()

    if (messages.length > 0) {
      const date = new Date(Number(messages[0].created_at))
      if (date.getDate() != new Date().getDate()) {
        this.chat.write(date.toLocaleDateString(locale))
      }
    }

    messages?.forEach(message => {
      const date = new Date(Number(message.created_at))
      const time = date.toLocaleTimeString(locale, {
        hour: '2-digit', minute: '2-digit'
      })

      const content = `[${time}] ${message.user}: ${message.message}`
      this.chat.write(content, { timestamp: Number(message.created_at) })

      if (lastDate != null && (lastDate?.getDate() != date.getDate())) {
        this.chat.write(date.toLocaleDateString(locale))
      }
      lastDate = date
    })
  }

  onUserJoin(event) {
    this.chat.write(`${event.data.hash} has joined the room`, { color: "#2db059ff" })
  }

  onUserLeave(event) {
    this.chat.write(`${event.data.hash} has left the room`, { color: "#5e5e5eff" })
  }

  onClose(event) {
    this.connection.isConnected = false
    this.chat.updateStatus(this.connection)

    if (event.code !== 1000) {
      this.chat.write(
        "Disconnected from server. Attempting to reconnect...",
        { color: "#efba52ff" }
      )
      this.startReconnection()
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
}


const chat = new Chat()
new Controller(chat)