import express, { Request, RequestHandler, Response } from 'express'
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

const { target, hostname, port, trackPath, systemEventsPath, modules } = config

const ecWeb = new ECWeb({ modules, trackPath, systemEventsPath })

const handleTrack = (req: Request, res: Response) => {
  req.fullUrl = target + req.url
  const event = new Event('event')
  event.payload = req.body.payload
  event.client = buildClient(req, res)
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  ecWeb.dispatchEvent(event)
  return res.end(JSON.stringify(res.payload))
}

const handleSystemEvent = (req: Request, res: Response) => {
  req.fullUrl = target + req.url
  const event = new Event(req.body.event)
  event.payload = req.body.payload
  event.client = buildClient(req, res)
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  ecWeb.dispatchEvent(event)
  res.end(JSON.stringify(res.payload))
}

const handlePageView = (req: Request, res: Response) => {
  const event = new Event('pageview')
  event.payload = req.body.payload
  event.client = buildClient(req, res)
  ecWeb.dispatchEvent(event)
}

const app = express()
  .use(express.json())
  .post(trackPath, handleTrack)
  .post(systemEventsPath, handleSystemEvent)
  // s.js TODO
  .get('/sourcedScript', (_req, res) => {
    res.end(ecWeb.sourcedScript)
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
          handlePageView(req as any, res as any) // TODO do we have a problem here??
          return response.replace(
            '<head>',
            `<head><script>${ecWeb.getInjectedScript()}</script>`
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
