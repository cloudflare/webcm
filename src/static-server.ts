import express from 'express'
import { Server } from 'http'
import path from 'path'
import _locreq from "locreq";
const locreq = _locreq(__dirname);

export class StaticServer {
  private app: ReturnType<typeof express>
  private server: Server | null
  constructor(private port: number = 3000) {
    this.app = express()
    this.server = null
    console.log("SERVING", locreq.resolve( 'assets'));
    this.app.use(express.static(locreq.resolve( 'assets')))
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
