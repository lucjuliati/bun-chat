import database from "@/lib/database"
import logger, { Text } from "@/lib/logger"
import type { WebSocketInstance } from "@/types"
import { EventHandler } from "./event-handler"
import { handleFetch } from "./routes"

export async function startServer(port = 4000): Promise<Bun.Server> {
  const db = await database.start()
  const eventHandler = new EventHandler(db)

  const server = Bun.serve<WebSocketInstance, {}>({
    port,
    fetch: handleFetch,
    routes: {
      "/close": {
        POST: (req: Request, res: Response) => eventHandler.unsubscribeWeb(server, req, res)
      }
    },
    websocket: {
      async message(ws, message) {
        eventHandler.handle(server, ws, message.toString())
      },
      open(ws) {
        logger([Text("GREEN", "+"), Text("RESET", `${ws.data.id} connected`)])
      },
      close(ws) {
        eventHandler.close(ws)
      },
    },
  })

  return server
}

if (import.meta.main) {
  const server = await startServer()
  console.info(`Listening on :${server.port}`)
}