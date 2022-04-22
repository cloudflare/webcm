import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { get, set } from '../storage/kv-storage'
import { useCache } from '../cache/index'
import { JSDOM } from 'jsdom'
import { MCClient } from './client'

declare global {
  interface Event {
    payload?: any
    client?: any
  }
}

export interface ComponentSettings {
  [key: string]: any
}

type EmbedCallback = (contex: { parameters: { [k: string]: unknown } }) => any

type ComponentConfig = string | ComponentSettings

const EXTS = ['.ts', '.mts', '.mjs', '.js']
export class Manager extends EventTarget {
  components: ComponentConfig[]
  CM_CLIENT_TOKEN_NAME: string
  trackPath: string
  systemEventsPath: string
  sourcedScript: string
  requiredSnippets: string[]
  registeredEmbeds: {
    [k: string]: EmbedCallback
  }
  set: (key: string, value: any) => boolean
  get: (key: string) => any
  // eslint-disable-next-line @typescript-eslint/ban-types
  useCache: (key: string, callback: Function, expiry?: number) => any

  constructor(Context: {
    set?: (key: string, value: any) => boolean
    get?: (key: string) => any
    components: ComponentConfig[]
    CM_CLIENT_TOKEN_NAME: string
    trackPath: string
    systemEventsPath: string
    // eslint-disable-next-line @typescript-eslint/ban-types
    useCache?: (key: string, callback: Function, expiry?: number) => any
  }) {
    super()
    this.sourcedScript = "console.log('ecweb script is sourced again')"
    this.requiredSnippets = ['track']
    this.registeredEmbeds = {}
    this.CM_CLIENT_TOKEN_NAME = Context.CM_CLIENT_TOKEN_NAME
    this.trackPath = Context.trackPath
    this.systemEventsPath = Context.systemEventsPath
    this.set = Context.set || set
    this.get = Context.get || get
    this.components = Context.components
    this.useCache = Context.useCache || useCache
    this.initScript()
  }

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.requiredSnippets.includes(type)) {
      this.requiredSnippets.push(type)
    }
    super.addEventListener(type, callback, options)
  }

  async initScript() {
    for (const compConfig of this.components) {
      let component
      let componentPath = ''
      let componentName = ''
      let componentSettings = {}
      if (typeof compConfig === 'object') {
        ;[componentName] = Object.keys(compConfig)
        componentSettings = compConfig[componentName]
      } else {
        componentName = compConfig
      }
      for (const ext of EXTS) {
        componentPath = path.join(
          __dirname,
          `../components/${componentName}/index${ext}`
        )
        if (existsSync(componentPath)) {
          component =
            ext === '.mjs'
              ? await import(componentPath)
              : require(componentPath)
          break
        }
      }

      if (component) {
        try {
          console.info('loading component', componentName)
          await component.default(this, componentSettings)
        } catch (error) {
          console.error(
            'Error loading component',
            componentPath,
            component,
            error
          )
        }
      }
    }
  }

  getInjectedScript() {
    let injectedScript = ''
    for (const snippet of this.requiredSnippets) {
      const snippetPath = `browser/${snippet}.js`
      if (existsSync(snippetPath)) {
        injectedScript += readFileSync(snippetPath)
          .toString()
          .replace('TRACK_PATH', this.trackPath)
          .replace('SYSTEM_EVENTS_PATH', this.systemEventsPath)
      }
    }
    return injectedScript
  }

  async processEmbeds(response: string, client: MCClient) {
    const dom = new JSDOM(response)
    for (const div of dom.window.document.querySelectorAll(
      'div[data-component-embed]'
    )) {
      const parameters = Object.fromEntries(
        Array.prototype.slice
          .call(div.attributes)
          .map(attr => [attr.nodeName.replace('data-', ''), attr.nodeValue])
      )
      const name = parameters['component-embed']
      div.innerHTML = await this.registeredEmbeds[name]({
        parameters,
        client,
      })
    }

    return dom.serialize()
  }

  registerEmbed(name: string, callback: EmbedCallback) {
    this.registeredEmbeds[name] = callback
  }
}
