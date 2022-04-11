import express from 'express'
import { readFileSync, existsSync } from 'fs'
import {
  createProxyMiddleware,
  responseInterceptor,
} from 'http-proxy-middleware'
import { buildClient } from './client.mjs'
import config from './config.json' assert { type: 'json' }
import { get, set } from './kv-storage.mjs'

const requiredSnippets = ['track']

const ecweb = new EventTarget()

ecweb.set = set
ecweb.get = get
const originalListener = ecweb.addEventListener
ecweb.addEventListener = function () {
  const eventName = arguments[0]
  if (!requiredSnippets.includes(eventName)) {
    requiredSnippets.push(eventName)
  }
  originalListener.apply(this, arguments)
}

const { target, hostname, port, trackPath, systemEventsPath } = config

if (process.env.NODE_ENV === 'production') {
  process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', reason.stack || reason)
  })
}

for (const mod of config.modules) {
  let moduleName = ''
  let moduleSettings = {}
  if (typeof mod === 'object') {
    moduleName = Object.keys(mod)[0]
    moduleSettings = mod[moduleName]
  } else {
    moduleName = mod
  }
  const tool = await import(`./modules/${moduleName}/index.mjs`)
  try {
    await tool.default(ecweb, moduleSettings)
  } catch (error) {
    console.error('Error loading tool', error)
  }
}

let injectedScript = ''

for (const snippet of requiredSnippets) {
  const snippetPath = `browser/${snippet}.js`
  if (existsSync(snippetPath)) {
    injectedScript += readFileSync(snippetPath)
      .toString()
      .replace('TRACK_PATH', trackPath)
      .replace('SYSTEM_EVENTS_PATH', systemEventsPath)
  }
}
const sourcedScript = "console.log('ecweb script is sourced again')"

const app = express()
  .use(express.json())
  .post(trackPath, (req, res, next) => {
    req.fullUrl = target + req.url
    const event = new Event('event')
    event.payload = req.body
    event.client = buildClient(req, res)
    res.payload = {
      fetch: [],
      eval: [],
      return: undefined,
    }
    ecweb.dispatchEvent(event)
    res.end(JSON.stringify(res.payload))
  })
  .post(systemEventsPath, (req, res, next) => {
    req.fullUrl = target + req.url
    const event = new Event(req.body.event)
    event.payload = req.body.payload
    event.client = buildClient(req, res)
    res.payload = {
      fetch: [],
      eval: [],
      return: undefined,
    }
    ecweb.dispatchEvent(event)
    res.end(JSON.stringify(res.payload))
  })
  // s.js TODO
  .get('/sourcedScript', (req, res, next) => {
    res.end(sourcedScript)
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
          const event = new Event('pageview')
          event.client = buildClient(req, res)
          ecweb.dispatchEvent(event)
          return response.replace(
            '<head>',
            `<head><script>${injectedScript}</script>`
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
