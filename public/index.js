
const chatWindow = document.getElementById("chat-window")
const input = document.getElementById("room-input")
const messagesDiv = document.getElementById("messages")
const messageInput = document.getElementById("message-input")
const sendBtn = document.getElementById("send-btn")

let ws
let topic

ws = new WebSocket(`ws://localhost:4000`)

ws.onopen = () => {
  // console.log("Connected to WebSocket server")
  // const event = { action: "subscribe", topic: "1" }
  // ws.send(JSON.stringify(event))
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

function sendMessage() {
  const message = messageInput.value.trim()
  if (message && ws && ws.readyState === WebSocket.OPEN) {
    const event = { action: "publish", topic, message }
    ws.send(JSON.stringify(event))
    messageInput.value = ""
  }
}

// sendBtn.addEventListener("click", sendMessage)
// messageInput.addEventListener("keypress", (e) => {
//   if (e.key === "Enter") {
//     sendMessage()
//   }
// })