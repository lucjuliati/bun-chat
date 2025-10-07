const locale = navigator.language ?? "en-US"

export class Chat {
  constructor() {
    this.input = document.querySelector("#terminal-input")
    this.sendBtn = document.getElementById("send-btn")
    this.dialog = document.querySelector("#dialog")
    this.messageBox = document.querySelector("#message-box")
    this.commandList = document.querySelector(".command-list")
    this.controller = null
    this.input.value = ""
    this.history = []
    this.historyIndex = -1
    this.tempInput = ""

    this.sendBtn?.addEventListener("click", () => this.sendMessage())
    this.input?.addEventListener("keydown", (e) => this.handleKeyDown(e))

    this.dialog.addEventListener("click", (e) => {
      const rect = this.dialog.getBoundingClientRect()
      const isInDialog =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      if (!isInDialog) {
        this.dialog.close()
      }
    })

    document.querySelector(".dialog-close").addEventListener("click", () => {
      this.dialog.close()
    })

    window.addEventListener("keydown", (e) => {
      if (document.activeElement !== this.input) {
        this.input.focus()
      }
    })

    this.commandList.querySelectorAll("p").forEach(p => {
      p.addEventListener("click", () => {
        this.input.value = p.textContent + ' '
        this.input.focus()
      })
    })
  }

  setController(controller) {
    this.controller = controller
  }

  handleKeyDown(e) {
    if (e.key === "Enter") {
      this.sendMessage()
      return
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()

      if (this.history.length === 0) return

      if (this.historyIndex === -1) {
        this.tempInput = this.input.value
      }

      if (e.key === "ArrowUp") {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++
        }
      } else if (e.key === "ArrowDown") {
        if (this.historyIndex > -1) {
          this.historyIndex--
        }
      }

      if (this.historyIndex === -1) {
        this.input.value = this.tempInput
      } else {
        const msg = this.history[this.history.length - 1 - this.historyIndex]
        this.input.value = msg
      }

      this.input.setSelectionRange(this.input.value.length, this.input.value.length)
    }
  }

  sendMessage() {
    let message = this.input.value.trim()
    this.input.value = ""

    if (message.length === 0) return

    this.history.push(message)
    this.history = Array.from(new Set([...this.history, message]))
    this.historyIndex = -1
    this.tempInput = ""

    if (this.controller.ws.readyState !== WebSocket.OPEN) {
      this.write("You aren't connected to the server!", { color: "tomato" })
      return
    }

    if (message.length > 150) {
      message = message.slice(0, 150)
    }

    if (message && this.controller.ws) {
      if (message.startsWith("/")) {
        this.controller.handleCommand(message)
        return
      }

      if (!this.controller.connection.room) {
        this.write("You must join a room first!", { color: "tomato" })
        return
      }

      const event = { action: "publish", room: this.controller.connection.room, message }
      this.controller.ws.send(JSON.stringify(event))
      this.input.value = ""
    }
  }

  write(content, options) {
    const message = document.createElement("div")

    if (options?.color) {
      message.style.color = options.color
    }

    if (options?.timestamp) {
      message.title = new Date(options.timestamp).toLocaleDateString(locale, {
        month: "long", year: "numeric", day: "numeric", hour: "numeric", minute: "numeric"
      })
    }

    if (options?.chat) {
      const user = document.createElement("span")
      const text = document.createElement("span")
      const timestamp = document.createElement("span")
      const date = new Date(options.timestamp).toLocaleTimeString(locale, {
        hour: '2-digit', minute: '2-digit'
      })

      if (options.chat?.me == options.chat?.user) {
        user.style.color = "orange"
      }

      user.innerHTML = options.chat.user
      text.innerHTML = `: ${options.chat?.message}`
      timestamp.innerHTML = `[${date}] `
      message.appendChild(timestamp)
      message.appendChild(user)
      message.appendChild(text)
    } else {
      message.textContent = content
    }

    this.messageBox.appendChild(message)
    this.messageBox.scrollTop = this.messageBox.scrollHeight
  }

  showDialog(title, content) {
    const titleElement = this.dialog.querySelector(".dialog-title")
    const contentElement = this.dialog.querySelector(".dialog-content")
    titleElement.textContent = title
    contentElement.textContent = content
    this.dialog.showModal()
  }

  updateStatus(connection) {
    const statusItem = document.querySelector(".status-box")
    const statusLabel = statusItem.querySelector("#status")
    const roomLabel = statusItem.querySelector("#room")
    const hash = document.querySelector("#hash")

    if (connection.isConnected) {
      statusLabel.style.color = "#2db059ff"
      statusLabel.innerHTML = "Connected"
      hash.innerHTML = `Hash: ${connection.hash}`
    } else {
      statusLabel.style.color = "tomato"
      statusLabel.innerHTML = "Disconnected"
      hash.innerHTML = ""
    }

    if (connection.room) {
      roomLabel.innerHTML = `Room: ${connection.room}`
    } else {
      roomLabel.innerHTML = "Room: None"
    }
  }
}
