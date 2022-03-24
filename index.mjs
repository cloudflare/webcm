import express from 'express'
import { readFileSync } from 'fs'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import { buildClient } from './client.mjs'
import config from './config.json' assert { type: 'json' }
import { get, set } from './kv-storage.mjs'

const ecweb = new EventTarget()

ecweb.set = set
ecweb.get = get

const { target, hostname, port, trackPath } = config

if (process.env.NODE_ENV === 'production') {
  process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
  })
}

for (const mod of config.modules) {
  const tool = await import(`./${mod}/index.mjs`)
  try {
    await tool.default(ecweb)
  } catch (error) {
    console.error('Error loading tool', error)
  }
}

const injectedScript = readFileSync('browser/track.js')
  .toString()
  .replace('TRACK_PATH', trackPath)
const sourcedScript = "console.log('ecweb script is sourced again')"

const app = express()
  .use(express.json())
  .post(trackPath, (req, res, next) => {
    req.fullUrl = target + req.url
    const event = new Event('event')
    event.payload = req.body
    event.client = buildClient(req, res)
    res.payload = {
      fetch: [],
      eval: [],
      return: undefined,
    }
    ecweb.dispatchEvent(event)
    res.end(JSON.stringify(res.payload))
  })
  // s.js TODO
  .get('/sourcedScript', (req, res, next) => {
    res.end(sourcedScript)
  })
  .use('**', (req, res, next) => {
    req.fullUrl = target + req.url
    const settingsWith3pp = {
      target,
      selfHandleResponse: true,
      onProxyRes: responseInterceptor(
        async (responseBuffer, proxyRes, req, res) => {
          const response = responseBuffer.toString('utf8') // convert buffer to string
          const event = new Event('pageview')
          event.client = buildClient(req, res)
          ecweb.dispatchEvent(event)
          return response.replace(
            '<head>',
            `<head><script>${injectedScript}</script>`
          )
        }
      ),
    }
    const proxyWith3pp = createProxyMiddleware(settingsWith3pp)
    proxyWith3pp(req, res, next)
  })

app.listen(port, hostname)
console.info(
  `\n🚀 EC-Web is now proxying ${target} at http://${hostname}:${port}`
)
