import yargs from 'yargs/yargs'
import { startServer } from './lib/server'

const cliArgs = yargs(process.argv.slice(2))
  .options({
    config: {
      alias: 'c',
      type: 'string',
      default: './webcm.config.ts',
      describe: 'path to your Managed Components config',
    },
    components: {
      alias: 'mc',
      type: 'string',
      default: './components',
      describe: 'path to Managed Components folder',
    },
  })
  .parseSync()

startServer(cliArgs.config, cliArgs.components)
