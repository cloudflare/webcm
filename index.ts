import express, { Request, RequestHandler } from 'express'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import config from './config.json'
import { Client, ClientGeneric } from './lib/client'
import { ManagerGeneric, MCEvent } from './lib/manager'

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
  systemEventsPath,
  components,
} = config as any

const target = process.env.CM_TARGET_URL || configTarget

const manager = new ManagerGeneric({
  components,
  trackPath,
  systemEventsPath,
})

const handleTrack: RequestHandler = (req, res) => {
  const event = new MCEvent('event', req)
  manager.dispatchEvent(event)
  res.payload = {
    fetch: [],
    eval: [],
    return: undefined,
  }
  return res.end(JSON.stringify(res.payload))
}

const handleSystemEvent: RequestHandler = (req, res) => {
  const clientGeneric = new ClientGeneric(req, res, manager)
  const event = new MCEvent(req.body.event, req)
  const componentNames = Object.entries(clientGeneric.webcmPrefs.listeners)
    .filter(([, events]) => events.includes(req.body.event))
    .map(([componentName]) => componentName)

  for (const component of componentNames) {
    event.client = new Client(component, clientGeneric)
    try {
      manager.clientListeners[req.body.event + '__' + component](event)
    } catch {
      console.error(
        `Error dispatching ${req.body.event} to ${component}: it isn't registered`
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

const handlePageView = (req: Request, client: ClientGeneric) => {
  const pageview = new MCEvent('pageview', req)
  if (!client.cookies.get('webcm_prefs')) {
    for (const compConfig of manager.components) {
      let componentName = compConfig
      if (Array.isArray(compConfig)) {
        ;[componentName] = compConfig
      }
      const event = new MCEvent(componentName + '__clientcreated')
      event.client = new Client(componentName as string, client)
      manager.dispatchEvent(event)
    }
  }
  manager.dispatchEvent(pageview)
}

const app = express().use(express.json())

// Mount WebCM endpoint
app
  .post(trackPath, handleTrack)
  .post(systemEventsPath, handleSystemEvent)
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
