import type { Widgets } from "blessed"

const message: Widgets.BoxOptions = {
  top: 0,
  left: 0,
  width: "75%",
  height: "90%",
  scrollable: true,
  alwaysScroll: true,
  content: "Use /rooms to list available rooms or /join to join/create a room",
  tags: true,
  border: { type: "bg" },
  style: {
    fg: "white",
    border: { fg: "cyan" }
  }
}

const input: Widgets.BoxOptions = {
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
}

const status: Widgets.BoxOptions = {
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
}

const commands: Widgets.BoxOptions = {
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

export default { message, status, input, commands }