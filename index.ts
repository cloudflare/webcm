import express, { RequestHandler } from 'express'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import config from './config.json'
import { ECWeb } from './lib'
import { buildClient } from './lib/client'

if (process.env.NODE_ENV === 'production') {
  process.on('unhandledRejection', reason => {
    console.log('Unhandled Rejection at:', (reason as any).stack || reason)
  })
}

const { target, hostname, port, trackPath, systemEventsPath, components } =
  config

const manager = new ECWeb({ components, trackPath, systemEventsPath })

const handleTrack: RequestHandler = (req, res) => {
  req.fullUrl = target + req.url
  const event = new Event('event')
  event.payload = req.body.payload
  event.client = buildClient(req, res)
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  manager.dispatchEvent(event)
  return res.end(JSON.stringify(res.payload))
}

const handleSystemEvent: RequestHandler = (req, res) => {
  req.fullUrl = target + req.url
  const event = new Event(req.body.event)
  event.payload = req.body.payload
  event.client = buildClient(req, res)
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  manager.dispatchEvent(event)
  res.end(JSON.stringify(res.payload))
}

const handlePageView: RequestHandler = (req, res) => {
  const event = new Event('pageview')
  event.payload = req.body.payload
  event.client = buildClient(req, res)
  manager.dispatchEvent(event)
}

const app = express()
  .use(express.json())
  .post(trackPath, handleTrack)
  .post(systemEventsPath, handleSystemEvent)
  // s.js TODO
  .get('/sourcedScript', (_req, res) => {
    res.end(manager.sourcedScript)
  })
  .use('**', (req, res, next) => {
    req.fullUrl = target + req.url
    const proxySettings = {
      target,
      changeOrigin: true,
      selfHandleResponse: true,
      onProxyRes: responseInterceptor(
        async (responseBuffer, _proxyRes, req, res) => {
          const response = responseBuffer.toString('utf8') // convert buffer to string
          handlePageView(req as any, res as any, next) // TODO do we have a problem here??
          return response.replace(
            '<head>',
            `<head><script>${manager.getInjectedScript()}</script>`
          )
        }
      ),
    }
    const proxy = createProxyMiddleware(proxySettings)
    proxy(req, res, next)
  })

app.listen(port, hostname)
console.info(
  `\n🚀 EC-Web is now proxying ${target} at http://${hostname}:${port}`
)

export {}
