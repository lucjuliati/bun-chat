export type WebSocketInstance = {
  id: string
  topics: Set<string>
}

export type Topic = {
  id: string
  name: string
  messages: string[]
  clients: Bun.ServerWebSocket<WebSocketInstance>[],
}

export type SocketEvent = {
  action: "subscribe" | "unsubscribe" | "publish"
  topic: string
  message?: string
}

export type ServerEvent = {
  name: string
  data?: unknown
}