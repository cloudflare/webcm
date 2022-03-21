const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const ProxyAgent = require('http-proxy-agent')
const { default: worker3PP, WORKER_3PP_PORT } = require('./worker-3pp')

const PORT = process.env.PORT || 3002

const app = express().use('**', (req, res, next) => {
  const defaultSettings = {
    target: req.url,
  }

  const settingsWith3pp = {
    ...defaultSettings,
    agent: new ProxyAgent(`http://localhost:${WORKER_3PP_PORT}`),
    toProxy: true,
  }

  const proxyWithout3pp = createProxyMiddleware(defaultSettings)
  const proxyWith3pp = createProxyMiddleware(settingsWith3pp)

  if (req.query.bypass3pp) {
    proxyWithout3pp(req, res, next)
  } else {
    proxyWith3pp(req, res, next)
  }
})

worker3PP.listen(WORKER_3PP_PORT)
app.listen(PORT)

// TODO auto-restart with chokidar filewatching worker-3pp.js
