import express, { RequestHandler } from 'express'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import config from './config.json'
import { Manager } from './lib'
import { buildClient } from './lib/client'

if (process.env.NODE_ENV === 'production') {
  process.on('unhandledRejection', reason => {
    console.log('Unhandled Rejection at:', (reason as any).stack || reason)
  })
}

const { target, hostname, port, trackPath, systemEventsPath, components } =
  config

const manager = new Manager({ components, trackPath, systemEventsPath })

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

const handlePageView = (req: Request, res: any, client: any) => {
  const event = new Event('pageview')
  event.payload = req.body.payload
  event.client = client
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
    const client = buildClient(req, res)
    const proxySettings = {
      target,
      changeOrigin: true,
      selfHandleResponse: true,
      onProxyRes: responseInterceptor(
        async (responseBuffer, proxyRes, req, res) => {
          if (proxyRes.headers['content-type'] === 'text/html') {
            handlePageView(req as any, res as any, client as any) // TODO do we have a problem here??
            let response = responseBuffer.toString('utf8') // convert buffer to string
            response = manager.processEmbeds(response, client)
            return response.replace(
              '<head>',
              `<head><script>${manager.getInjectedScript()}</script>`
            )
          }
          return responseBuffer
        }
      ),
    }
    const proxy = createProxyMiddleware(proxySettings)
    proxy(req, res, next)
  })

app.listen(port, hostname)
console.info(
  `\n🚀 WebCM is now proxying ${target} at http://${hostname}:${port}`
)

export {}
