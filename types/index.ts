export type WebSocketInstance = {
  id: string
  rooms: Set<string>
}

export type WebSocketAction = {
  action: "subscribe" | "unsubscribe" | "list_rooms" | "publish" | "quit"
  room?: string
  message?: string
}

export type WSClient = Bun.ServerWebSocket<WebSocketInstance>

export type Connection = {
  isConnected: boolean
  room?: string
  hash?: string
  history?: ChatMessage[]
}
export class Room {
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
  room: string
  message?: string
}

export type ServerEvent = {
  name: string
  data?: unknown
}

export type ChatMessage = {
  user: string
  message: string
  room: string
  created_at: number
}