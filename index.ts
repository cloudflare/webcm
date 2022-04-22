import express, { Request, Response, RequestHandler } from 'express'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import config from './config.json'
import { Manager } from './lib'
import { MCClient } from './lib/client'

if (process.env.NODE_ENV === 'production') {
  process.on('unhandledRejection', reason => {
    console.log('Unhandled Rejection at:', (reason as any).stack || reason)
  })
}

const {
  target: configTarget,
  hostname,
  port,
  trackPath,
  systemEventsPath,
  components,
  CM_CLIENT_TOKEN_NAME,
} = config

const target = process.env.CM_TARGET_URL || configTarget

const manager = new Manager({
  components,
  trackPath,
  systemEventsPath,
  CM_CLIENT_TOKEN_NAME,
})

const handleTrack: RequestHandler = (req, res) => {
  req.fullUrl = target + req.url
  const event = new Event('event')
  event.payload = req.body.payload
  event.client = new MCClient({
    req,
    res,
    TOKEN_NAME: manager.CM_CLIENT_TOKEN_NAME,
  })
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  event.client.dispatchEvent(event)
  return res.end(JSON.stringify(res.payload))
}

const handleSystemEvent: RequestHandler = (req, res) => {
  req.fullUrl = target + req.url
  const event = new Event(req.body.event)
  event.payload = req.body.payload
  event.client = new MCClient({
    req,
    res,
    TOKEN_NAME: manager.CM_CLIENT_TOKEN_NAME,
  })
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  event.client.dispatchEvent(event)
  res.end(JSON.stringify(res.payload))
}

const handlePageView = (req: Request, client: MCClient) => {
  const event = new Event('pageview')
  event.payload = req.body.payload
  event.client = client
  client.dispatchEvent(event)
}

const handleNewClients = (req: Request, res: Response, client: MCClient) => {
  if (client.get(manager.CM_CLIENT_TOKEN_NAME)) return
  client.set(manager.CM_CLIENT_TOKEN_NAME, {})

  // TODO - how do we prevent the override of client at the component instance level causing problems during a request
  // i.e. the client might change while a previous request (and instance) is still be processed. 🤔
  manager.componentInstances.forEach(component => component.setClient(client))
}

const app = express()
  .use(express.json())
  .post(trackPath, handleTrack)
  .post(systemEventsPath, handleSystemEvent)
  .get('/sourcedScript', (_req, res) => {
    res.end(manager.sourcedScript) // TODO
  })
  .use('**', (req, res, next) => {
    req.fullUrl = target + req.url
    const client = new MCClient({
      req,
      res,
      TOKEN_NAME: manager.CM_CLIENT_TOKEN_NAME,
    })
    const proxySettings = {
      target,
      changeOrigin: true,
      selfHandleResponse: true,
      onProxyRes: responseInterceptor(
        async (responseBuffer, proxyRes, req, res) => {
          if (
            proxyRes.headers['content-type']
              ?.toLowerCase()
              .includes('text/html')
          ) {
            handleNewClients(req as Request, res as Response, client)
            handlePageView(req as Request, client)
            let response = responseBuffer.toString('utf8')
            response = await manager.processEmbeds(response, client)
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
