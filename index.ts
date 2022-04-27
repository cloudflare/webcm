import express, { Request, RequestHandler } from 'express'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import config from './config.json'
import { ManagerGeneric } from './lib/manager'
import { Client, ClientGeneric } from './lib/client'

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
} = config

const target = process.env.CM_TARGET_URL || configTarget

const manager = new ManagerGeneric({ components, trackPath, systemEventsPath })

const handleTrack: RequestHandler = (req, res) => {
  const clientGeneric = new ClientGeneric(req, res, manager)
  const event = new Event('event')
  event.payload = req.body.payload
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  manager.dispatchEvent(event)
  return res.end(JSON.stringify(res.payload))
}

const handleSystemEvent: RequestHandler = (req, res) => {
  const clientGeneric = new ClientGeneric(req, res, manager)
  const event = new Event(req.body.event)
  event.payload = req.body.payload
  for (const component of Object.entries(clientGeneric.webcmPrefs.listeners)
    .filter((x: any) => x[1].includes(req.body.event))
    .map(x => x[0])) {
    event.client = new Client(component, clientGeneric)
    try {
      manager.clientListeners[req.body.event + '__' + component](event)
    } catch {
      console.error(
        `Dispatching ${req.body.event} to component ${component} but it isn't registered`
      )
    }
  }
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  manager.dispatchEvent(event)
  res.end(JSON.stringify(res.payload))
}

const handlePageView = (
  req: Request,
  res: any,
  clientGeneric: ClientGeneric
) => {
  const pageview = new Event('pageview')
  pageview.payload = req.body.payload
  // pageview.client = client
  if (!clientGeneric.cookies.get('webcm_prefs')) {
    const clientcreated = new Event('clientcreated')
    for (const componentName of manager.components) {
      const event = new Event(componentName + '__clientcreated')
      event.client = new Client(componentName as string, clientGeneric)
      manager.dispatchEvent(event)
    }
  }
  manager.dispatchEvent(pageview)
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
    // req.fullUrl = target + req.url
    const clientGeneric = new ClientGeneric(req, res, manager)
    const proxySettings = {
      target,
      changeOrigin: true,
      selfHandleResponse: true,
      onProxyRes: responseInterceptor(
        async (responseBuffer, proxyRes, req, _res) => {
          if (
            proxyRes.headers['content-type']
              ?.toLowerCase()
              .includes('text/html')
          ) {
            handlePageView(req as Request, res, clientGeneric)
            let response = responseBuffer.toString('utf8')
            response = await manager.processEmbeds(response, clientGeneric)
            return response.replace(
              '<head>',
              `<head><script>${manager.getInjectedScript(
                clientGeneric
              )}</script>`
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
