import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startServer } from "../src/server"
import type { Server } from "bun"

describe("Server", () => {
  let server: Server
  const port = 0

  beforeAll(async () => {
    server = await startServer(port)
  })

  afterAll(() => {
    server.stop()
  })

  test("GET / should return index.html", async () => {
    const res = await fetch(`http://localhost:${server.port}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toStartWith("text/html")
    const text = await res.text()
    expect(text).toStartWith("<!DOCTYPE html>")
  })

  test("GET /style.css should return CSS file", async () => {
    const res = await fetch(`http://localhost:${server.port}/style.css`)
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toStartWith("text/css")
  })

  test("GET /non-existent-file should return 404", async () => {
    const res = await fetch(
      `http://localhost:${server.port}/non-existent-file.js`,
    )
    expect(res.status).toBe(404)
  })

  describe("WebSocket", () => {
    test("should handle subscribe and publish", async () => {
      const room = "test-room"
      const testMessage = "Hello, world!"

      const ws = new WebSocket(`ws://localhost:${server.port}`)

      await new Promise<void>((resolve) => (ws.onopen = () => resolve()))

      ws.send(JSON.stringify({ action: "subscribe", room }))

      const joinMessage = await new Promise<any>((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data.toString())
          if (data.name === "on_join") {
            resolve(data)
          }
        }
      })

      expect(joinMessage.data.room).toBe(room)
      expect(joinMessage.data.hash).toBeString()

      ws.send(
        JSON.stringify({
          action: "publish",
          room,
          message: testMessage
        }),
      )

      const publishedMessage = await new Promise<any>((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data.toString())
          if (data.name === "message") {
            resolve(data)
          }
        }
      })

      expect(publishedMessage.data.room).toBe(room)
      expect(publishedMessage.data.message).toInclude(testMessage)
      expect(publishedMessage.data.user).toBe(joinMessage.data.hash)

      ws.close()
    })
  })
})