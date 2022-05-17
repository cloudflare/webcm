import express, { Request, RequestHandler } from 'express'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import config from './config.json'
import { Client, ClientGeneric } from './lib/client'
import { ManagerGeneric, MCEvent, MCEventListener } from './lib/manager'

if (process.env.NODE_ENV === 'production') {
  process.on('unhandledRejection', (reason: Error) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
  })
}

const {
  target: configTarget,
  hostname,
  port,
  trackPath,
  clientEventsPath,
  components,
} = config as any

const target = process.env.CM_TARGET_URL || configTarget

const manager = new ManagerGeneric({
  components,
  trackPath,
  clientEventsPath,
})

const handleTrack: RequestHandler = (req, res) => {
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  const event = new MCEvent('event', req)
  const clientGeneric = new ClientGeneric(req, res, manager)
  for (const componentName of Object.keys(manager.listeners['event'])) {
    event.client = new Client(componentName, clientGeneric)
    manager.listeners['event'][componentName].forEach((fn: MCEventListener) =>
      fn(event)
    )
  }
  return res.end(JSON.stringify(res.payload))
}

// TODO handle ecommerce events separately

const handleClientEvent: RequestHandler = (req, res) => {
  const event = new MCEvent(req.body.payload.event, req)
  const clientGeneric = new ClientGeneric(req, res, manager)
  const clientComponentNames = Object.entries(
    clientGeneric.webcmPrefs.listeners
  )
    .filter(([, events]) => events.includes(req.body.payload.event))
    .map(([componentName]) => componentName)
  for (const component of clientComponentNames) {
    event.client = new Client(component, clientGeneric)
    try {
      manager.clientListeners[req.body.payload.event + '__' + component](event)
    } catch {
      console.error(
        `Error dispatching ${req.body.payload.event} to ${component}: it isn't registered`
      )
    }
  }
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  res.end(JSON.stringify(res.payload))
}

const handlePageView = (req: Request, clientGeneric: ClientGeneric) => {
  const pageview = new MCEvent('pageview', req)
  if (!clientGeneric.cookies.get('webcm_prefs')) {
    for (const componentName of Object.keys(manager.listeners['pageview'])) {
      const event = new MCEvent('clientcreated', req)
      event.client = new Client(componentName as string, clientGeneric)
      manager.listeners['clientcreated'][componentName].forEach(
        (fn: MCEventListener) => fn(event)
      )
    }
  }
  for (const componentName of Object.keys(manager.listeners['pageview'])) {
    pageview.client = new Client(componentName, clientGeneric)
    manager.listeners['pageview'][componentName].forEach(
      (fn: MCEventListener) => fn(pageview)
    )
  }
}

const app = express().use(express.json())

// Mount WebCM endpoint
app
  .post(trackPath, handleTrack)
  .post(clientEventsPath, handleClientEvent)
  // s.js TODO
  .get('/sourcedScript', (_req, res) => {
    res.end(manager.sourcedScript)
  })

// Mount components endpoints
for (const route of Object.keys(manager.mappedEndpoints)) {
  app.all(route, async (req, res) => {
    const response = manager.mappedEndpoints[route](req)
    for (const [headerName, headerValue] of response.headers.entries()) {
      res.set(headerName, headerValue)
    }
    res.status(response.status)
    let isDone = false
    const reader = response.body?.getReader()
    while (!isDone && reader) {
      const { value, done } = await reader.read()
      if (value) res.send(Buffer.from(value))
      isDone = done
    }
    res.end()
  })
}

// Mount components proxied endpoints
for (const [path, proxyTarget] of Object.entries(manager.proxiedEndpoints)) {
  app.all(path, async (req, res, next) => {
    const proxy = createProxyMiddleware({ target: proxyTarget })
    proxy(req, res, next)
  })
}

// Listen to all normal requests
app.use('**', (req, res, next) => {
  const clientGeneric = new ClientGeneric(req, res, manager)
  const proxySettings = {
    target,
    changeOrigin: true,
    selfHandleResponse: true,
    onProxyRes: responseInterceptor(
      async (responseBuffer, proxyRes, req, _res) => {
        if (
          proxyRes.headers['content-type']?.toLowerCase().includes('text/html')
        ) {
          handlePageView(req as Request, clientGeneric)
          let response = responseBuffer.toString('utf8')
          response = await manager.processEmbeds(response, clientGeneric)
          return response.replace(
            '<head>',
            `<head><script>${manager.getInjectedScript(clientGeneric)}</script>`
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
