import yargs from 'yargs/yargs'
import { startServerFromConfig } from './server'
import nodeCrypto from 'crypto'

globalThis.crypto = nodeCrypto.webcrypto as any

const cliArgs = yargs(process.argv.slice(2))
  .options({
    configPath: {
      alias: 'c',
      type: 'string',
      default: './webcm.config.ts',
      describe: 'path to your Managed Components config',
    },
    componentsFolderPath: {
      alias: 'mc',
      type: 'string',
      default: './components',
      describe: 'path to Managed Components folder',
    },
  })
  .parseSync()

startServerFromConfig({
  configPath: cliArgs.configPath,
  componentsFolderPath: cliArgs.componentsFolderPath,
})
