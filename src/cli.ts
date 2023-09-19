#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from 'yargs'
import { startServerFromConfig } from './server'
import { hideBin } from 'yargs/helpers'
import _locreq from "locreq";
const locreq = _locreq(__dirname)

import nodeCrypto from 'crypto'
globalThis.crypto = nodeCrypto.webcrypto as any


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

  const message = getErrorMessage(error)

  console.error(`
  Oops! Something went wrong! :(
  Webcm: ${locreq("package.json").version}
  ${message}`)
}

//------------------------------------------------------------------------------
// Execution
//------------------------------------------------------------------------------

;(async function main() {
  process.on('uncaughtException', onFatalError)
  process.on('unhandledRejection', onFatalError)

  const options = {
    config: <const>{
      alias: 'c',
      type: 'string',
      describe: 'path to your Managed Components config',
    },
    components: <const>{
      alias: 'mc',
      type: 'string',
      default: './components',
      describe: 'path to Managed Components folder',
    },
  }

  yargs(hideBin(process.argv))
    .options(options)
    .command(
      '$0 [customComponentPath] [target]',
      'proxy a demo website and load the specified component on it',
      yargs => {
        return yargs
          .positional('customComponentPath', {
            type: 'string',
            description: 'the path to the entrypoint of your component',
          })
          .positional('target', {
            type: 'string',
            describe: 'the http url to direct the proxy to',
          })
      },
      argv => {
        const customSettings: Record<string, string> = Object.fromEntries(
          Object.entries(argv)
            .filter(([key]) => key.startsWith('settings_'))
            .map(([key, value]) => [
              key.replace(/^settings_/, ''),
              String(value),
            ])
        )
        if (Object.keys(customSettings).length && !argv.customComponentPath) {
          console.log(
            `Error: custom settings (${Object.keys(customSettings).join(
              ', '
            )}) passed, but no custom component specified. To use a custom component, specify the 'customComponentPath' positional argument\n\n`
          )
          yargs.showHelp()
          return
        }
        require('ts-node').register({
          files: true,
          transpileOnly: true,
          dir: __dirname,
        })
        startServerFromConfig({
          configPath: argv.config,
          componentsFolderPath: argv.components,
          customComponentPath: argv.customComponentPath,
          customComponentSettings: customSettings,
          url: argv.target,
        })
      }
    )
    .parse()
})().catch(onFatalError)
