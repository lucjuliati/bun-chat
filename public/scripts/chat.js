export class Chat {
  constructor() {
    this.input = document.querySelector("#terminal-input")
    this.sendBtn = document.getElementById("send-btn")
    this.dialog = document.querySelector("#dialog")
    this.messageBox = document.querySelector("#message-box")
    this.commandList = document.querySelector(".command-list")
    this.controller = null
    this.input.value = ""

    this.sendBtn?.addEventListener("click", () => this.sendMessage())
    this.input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.sendMessage(e.target.value)
      }
    })

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

  sendMessage() {
    const message = this.input.value.trim()
    this.input.value = ""

    if (message.length === 0) return

    if (message && this.controller.ws && this.controller.ws.readyState === WebSocket.OPEN) {
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
    message.textContent = content

    if (options?.color) {
      message.style.color = options.color
    }

    if (options?.timestamp) {
      const locale = navigator.language ?? "en-US"
      const date = new Date(options.timestamp).toLocaleDateString(locale, {
        month: "long", year: "numeric", day: "numeric", hour: "numeric", minute: "numeric"
      })
      message.title = date
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

    if (connection.isConnected) {
      statusLabel.style.color = "#2db059ff"
      statusLabel.innerHTML = "Connected"
    } else {
      statusLabel.style.color = "tomato"
      statusLabel.innerHTML = "Disconnected"
    }

    if (connection.room) {
      roomLabel.innerHTML = `Room: ${connection.room}`
    } else {
      roomLabel.innerHTML = "Room: None"
    }
  }
}