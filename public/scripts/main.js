
const chatWindow = document.getElementById("chat-window")
const input = document.querySelector("#terminal-input")
const sendBtn = document.getElementById("send-btn")
const env = document.querySelector("meta[name='env']")?.getAttribute("content")
const dialog = document.querySelector("#dialog")
const status = document.querySelector(".status-box")

sendBtn?.addEventListener("click", sendMessage)

input?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage(e.target.value)
  }
})

function sendMessage() {
  const message = input.value.trim()
  console.log(message)

  showDialog("title", message)

  if (message.length == 0) return

  if (message && ws && ws.readyState === WebSocket.OPEN) {
    if (message.startsWith("/")) {
      handleCommand(message)
    } else {
      const event = { action: "publish", room, message }
      ws.send(JSON.stringify(event))
      input.value = ""
    }
  }
}

function showDialog(title, content) {
  const titleElement = dialog.querySelector(".dialog-title")
  const contentElement = dialog.querySelector(".dialog-content")
  titleElement.textContent = title
  contentElement.textContent = content
  dialog.showModal()
}

if (env === "development") {
  const script = document.createElement("script")
  script.src = "scripts/tests.js"
  document.body.appendChild(script)
}