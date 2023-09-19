import { MCEventListener } from '@managed-components/types'
import express, { Request, Response, RequestHandler } from 'express'
import { IncomingMessage, ClientRequest } from 'http'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import * as path from 'path'
import { Client, ClientGeneric } from './client'
import { ManagerGeneric, MCEvent } from './manager'
import { getConfig } from './config'
import { PERMISSIONS } from './constants'
import { StaticServer } from './static-server'
import _locreq from 'locreq'
const locreq = _locreq(__dirname)

const DEFAULT_TARGET = 'http://localhost:8000'

if (process.env.NODE_ENV === 'production') {
  process.on('unhandledRejection', (reason: Error) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
  })
}

type BasicServerConfig = {
  configPath?: string
  componentsFolderPath?: string
  url?: string
}

type CustomComponentServerConfig = BasicServerConfig & {
  customComponentPath?: string
  customComponentSettings?: Record<string, unknown>
}


type ServerConfig = BasicServerConfig | CustomComponentServerConfig

export async function startServerFromConfig({
  configPath,
  componentsFolderPath,
  url,
  ...args
}: ServerConfig) {
  const config = getConfig(configPath)
  let componentsPath = ''
  if (componentsFolderPath) {
    componentsPath = path.resolve(componentsFolderPath)
  } else {
    console.log('Components folder path not provided')
  }

  const { hostname, port, trackPath, components } = config
  if ('customComponentPath' in args && args.customComponentPath) {
    console.log(
      `⚠️  Custom component ${args.customComponentPath} will run with all permissions enabled, use webcm.config.ts to change what permissions it gets`
    )
    components.push({
      path: path.resolve(args.customComponentPath),
      permissions: Object.values(PERMISSIONS), // use all permissions, it's just for testing
      settings: args.customComponentSettings || {},
    })
  }

  if (url) {
    if (!(url.startsWith('http://') || url.startsWith('https://'))) {
      url = 'http://' + url
    }
    config.target = url
  } else if (!config.target) {
    const server = new StaticServer(8000)
    server.start()
    console.log('Started a demo static server at localhost:8000')
    config.target = DEFAULT_TARGET
  }

  const manager = new ManagerGeneric({
    components,
    trackPath,
    componentsFolderPath: componentsPath,
  })
  await manager.init()

  const getDefaultPayload = () => ({
    pageVars: [],
    fetch: [],
    execute: [],
    return: undefined,
  })

  const handleClientCreated = (
    req: Request,
    _: Response,
    clientGeneric: ClientGeneric
  ) => {
    const cookieName = 'webcm_clientcreated'
    const eventName = 'clientcreated'

    let clientAlreadyCreated = clientGeneric.cookies.get(cookieName) || ''

    if (!manager.listeners[eventName]) return

    for (const componentName of Object.keys(manager.listeners[eventName])) {
      if (clientAlreadyCreated.split(',')?.includes(componentName)) continue

      const event = new MCEvent(eventName, req)
      event.client = new Client(componentName as string, clientGeneric)
      clientAlreadyCreated = Array.from(
        new Set([...clientAlreadyCreated.split(','), componentName])
      ).join(',')
      clientGeneric.set(cookieName, clientAlreadyCreated)

      manager.listeners[eventName][componentName]?.forEach(
        (fn: MCEventListener) => fn(event)
      )
    }
  }

  const handleEvent = async (
    eventType: string,
    req: Request,
    res: Response
  ) => {
    res.payload = getDefaultPayload()
    const clientGeneric = new ClientGeneric(req, res, manager, config)

    handleClientCreated(req, res, clientGeneric)

    if (manager.listeners[eventType]) {
      // slightly alter ecommerce payload
      if (eventType === 'ecommerce') {
        req.body.payload.ecommerce = { ...req.body.payload.data }
        delete req.body.payload.data
      }

      const event = new MCEvent(eventType, req)
      for (const componentName of Object.keys(manager.listeners[eventType])) {
        event.client = new Client(componentName, clientGeneric)
        await Promise.all(
          manager.listeners[eventType][componentName].map(
            (fn: MCEventListener) => fn(event)
          )
        )
      }
      res.payload.execute.push(manager.getInjectedScript(clientGeneric))
    }

    return res.end(JSON.stringify(res.payload))
  }

  const handleClientEvent = async (req: Request, res: Response) => {
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
        await manager.clientListeners[
          req.body.payload.event + '__' + component
        ](event)
      } catch {
        console.error(
          `Error dispatching ${req.body.payload.event} to ${component}: it isn't registered`
        )
      }
    }
    res.payload.execute.push(manager.getInjectedScript(clientGeneric))
    res.end(JSON.stringify(res.payload))
  }

  // 'event', 'ecommerce' 'pageview', 'client' are the standard types
  // 'remarketing', 'identify' or any other event type
  const handleTrack: RequestHandler = (req, res) => {
    const eventType = req.body.eventType

    if (eventType === 'client') {
      return handleClientEvent(req, res)
    } else {
      return handleEvent(eventType, req, res)
    }
  }

  const handleRequest = (req: Request, clientGeneric: ClientGeneric) => {
    if (!manager.listeners['request']) return
    const requestEvent = new MCEvent('request', req)

    for (const componentName of Object.keys(manager.listeners['request'])) {
      requestEvent.client = new Client(componentName, clientGeneric)
      manager.listeners['request'][componentName]?.forEach(
        (fn: MCEventListener) => fn(requestEvent)
      )
    }
  }

  const app = express().use(express.json())
  app.set('trust proxy', true)

  // Mount WebCM endpoint
  app.post(trackPath, handleTrack)

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
      app.all(proxyEndpoint + '*', async (req, res, next) => {
        const proxy = createProxyMiddleware({
          target: proxyTarget + req.path.replace(proxyEndpoint, ''),
          ignorePath: true,
          followRedirects: true,
          changeOrigin: true,
        })
        proxy(req, res, next)
      })
    }
  }

  // Mount static files
  for (const [filePath, fileTarget] of Object.entries(manager.staticFiles)) {
    app.use(filePath, express.static(path.join(componentsPath, fileTarget)))
  }

  // Listen to all normal requests
  app.use('**', (req, res, next) => {
    res.payload = getDefaultPayload()
    const clientGeneric = new ClientGeneric(req, res, manager, config)
    const proxySettings = {
      target: config.target,
      changeOrigin: true,
      selfHandleResponse: true,
      onProxyReq: (
        _proxyReq: ClientRequest,
        req: IncomingMessage,
        _res: Response
      ) => {
        handleRequest(req as Request, clientGeneric)
      },
      onProxyRes: responseInterceptor(
        async (responseBuffer, _proxyRes, proxyReq, _res) => {
          if (proxyReq.headers['accept']?.toLowerCase().includes('text/html')) {
            let response = responseBuffer.toString('utf8') as string
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

  console.info(
    '\nWebCM, version',
    process.env.npm_package_version || locreq('package.json').version
  )
  app.listen(port, hostname)
  console.info(
    `\n🚀 WebCM is now proxying ${config.target} at http://${hostname}:${port}\n\n`
  )
}
