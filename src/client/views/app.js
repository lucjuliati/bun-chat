const roomSelection = document.getElementById("room-selection")
const chatWindow = document.getElementById("chat-window")
const roomInput = document.getElementById("room-input")
const joinBtn = document.getElementById("join-btn")
const messagesDiv = document.getElementById("messages")
const messageInput = document.getElementById("message-input")
const sendBtn = document.getElementById("send-btn")

let ws
let topic

function showChat() {
  roomSelection.classList.add("hidden")
  chatWindow.classList.remove("hidden")
}

joinBtn.addEventListener("click", () => {
  topic = roomInput.value.trim()
  if (!topic) {
    alert("Please enter a room name.")
    return
  }

  // Note: Using 'ws' protocol because we are connecting from the browser.
  // The server is on localhost:4000.
  ws = new WebSocket(`ws://localhost:4000/ws`)

  ws.onopen = () => {
    console.log("Connected to WebSocket server")
    const event = { action: "subscribe", topic }
    ws.send(JSON.stringify(event))
    showChat()
  }

  ws.onmessage = (event) => {
    const eventData = JSON.parse(event.data)
    if (eventData.message) {
      const messageElement = document.createElement("div")
      messageElement.textContent = eventData.message
      messagesDiv.appendChild(messageElement)
      messagesDiv.scrollTop = messagesDiv.scrollHeight
    }
  }

  ws.onclose = () => {
    console.log("Disconnected from WebSocket server")
    alert("Connection lost. Please refresh.")
  }

  ws.onerror = (error) => {
    console.error("WebSocket error:", error)
  }
})

function sendMessage() {
  const message = messageInput.value.trim()
  if (message && ws && ws.readyState === WebSocket.OPEN) {
    const event = { action: "publish", topic, message }
    ws.send(JSON.stringify(event))
    messageInput.value = ""
  }
}

sendBtn.addEventListener("click", sendMessage)
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage()
  }
})