
let ws
let room

ws = new WebSocket(`ws://localhost:4000`)

ws.onopen = () => {
  // console.log("Connected to WebSocket server")
  // const event = { action: "subscribe", room: "1" }
  // ws.send(JSON.stringify(event))
}

ws.onmessage = (event) => {
  const eventData = JSON.parse(event.data)
  console.log(eventData)
  if (eventData.message) {
    // const message = document.createElement("div")
    // message.textContent = eventData.message
    // messagesDiv.appendChild(message)
    // messagesDiv.scrollTop = messagesDiv.scrollHeight
  }
}

ws.onclose = () => {
  console.log("Disconnected from WebSocket server")
}

ws.onerror = (error) => {
  console.error("WebSocket error:", error)
}

window.addEventListener("beforeunload", () => ws.close())

function handleCommand(command) {
  let args = command.split(" ")
  command = args[0]
  args.shift()

  console.log(command, args)

  if (command === "/join") {
    if (!args[0]) return

    ws.send(JSON.stringify({ action: "subscribe", room: args[0] }))
  } else if (command === "/leave" || command === "/exit") {
    ws.send(JSON.stringify({ action: "unsubscribe", room: args[0] }))
  } else if (command === "/clear") {
    chatWindow.innerHTML = ""
    input?.focus()
  }
}