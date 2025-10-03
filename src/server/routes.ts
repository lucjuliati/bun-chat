import fs from "fs"
import * as cheerio from "cheerio"
import { file } from "bun"
import { contentType } from "../utils"

export async function handleFetch(req: Request, server: Bun.Server) {
  const id = crypto.randomUUID().slice(0, 13)
  const data = { id, rooms: new Set() }
  const upgrade = server.upgrade(req, { data })
  try {
    if (upgrade) return

    const url = new URL(req.url)
    let path = `./public${url.pathname}`

    if (url.pathname === "/") {
      path = "./public/index.html"
      const html = fs.readFileSync("./public/index.html", "utf8")
      const $ = cheerio.load(html)

      if (Bun.env.ENV == "development") {
        $("head").append('<meta name="env" content="development">')
      }

      return new Response($.html(), {
        headers: { "Content-Type": "text/html" }
      })
    } else {
      return new Response(await file(path).arrayBuffer(), {
        headers: { "Content-Type": contentType(path) }
      })
    }
  } catch {
    return new Response("404 Not Found", { status: 404 })
  }
}
