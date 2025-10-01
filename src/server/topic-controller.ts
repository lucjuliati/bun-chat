import type { SocketEvent, WebSocketInstance } from "@/types"
import logger, { Text } from "@/lib/logger"
import type { Database } from "sqlite"
import { Topic } from "@/types"

type WSClient = Bun.ServerWebSocket<WebSocketInstance>

export class TopicController {
  topics = new Map<string, Topic>()
  db: Database

  constructor(db: Database) {
    this.db = db
  }

  public async subscribe(topic: string | undefined, client: WSClient) {
    try {
      if (!topic) throw new Error("No topic provided")

      let topicData = this.topics.get(topic)

      if (!topicData) {
        const newTopic = new Topic({ name: topic })
        const topicInstance = await this.db.get(`SELECT * FROM topics WHERE name = ?`, [topic])

        if (!topicInstance) {
          await this.db.run(`INSERT INTO topics (name) VALUES (?)`, [topic])
        }

        this.topics.set(topic, newTopic)
      } else {

        if (!topicData.clients.some(c => c.data.id === client.data.id)) {
          topicData.clients.push(client)
        }
      }

      client.subscribe(topic)
      client.data.topics.add(topic)

      const messages = await this.db.all(`SELECT * FROM messages WHERE topic = ? ORDER BY created_at DESC LIMIT 20`, [topic])

      logger([
        Text("GREEN", `${client.data.id}`),
        Text("RESET", `subscribed to: ${topic}`)
      ])

      client.send(JSON.stringify({
        name: "on_join",
        data: {
          topic,
          hash: client.data.id,
          clients: topicData?.clients.map(client => client.data.id) ?? [],
          messages
        }
      }))

      client.publish(topic, JSON.stringify({
        name: "on_user_join",
        data: { topic, hash: client.data.id }
      }))
    } catch (e) {
      console.error(e)
    }
  }

  public unsubscribe(topic: string, client: WSClient) {
    try {
      const topicData = this.topics.get(topic)

      if (topicData) {
        topicData.clients = topicData.clients.filter(c => c.data.id !== client.data.id)
      }

      client.unsubscribe(topic)
      client.data.topics.delete(topic)
      client.send(JSON.stringify({ status: "unsubscribed", topic }))
      logger([
        Text("RED", `${client.data.id}`),
        Text("RESET", `unsubscribed from ${topic}`)
      ])

      client.publish(topic, JSON.stringify({
        name: "on_user_join",
        data: { topic, hash: client.data.id }
      }))
    } catch (err) {
      console.error(err)
    }
  }

  public async publish(
    topic: string | undefined,
    client: WSClient,
    server: Bun.Server,
    event: SocketEvent
  ) {
    try {
      if (!topic) return

      if (client?.isSubscribed(topic!)) {
        const message = logger(Text
          ("RESET", `${client.data.id}: ${event.message}`),
          { timestamp: true }
        )

        const chatMessage = {
          user: client.data.id,
          message,
          topic,
          created_at: new Date().getTime()
        }

        server.publish(topic!, JSON.stringify({
          name: "message",
          data: chatMessage
        }))

        await this.db.run(`INSERT INTO messages (message, user, created_at, topic) VALUES (?, ?, ?, ?)`, [
          event.message,
          client.data.id,
          new Date().getTime().toString(),
          topic
        ])
      } else {
        client.send(JSON.stringify({ error: `Not subscribed to topic '${topic}'` }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  public async listRooms(client: WSClient) {
    try {
      const topics = await this.db.all(`SELECT * FROM topics`)
      client.send(JSON.stringify({
        name: "list_rooms",
        data: { topics }
      }))
    } catch (err) {
      console.error(err)
    }
  }

  public async deleteTopic(topic: string) {
    try {
      await this.db.run(`DELETE FROM topics WHERE name = ?`, [topic])
      this.topics.delete(topic)
      console.log(`Deleted topic: ${topic}`)
    } catch (err) {
      console.error(err)
    }
  }

  public close(client: WSClient) {
    try {
      for (const topic of client.data.topics) {
        const topicData = this.topics.get(topic)

        if (topicData) {
          topicData.clients = topicData.clients.filter(c => c.data.id !== client.data.id)
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
