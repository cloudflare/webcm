import express from 'express'
import { Server } from 'http'
import path from 'path'

export class StaticServer {
  private app: ReturnType<typeof express>
  private server: Server | null
  constructor(private port: number = 3000) {
    this.app = express()
    this.server = null
    this.app.use(express.static(path.resolve(__dirname, '../assets')))
  }

  start() {
    if (!this.server) {
      this.server = this.app.listen(this.port)
    }
  }

  stop() {
    this.server?.close()
  }
}
