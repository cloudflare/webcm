#!/usr/bin/env node
import yargs from "yargs";
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
 */
function getErrorMessage(error: Record<string, unknown>) {
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
 */
function onFatalError(error: Record<string, unknown>) {
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

  yargs
    .scriptName('webcm')
    .usage('$0 [args]')
    .command(
      'start [component]',
      '(default) start webcm proxy server with given Managed Components config file',
      yargs => {
        yargs
          .positional('component', {
            type: 'string',
            describe: 'path to your managed component .js file',
          })
          .option('target', {
            alias: 't',
            type: 'string',
            describe: 'the http url to direct the proxy to',
          })
          .option('config', {
            alias: 'c',
            default: './webcm.config.ts',
            type: 'string',
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
          dir: __dirname,
        })
        const { startServerFromConfig } = require('../lib/server')
        startServerFromConfig({
          configPath: argv.config,
          componentsFolderPath: argv.components,
          customComponentPath: argv.component,
          url: argv.target,
        })
      }
    )
    .help().argv
})().catch(onFatalError)
