import express, { RequestHandler } from 'express'
import { IncomingMessage, ServerResponse } from 'http'
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

const handleTrack =
  (manager: ECWeb): RequestHandler =>
  (req, res, _next) => {
    req.fullUrl = target + req.url
    const event = new CustomEvent('event', {
      detail: {
        payload: req.body,
        client: buildClient(req, res, _next),
      },
    })
    res.payload = {
      fetch: [],
      eval: [],
      return: undefined,
    }
    manager.dispatchEvent(event)
    return res.end(JSON.stringify(res.payload))
  }

const handleSystemEvent =
  (manager: ECWeb): RequestHandler =>
  (req, res, _next) => {
    req.fullUrl = target + req.url
    const event = new CustomEvent(req.body.event, {
      detail: {
        payload: req.body.payload,
        client: buildClient(req, res, _next),
      },
    })
    res.payload = {
      fetch: [],
      eval: [],
      return: undefined,
    }
    manager.dispatchEvent(event)
    res.end(JSON.stringify(res.payload))
  }

const handlePageView =
  (manager: ECWeb) => (req: IncomingMessage, res: ServerResponse) => {
    const event = new CustomEvent('pageview', {
      detail: {
        // TODO this is gross - should it even work?
        client: buildClient(req as any, res as any, null as any),
      },
    })
    manager.dispatchEvent(event)
  }

const app = express()
  .use(express.json())
  .post(trackPath, handleTrack(ecWeb))
  .post(systemEventsPath, handleSystemEvent(ecWeb))
  // s.js TODO
  .get('/sourcedScript', (req, res, next) => {
    res.end(ecWeb.sourcedScript)
  })
  .use('**', (req, res, next) => {
    req.fullUrl = target + req.url
    const proxySettings = {
      target,
      changeOrigin: true,
      selfHandleResponse: true,
      onProxyRes: responseInterceptor(
        async (responseBuffer, proxyRes, req, res) => {
          const response = responseBuffer.toString('utf8') // convert buffer to string
          handlePageView(ecWeb)(req, res)
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
