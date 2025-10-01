export type WebSocketInstance = {
  id: string
  topics: Set<string>
}

export type WebSocketAction = {
  action: "subscribe" | "unsubscribe" | "list_rooms" | "publish" | "quit"
  topic?: string
  message?: string
}

export type Connection = {
  isConnected: boolean
  topic?: string
  hash?: string
  history?: ChatMessage[]
}
export class Topic {
  id: string
  name: string
  messages: string[] = []
  clients: Bun.ServerWebSocket<WebSocketInstance>[] = []

  constructor({ name }: { name: string }) {
    this.id = crypto.randomUUID()
    this.name = name
    this.messages = []
    this.clients = []
  }
}

export type SocketEvent = {
  action: "subscribe" | "unsubscribe" | "list_rooms" | "publish"
  topic: string
  message?: string
}

export type ServerEvent = {
  name: string
  data?: unknown
}

export type ChatMessage = {
  user: string
  message: string
  topic: string
  created_at: number
}