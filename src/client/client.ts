import type { Connection, WebSocketAction } from "@/types"
import { EventHandler } from "./event-handler"
import { logError } from "@/lib/logger"
import { UI } from "./ui"

export class Client {
  private ws: WebSocket
  private ui: UI
  private eventHandler: EventHandler
  private connection: Connection = {
    isConnected: false,
    room: undefined,
  }

  constructor(wsUrl: string) {
    this.ws = new WebSocket(wsUrl)
    this.ui = new UI(this.connection, this.sendAction.bind(this))
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    this.eventHandler = new EventHandler(this.ui, this.connection, locale)

    this.setupWebSocket()
    this.setupProcessHooks()
  }

  public start() {
    this.ui.render()
  }

  private sendAction(action: WebSocketAction) {
    if (action.action === "quit") {
      this.shutdown()
      return
    }
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(action))
    }
  }

  private setupWebSocket() {
    this.ws.onmessage = ({ data }) => {
      try {
        const event = JSON.parse(data as string)
        this.eventHandler.handle(event)
      } catch (error) {
        this.ui.write(logError("Received malformed data from server."))
      }
    }

    this.ws.onclose = (event) => {
      if (event.code === 1006) {
        this.ui.write(logError(`Connection error: ${event.reason}`))
      }
      this.ui.updateStatus(false)
      this.shutdown()
    }
  }

  private setupProcessHooks() {
    process.on("SIGINT", () => this.shutdown())
  }

  private shutdown(exitCode: number = 0) {
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close()
    }
    process.exit(exitCode)
  }
}