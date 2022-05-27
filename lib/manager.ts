import { Request } from 'express'
import { existsSync, readFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import path from 'path'
import { invalidateCache, useCache } from '../cache/index'
import { get, set } from '../storage/kv-storage'
import { ClientGeneric, Client } from './client'
import { Manager as MCManager } from '@managed-components/types'

console.info('\nWebCM, version', process.env.npm_package_version)
export class MCEvent extends Event {
  name?: string
  payload: any
  client!: Client
  type: string

  constructor(type: string, req: Request) {
    super(type)
    this.type = type
    this.payload = req.body.payload || {}
    this.name = type === 'ecommerce' ? this.payload.name : undefined
  }
}

export interface ComponentSettings {
  [key: string]: any
}

type ComponentConfig = [string, ComponentSettings]

type EmbedCallback = (context: {
  parameters: { [k: string]: unknown }
  client: ClientGeneric
}) => any

type WidgetCallback = (context: { client: ClientGeneric }) => any

const EXTS = ['.ts', '.mts', '.mjs', '.js']

export interface MCEventListener {
  (event: MCEvent): void
}

export class ManagerGeneric {
  components: (string | ComponentConfig)[]
  trackPath: string
  name: string
  ecommerceEventsPath: string
  clientEventsPath: string
  requiredSnippets: string[]
  mappedEndpoints: {
    [k: string]: (request: Request) => Response
  }
  proxiedEndpoints: {
    [k: string]: {
      [k: string]: string
    }
  }
  staticFiles: {
    [k: string]: string
  }
  listeners: {
    [k: string]: {
      [k: string]: MCEventListener[]
    }
  }
  clientListeners: {
    [k: string]: MCEventListener
  }
  registeredEmbeds: {
    [k: string]: EmbedCallback
  }
  registeredWidgets: WidgetCallback[]

  constructor(Context: {
    components: (string | ComponentConfig)[]
    trackPath: string
    clientEventsPath: string
    ecommerceEventsPath: string
  }) {
    this.requiredSnippets = ['track']
    this.registeredWidgets = []
    this.registeredEmbeds = {}
    this.listeners = {}
    this.clientListeners = {}
    this.mappedEndpoints = {}
    this.proxiedEndpoints = {}
    this.staticFiles = {}
    this.name = 'WebCM'
    this.trackPath = Context.trackPath
    this.clientEventsPath = Context.clientEventsPath
    this.ecommerceEventsPath = Context.ecommerceEventsPath
    this.components = Context.components
    this.initScript()
  }

  route(
    component: string,
    path: string,
    callback: (request: Request) => Response
  ) {
    const fullPath = '/webcm/' + component + path
    this.mappedEndpoints[fullPath] = callback
    return fullPath
  }

  proxy(component: string, path: string, target: string) {
    this.proxiedEndpoints[component] ||= {}
    this.proxiedEndpoints[component][path] = target
    return '/webcm/' + component + path
  }

  serve(component: string, path: string, target: string) {
    const fullPath = '/webcm/' + component + path
    this.staticFiles[fullPath] = component + '/' + target
    return fullPath
  }

  addEventListener(component: string, type: string, callback: MCEventListener) {
    if (!this.requiredSnippets.includes(type)) {
      this.requiredSnippets.push(type)
    }
    this.listeners[type] ||= {}
    this.listeners[type][component] ||= []
    this.listeners[type][component].push(callback)
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
      Object.values(clientGeneric.webcmPrefs.listeners).flat()
    )

    for (const snippet of [...this.requiredSnippets, ...clientListeners]) {
      const snippetPath = `browser/${snippet}.js`
      if (existsSync(snippetPath)) {
        injectedScript += readFileSync(snippetPath)
          .toString()
          .replace('TRACK_PATH', this.trackPath)
          .replaceAll('CLIENT_EVENTS_PATH', this.clientEventsPath)
          .replaceAll('EC_EVENTS_PATH', this.ecommerceEventsPath)
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
      if (this.registeredEmbeds[name]) {
        const embed = await this.registeredEmbeds[name]({
          parameters,
          client,
        })
        const iframe = `<iframe sandbox="allow-scripts" src="about:blank" style="border: 0"srcDoc="${embed}"></iframe>`
        div.innerHTML = iframe
      }
    }

    return dom.serialize()
  }

  async processWidgets(response: string, client: ClientGeneric) {
    const dom = new JSDOM(response)
    for (const fn of this.registeredWidgets) {
      const widget = await fn({ client })
      const div = dom.window.document.createElement('div')
      div.innerHTML = widget
      dom.window.document.body.appendChild(div)
    }
    return dom.serialize()
  }
}

export class Manager implements MCManager {
  #generic: ManagerGeneric
  #component: string
  name: string

  constructor(component: string, generic: ManagerGeneric) {
    this.#generic = generic
    this.#component = component
    this.name = this.#generic.name
  }

  addEventListener(type: string, callback: MCEventListener) {
    this.#generic.addEventListener(this.#component, type, callback)
  }

  createEventListener(type: string, callback: MCEventListener) {
    this.#generic.clientListeners[`${type}__${this.#component}`] = callback
  }

  get(key: string) {
    return get(this.#component + '__' + key)
  }

  set(key: string, value: any) {
    set(this.#component + '__' + key, value)
  }

  route(path: string, callback: (request: Request) => Response) {
    return this.#generic.route(this.#component, path, callback)
  }

  proxy(path: string, target: string) {
    return this.#generic.proxy(this.#component, path, target)
  }

  serve(path: string, target: string) {
    return this.#generic.serve(this.#component, path, target)
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async useCache(key: string, callback: Function, expiry?: number) {
    return await useCache(this.#component + '__' + key, callback, expiry)
  }

  invalidateCache(key: string) {
    invalidateCache(this.#component + '__' + key)
  }

  registerEmbed(name: string, callback: EmbedCallback) {
    this.#generic.registeredEmbeds[this.#component + '__' + name] = callback
  }

  registerWidget(callback: WidgetCallback) {
    this.#generic.registeredWidgets.push(callback)
  }
}
