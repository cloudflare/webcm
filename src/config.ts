import { ComponentConfig } from './manager'
import fs from 'fs'
import * as path from 'path'

export const defaultConfig: Config = {
  port: 1337,
  hostname: 'localhost',
  components: [],
  trackPath: '/webcm/track',
  cookiesKey: 'something-very-secret',
}

export type Config = {
  components: ComponentConfig[]
  target?: string
  hostname: string
  trackPath: string
  port: number
  cookiesKey: string
}

export function getConfig(configPath?: string) {
  let config: Config = defaultConfig
  if (configPath) {
    const configFullPath = path.resolve(configPath)
    if (!fs.existsSync(configFullPath)) {
      throw new Error(
        `No config file found at provided path: ${configFullPath}`
      )
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      config = { ...config, ...require(configFullPath).default }
      for (const component of config.components) {
        if ('path' in component && !component.path.startsWith('/')) {
          component.path = path.resolve(configPath, '../', component.path)
        }
      }
    }
  } else {
    console.log('Config path not provided, using defaults....')
  }
  if (!config.components) {
    config.components = []
  }
  return config
}
