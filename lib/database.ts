import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'node:path'

async function start() {
  const db = await open({
    filename: path.join(process.cwd(), 'lib', 'data', 'database.db'),
    driver: sqlite3.Database
  }).catch(err => {
    console.error(err)
    process.exit()
  })

  await db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      name TEXT PRIMARY KEY UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      user TEXT NOT NULL,
      created_at TEXT NOT NULL,
      topic TEXT NOT NULL,
      FOREIGN KEY (topic) REFERENCES topics(name)
    );
  `)

  return db
}

export type Database = Awaited<ReturnType<typeof start>>

export default { start }