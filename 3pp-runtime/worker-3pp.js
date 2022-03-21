const express = require('express')

const WORKER_3PP_PORT = process.env.WORKER_3PP_PORT || 8888

const app = express().use('**', (req, res, next) => {
  console.log('cheese:', req.url)
  res.send('cheese')
})

module.exports = {
  default: app,
  WORKER_3PP_PORT,
}
