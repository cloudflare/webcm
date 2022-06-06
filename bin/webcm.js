#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */

/**
 * @fileoverview Main CLI that is run via the webcm command.
 */

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Get the error message of a given value.
 * @param {any} error The value to get.
 * @returns {string} The error message.
 */
function getErrorMessage(error) {
  // Lazy loading because this is used only if an error happened.
  const util = require('util')

  // Foolproof -- third-party module might throw non-object.
  if (typeof error !== 'object' || error === null) {
    return String(error)
  }

  // Use templates if `error.messageTemplate` is present.
  if (typeof error.messageTemplate === 'string') {
    try {
      const template = require(`../messages/${error.messageTemplate}.js`)

      return template(error.messageData || {})
    } catch {
      // Ignore template error then fallback to use `error.stack`.
    }
  }

  // Use the stacktrace if it's an error object.
  if (typeof error.stack === 'string') {
    return error.stack
  }

  // Otherwise, dump the object.
  return util.format('%o', error)
}

/**
 * Catch and report unexpected error.
 * @param {any} error The thrown error object.
 * @returns {void}
 */
function onFatalError(error) {
  process.exitCode = 2

  const { version } = require('../package.json')
  const message = getErrorMessage(error)

  console.error(`
  Oops! Something went wrong! :(
  Webcm: ${version}
  ${message}`)
}

//------------------------------------------------------------------------------
// Execution
//------------------------------------------------------------------------------

;(async function main() {
  process.on('uncaughtException', onFatalError)
  process.on('unhandledRejection', onFatalError)

  process.exitCode = await require('yargs')
    .scriptName('webcm')
    .usage('$0 [args]')
    .command(
      ['start', '$0'],
      '(default) start webcm proxy server with given Managed Components config file',
      yargs => {
        yargs
          .option('config', {
            alias: 'c',
            type: 'string',
            default: './mc_config.json',
            describe: 'path to your Managed Components config',
          })
          .option('components', {
            alias: 'mc',
            type: 'string',
            default: './components',
            describe: 'path to Managed Components folder',
          })
      },
      function (argv) {
        require('ts-node').register({
          files: true,
          transpileOnly: true,
        })
        const { startServer } = require('../lib/server')
        startServer(argv.config, argv.components)
      }
    )
    .help().argv
})().catch(onFatalError)
