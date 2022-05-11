import { Request } from 'express'
import { existsSync, readFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import path from 'path'
import { useCache } from '../cache/index'
import { get, set } from '../storage/kv-storage'
import { Client, ClientGeneric } from './client'

console.info('\nWebCM, version', process.env.npm_package_version)
export class MCEvent extends Event {
  name?: string
  payload?: any
  client!: Client

  constructor(type: string, req?: Request) {
    super(type)
    this.payload = req?.body.payload
  }
}

export interface ComponentSettings {
  [key: string]: any
}

type ComponentConfig = [string, ComponentSettings]

type EmbedCallback = (contex: {
  parameters: { [k: string]: unknown }
  client: ClientGeneric
}) => any

const EXTS = ['.ts', '.mts', '.mjs', '.js']

export interface MCEventListener {
  (event: MCEvent): void
}

export class ManagerGeneric extends EventTarget {
  components: (string | ComponentConfig)[]
  trackPath: string
  name: string
  systemEventsPath: string
  sourcedScript: string
  requiredSnippets: string[]
  mappedEndpoints: {
    [k: string]: (request: Request) => Response
  }
  clientListeners: any
  registeredEmbeds: {
    [k: string]: EmbedCallback
  }
  constructor(Context: {
    components: (string | ComponentConfig)[]
    trackPath: string
    systemEventsPath: string
    // eslint-disable-next-line @typescript-eslint/ban-types
    useCache?: (key: string, callback: Function, expiry?: number) => any
  }) {
    super()
    this.sourcedScript = "console.log('WebCM script is sourced again')"
    this.requiredSnippets = ['track']
    this.registeredEmbeds = {}
    this.clientListeners = {}
    this.mappedEndpoints = {}
    this.name = 'WebCM'
    this.trackPath = Context.trackPath
    this.systemEventsPath = Context.systemEventsPath
    this.components = Context.components
    this.initScript()
  }

  route(
    component: string,
    path: string,
    callback: (request: Request) => Response
  ): string {
    const fullPath = '/webcm/' + component + path
    this.mappedEndpoints[fullPath] = callback
    return fullPath
  }

  // We're calling the super() below anyway so ts should stop complaining
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  addEventListener(
    component: string,
    type: string,
    callback: MCEventListener | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.requiredSnippets.includes(type)) {
      this.requiredSnippets.push(type)
    }
    super.addEventListener(
      component + '__' + type,
      callback as EventListener,
      options
    )
  }

  async initScript() {
    for (const compConfig of this.components) {
      let component
      let componentPath = ''
      let componentName = ''
      let componentSettings = {}
      if (Array.isArray(compConfig)) {
        ;[componentName, componentSettings] = compConfig
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
          console.info(':: Loading component', componentName)
          await component.default(
            new Manager(componentName, this),
            componentSettings
          )
        } catch (error) {
          console.error(
            ':: Error loading component',
            componentPath,
            component,
            error
          )
        }
      }
    }
  }

  getInjectedScript(clientGeneric: ClientGeneric) {
    let injectedScript = ''

    const clientListeners: Set<any> = new Set(
      Object.entries(clientGeneric.webcmPrefs.listeners)
        .map(x => x[1])
        .flat()
    )
    for (const snippet of [...this.requiredSnippets, ...clientListeners]) {
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

  async processEmbeds(response: string, client: ClientGeneric) {
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
}

export class Manager {
  #generic: ManagerGeneric
  #component: string
  name: string

  constructor(component: string, generic: ManagerGeneric) {
    this.#generic = generic
    this.#component = component
    this.name = this.#generic.name
  }

  addEventListener(
    type: string,
    callback: MCEventListener | null,
    options?: boolean | AddEventListenerOptions
  ) {
    this.#generic.addEventListener(this.#component, type, callback, options)
  }

  get(key: string) {
    get(this.#component + '__' + key)
  }

  set(key: string, value: any) {
    set(this.#component + '__' + key, value)
  }

  route(path: string, callback: (request: Request) => Response) {
    return this.#generic.route(this.#component, path, callback)
  }

  async useCache(key: string, callback: Function, expiry?: number) {
    await useCache(this.#component + '__' + key, callback, expiry)
  }

  registerEmbed(name: string, callback: EmbedCallback) {
    this.#generic.registeredEmbeds[this.#component + '__' + name] = callback
  }
}
