import type { Database } from "sqlite"
import type { SocketEvent, Topic, WebSocketInstance } from "../types"
import logger, { Text } from "./logger"

type WSClient = Bun.ServerWebSocket<WebSocketInstance>

export class TopicController {
  topics = new Map<string, Topic>()
  db: Database

  constructor(db: Database) {
    this.db = db
  }

  public async subscribe(topic: string, client: WSClient) {
    try {
      let topicData = this.topics.get(topic)

      if (!topicData) {
        topicData = {
          id: crypto.randomUUID(),
          name: topic,
          messages: [],
          clients: [],
        }

        await this.deleteTopic(topic)
        await this.db.run(`INSERT INTO topics (name) VALUES (?)`, [topic])
        this.topics.set(topic, topicData)
      } else {

        if (!topicData.clients.some(c => c.data.id === client.data.id)) {
          topicData.clients.push(client)
        }
      }

      client.subscribe(topic)
      client.data.topics.add(topic)

      logger([
        Text("GREEN", `${client.data.id}`),
        Text("RESET", `subscribed to: ${topic}`)
      ])
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
    } catch (err) {
      console.error(err)
    }
  }

  public publish(
    topic: string,
    client: WSClient,
    server: Bun.Server,
    event: SocketEvent
  ) {
    try {
      if (client.isSubscribed(topic)) {
        const message = `[${topic}]: ${event.message}`
        server.publish(topic, message)

        logger([
          Text("YELLOW", `${client.data.id}`),
          Text("RESET", `[${topic}]: ${event.message}`)
        ])
      } else {
        client.send(JSON.stringify({ error: `Not subscribed to topic '${topic}'` }))
      }
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
        console.log("topics", this.topics)
        const topicData = this.topics.get(topic)
        console.log("data", topicData)

        if (topicData) {
          topicData.clients = topicData.clients.filter(c => c.data.id !== client.data.id)
          console.log(topicData)

          if (topicData.clients.length === 0) {
            this.deleteTopic(topic)
          }
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
