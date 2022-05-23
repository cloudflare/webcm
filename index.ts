import express, { Request, RequestHandler } from 'express'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import * as fs_path from 'path'
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
  ecommerceEventsPath,
  trackPath,
  clientEventsPath,
  components,
} = config as any

const target = process.env.CM_TARGET_URL || configTarget

const manager = new ManagerGeneric({
  components,
  trackPath,
  ecommerceEventsPath,
  clientEventsPath,
})

const defaultPayload = {
  fetch: [],
  execute: [],
  return: undefined,
}

const handleTrack: RequestHandler = (req, res) => {
  res.payload = { ...defaultPayload }
  if (manager.listeners['event']) {
    const event = new MCEvent('event', req)
    const clientGeneric = new ClientGeneric(req, res, manager)
    for (const componentName of Object.keys(manager.listeners['event'])) {
      event.client = new Client(componentName, clientGeneric)
      manager.listeners['event'][componentName].forEach((fn: MCEventListener) =>
        fn(event)
      )
    }
  }
  return res.end(JSON.stringify(res.payload))
}

const handleEcommerce: RequestHandler = (req, res) => {
  res.payload = { ...defaultPayload }
  if (manager.listeners['ecommerce']) {
    const event = new MCEvent('ecommerce', req)
    const clientGeneric = new ClientGeneric(req, res, manager)
    for (const componentName of Object.keys(manager.listeners['ecommerce'])) {
      event.client = new Client(componentName, clientGeneric)
      manager.listeners['ecommerce'][componentName].forEach(
        (fn: MCEventListener) => fn(event)
      )
    }
  }
  return res.end(JSON.stringify(res.payload))
}

const handleClientEvent: RequestHandler = (req, res) => {
  res.payload = { ...defaultPayload }
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
  res.end(JSON.stringify(res.payload))
}

const handlePageView = (req: Request, clientGeneric: ClientGeneric) => {
  if (!manager.listeners['pageview']) return
  const pageview = new MCEvent('pageview', req)
  if (!clientGeneric.cookies.get('webcm_prefs')) {
    for (const componentName of Object.keys(
      manager.listeners['clientcreated']
    )) {
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
app.set('trust proxy', true)

// Mount WebCM endpoint
app
  .post(trackPath, handleTrack)
  .post(ecommerceEventsPath, handleEcommerce)
  .post(clientEventsPath, handleClientEvent)

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
for (const component of Object.keys(manager.proxiedEndpoints)) {
  for (const [path, proxyTarget] of Object.entries(
    manager.proxiedEndpoints[component]
  )) {
    const proxyEndpoint = '/webcm/' + component + path
    app.all(proxyEndpoint, async (req, res, next) => {
      const proxy = createProxyMiddleware({
        target: proxyTarget + req.path.slice(proxyEndpoint.length - 2),
        ignorePath: true,
      })
      proxy(req, res, next)
    })
  }
}

// Mount static files
for (const [path, fileTarget] of Object.entries(manager.staticFiles)) {
  app.use(
    path,
    express.static(fs_path.join(__dirname, 'components', fileTarget))
  )
}

// Listen to all normal requests
app.use('**', (req, res, next) => {
  res.payload = { ...defaultPayload }
  const clientGeneric = new ClientGeneric(req, res, manager)
  const proxySettings = {
    target,
    changeOrigin: true,
    selfHandleResponse: true,
    onProxyRes: responseInterceptor(
      async (responseBuffer, proxyRes, proxyReq, _res) => {
        if (
          proxyRes.headers['content-type']
            ?.toLowerCase()
            .includes('text/html') &&
          !proxyReq.url?.endsWith('.ico')
        ) {
          console.log('🚀res.payload:', res.payload)
          handlePageView(proxyReq as Request, clientGeneric)
          let response = responseBuffer.toString('utf8')
          response = await manager.processEmbeds(response, clientGeneric)
          response = await manager.processWidgets(response, clientGeneric)
          return response.replace(
            '<head>',
            `<head><script>${manager.getInjectedScript(
              clientGeneric
            )};webcm._processServerResponse(JSON.parse(${JSON.stringify(
              res.payload
            )}))</script>`
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
