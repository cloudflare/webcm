import { ComponentConfig } from './manager'

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
