import { MCEventListener } from '@managed-components/types'
import express, { Request, RequestHandler } from 'express'
import fs from 'fs'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import * as fs_path from 'path'
import { version } from '../package.json'
import { Client, ClientGeneric } from './client'
import { MANAGER_EVENTS } from './constants'
import { ManagerGeneric, MCEvent } from './manager'

if (process.env.NODE_ENV === 'production') {
  process.on('unhandledRejection', (reason: Error) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
  })
}

export const startServer = async (
  configPath = './webcm.config.ts',
  componentsFolderPath = './components'
) => {
  const configFullPath = fs_path.resolve(configPath)
  if (!fs.existsSync(configFullPath)) {
    console.error('Could not load WebCM config from', configFullPath)
    console.log('\nPlease create your configuration and run WebCM again.')
    process.exit(1)
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(configFullPath).default
  const componentsPath = componentsFolderPath
    ? fs_path.resolve(componentsFolderPath)
    : ''

  const {
    target: configTarget,
    hostname,
    port,
    ecommerceEventsPath,
    trackPath,
    clientEventsPath,
    components,
  } = config

  const target = process.env.CM_TARGET_URL || configTarget

  const manager = new ManagerGeneric({
    components,
    trackPath,
    ecommerceEventsPath,
    clientEventsPath,
    componentsFolderPath: componentsPath,
  })

  await manager.init()

  const getDefaultPayload = () => ({
    pageVars: [],
    fetch: [],
    execute: [],
    return: undefined,
  })

  const handleTrack: RequestHandler = (req, res) => {
    res.payload = getDefaultPayload()
    if (manager.listeners['event']) {
      const event = new MCEvent('event', req)
      const clientGeneric = new ClientGeneric(req, res, manager, config)
      for (const componentName of Object.keys(manager.listeners['event'])) {
        event.client = new Client(componentName, clientGeneric)
        manager.listeners['event'][componentName].forEach(
          (fn: MCEventListener) => fn(event)
        )
      }
    }
    return res.end(JSON.stringify(res.payload))
  }

  const handleEcommerce: RequestHandler = (req, res) => {
    res.payload = getDefaultPayload()
    if (manager.listeners['ecommerce']) {
      const event = new MCEvent('ecommerce', req)
      const clientGeneric = new ClientGeneric(req, res, manager, config)
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
    res.payload = getDefaultPayload()
    const event = new MCEvent(req.body.payload.event, req)
    const clientGeneric = new ClientGeneric(req, res, manager, config)
    const clientComponentNames = Object.entries(
      clientGeneric.webcmPrefs.listeners
    )
      .filter(([, events]) => events.includes(req.body.payload.event))
      .map(([componentName]) => componentName)
    for (const component of clientComponentNames) {
      event.client = new Client(component, clientGeneric)
      try {
        manager.clientListeners[req.body.payload.event + '__' + component](
          event
        )
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
        manager.listeners['clientcreated'][componentName]?.forEach(
          (fn: MCEventListener) => fn(event)
        )
      }
    }
    for (const componentName of Object.keys(manager.listeners['pageview'])) {
      pageview.client = new Client(componentName, clientGeneric)
      manager.listeners['pageview'][componentName]?.forEach(
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
      const response = await manager.mappedEndpoints[route](req)
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
          followRedirects: true,
        })
        proxy(req, res, next)
      })
    }
  }

  // Mount static files
  for (const [path, fileTarget] of Object.entries(manager.staticFiles)) {
    app.use(path, express.static(fs_path.join(componentsPath, fileTarget)))
  }

  // Listen to all normal requests
  app.use('**', (req, res, next) => {
    res.payload = getDefaultPayload()
    const clientGeneric = new ClientGeneric(req, res, manager, config)
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
            handlePageView(proxyReq as Request, clientGeneric)
            let response = responseBuffer.toString('utf8')
            response = await manager.processEmbeds(response)
            response = await manager.processWidgets(response)
            return response.replace(
              '<head>',
              `<head><script>${manager.getInjectedScript(
                clientGeneric
              )};webcm._processServerResponse(${JSON.stringify(
                res.payload
              )})</script>`
            )
          }
          return responseBuffer
        }
      ),
    }
    const proxy = createProxyMiddleware(proxySettings)
    proxy(req, res, next)
  })

  console.info('\nWebCM, version', process.env.npm_package_version || version)
  app.listen(port, hostname)
  console.info(
    `\n🚀 WebCM is now proxying ${target} at http://${hostname}:${port}\n\n`
  )
}
