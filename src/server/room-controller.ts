import type { SocketEvent, WSClient } from "@/types"
import logger, { Text } from "@/lib/logger"
import type { Database } from "sqlite"
import { Room } from "@/types"

export class RoomController {
  rooms = new Map<string, Room>()
  db: Database

  constructor(db: Database) {
    this.db = db
  }

  public async subscribe(room: string | undefined, client: WSClient) {
    try {
      if (!room) throw new Error("No room provided")

      let roomData = this.rooms.get(room)

      if (!roomData) {
        const newRoom = new Room({ name: room })
        const roomInstance = await this.db.get(`SELECT * FROM rooms WHERE name = ?`, [room])

        if (!roomInstance) {
          await this.db.run(`INSERT INTO rooms (name) VALUES (?)`, [room])
        }

        this.rooms.set(room, newRoom)
      } else {

        if (!roomData.clients.some(c => c.data.id === client.data.id)) {
          roomData.clients.push(client)
        }
      }

      client.subscribe(room)
      client.data.rooms.add(room)

      const messages = await this.db.all(`SELECT * FROM messages WHERE room = ? ORDER BY created_at DESC LIMIT 20`, [room])

      logger([
        Text("GREEN", `${client.data.id}`),
        Text("RESET", `subscribed to: ${room}`)
      ])

      client.send(JSON.stringify({
        name: "on_join",
        data: {
          room,
          hash: client.data.id,
          clients: roomData?.clients.map(client => client.data.id) ?? [],
          messages
        }
      }))

      client.publish(room, JSON.stringify({
        name: "on_user_join",
        data: { room, hash: client.data.id }
      }))
    } catch (e) {
      console.error(e)
    }
  }

  public unsubscribe(room: string, client: WSClient) {
    try {
      const roomData = this.rooms.get(room)

      if (roomData) {
        roomData.clients = roomData.clients.filter(c => c.data.id !== client.data.id)
      }

      client.publish(room, JSON.stringify({
        name: "on_user_leave",
        data: { room, hash: client.data.id }
      }))
      client.unsubscribe(room)
      client.data.rooms.delete(room)

      logger([
        Text("RED", `${client.data.id}`),
        Text("RESET", `unsubscribed from ${room}`)
      ])
    } catch (err) {
      console.error(err)
    }
  }

  public async unsubscribeWeb(server: Bun.Server, req: Request, res: Response) {
    try {
      const data = await req.json()
      const roomData = this.rooms.get(data.room!)

      if (roomData) {
        roomData.clients = roomData.clients.filter(c => c.data.id !== data.hash)
      }

      server.publish(data.room!, JSON.stringify({
        name: "on_user_leave",
        data: { room: data.room, hash: data.hash }
      }))

      logger([
        Text("RED", `${data.hash}`),
        Text("RESET", `unsubscribed from ${data.room}`)
      ])
    } catch (err) {
      console.error(err)
    }

    return new Response()
  }

  public async publish(
    event: SocketEvent,
    client: WSClient,
    server: Bun.Server,
  ) {
    try {
      if (!event.room) return

      if (client?.isSubscribed(event.room!)) {
        const message = logger(Text
          ("RESET", `${client.data.id}: ${event.message}`),
          { timestamp: true }
        )

        const chatMessage = {
          user: client.data.id,
          message,
          raw: event.message,
          room: event.room,
          created_at: new Date().getTime()
        }

        server.publish(event.room!, JSON.stringify({
          name: "message",
          data: chatMessage
        }))

        await this.db.run(`INSERT INTO messages (message, user, created_at, room) VALUES (?, ?, ?, ?)`, [
          event.message,
          client.data.id,
          new Date().getTime().toString(),
          event.room
        ])
      } else {
        client.send(JSON.stringify({ error: `Not subscribed to room '${event.room}'` }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  public async listRooms(client: WSClient) {
    try {
      const rooms = await this.db.all(`SELECT * FROM rooms`)
      client.send(JSON.stringify({
        name: "list_rooms",
        data: { rooms }
      }))
    } catch (err) {
      console.error(err)
    }
  }

  public async deleteRoom(room: string) {
    try {
      await this.db.run(`DELETE FROM rooms WHERE name = ?`, [room])
      this.rooms.delete(room)
    } catch (err) {
      console.error(err)
    }
  }

  public close(client: WSClient) {
    try {
      for (const room of client.data.rooms) {
        const roomData = this.rooms.get(room)

        if (roomData) {
          roomData.clients = roomData.clients.filter(c => c.data.id !== client.data.id)
        }
      }

      client.close()

      logger([
        Text("RED", "-"),
        Text("RESET", `${client.data.id} disconnected`)
      ])
    } catch (err) {
      console.error(err)
    }
  }
}
