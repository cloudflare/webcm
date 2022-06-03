import {
  ComponentSettings,
  EmbedCallback,
  Manager as MCManager,
  MCEvent as PrimaryMCEvent,
  MCEventListener,
  WidgetCallback,
} from '@managed-components/types'
import { Request } from 'express'
import { existsSync, readFileSync, unlink, writeFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import path from 'path'
import { x as extract } from 'tar'
import { invalidateCache, useCache } from './cache/index'
import { Client, ClientGeneric } from './client'
import { get, set } from './storage/kv-storage'

export class MCEvent extends Event implements PrimaryMCEvent {
  name?: string
  payload: any
  client!: Client
  type: string

  constructor(type: string, req: Request) {
    super(type)
    this.type = type
    this.payload = req.body.payload || { timestamp: new Date().getTime() } // because pageviews are symbolic requests without a payload
    this.name = type === 'ecommerce' ? this.payload.name : undefined
  }
}

type ComponentConfig = [string, ComponentSettings]

const EXTS = ['.mjs', '.js', '.mts', '.ts']

export class ManagerGeneric {
  components: (string | ComponentConfig)[]
  trackPath: string
  name: string
  ecommerceEventsPath: string
  clientEventsPath: string
  componentsFolderPath: string
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
    componentsFolderPath?: string
  }) {
    this.componentsFolderPath =
      Context.componentsFolderPath || path.join(__dirname, '..', 'components')
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

  async initComponent(
    component: any,
    name: string,
    settings: ComponentSettings
  ) {
    if (component) {
      try {
        console.info(':: Initialising component', name)
        await component.default(new Manager(name, this), settings)
      } catch (error) {
        console.error(':: Error initialising component', component, error)
      }
    }
  }

  async fetchLocalComponent(basePath: string) {
    let component
    const pkgPath = path.join(basePath, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      const main = pkg.main
      const mainPath = path.join(basePath, main)
      if (existsSync(mainPath)) {
        console.info('FOUND LOCAL MC:', mainPath)
        component = mainPath.endsWith('.mjs')
          ? await import(mainPath)
          : require(mainPath)
      } else {
        console.error(`No executable file for component at ${mainPath}`)
      }
    } else {
      for (const ext of EXTS) {
        const componentPath = path.join(basePath, 'index' + ext)
        if (existsSync(componentPath)) {
          console.info('FOUND LOCAL MC:', componentPath)
          component =
            ext === '.mjs'
              ? await import(componentPath)
              : require(componentPath)
          break
        }
      }
      if (!component) {
        console.error(`No executable file for component in ${basePath}`)
      }
    }
    return component
  }

  async fetchRemoteComponent(basePath: string, name: string) {
    let component
    const regUrl = `https://registry.npmjs.org/@managed-components/${name}`
    try {
      const res = await fetch(regUrl)
      const json = await res.json()
      const version = json['dist-tags'].latest
      const url = json.versions[version].dist.tarball
      const tarball = await fetch(url)
      console.info('FOUND REMOTE MC:', url)
      const componentPath = path.join(this.componentsFolderPath, name)
      const tarballPath = path.join(this.componentsFolderPath, name + '.tar.gz')

      // FIXME - save & extract this tarball properly
      writeFileSync(tarballPath, await tarball.arrayBuffer())
      await extract({ cwd: this.componentsFolderPath, file: componentPath })

      unlink(tarballPath, (err: unknown) => {
        if (err) throw err
        // tarball deleted
      })

      component = await this.fetchLocalComponent(basePath)
    } catch (error) {
      console.error(':: Error fetching remote component', name, error)
    }
    return component
  }

  async loadComponent(name: string) {
    const localPathBase = path.join(this.componentsFolderPath, name)
    return existsSync(localPathBase)
      ? this.fetchLocalComponent(localPathBase)
      : this.fetchRemoteComponent(localPathBase, name)
  }

  parseCompConfig(config: string | ComponentConfig) {
    let name = config as string
    let settings = {}
    if (Array.isArray(config)) {
      ;[name, settings] = config
    }
    return { name, settings }
  }

  async initScript() {
    for (const compConfig of this.components) {
      const { name, settings } = this.parseCompConfig(compConfig)
      const component = await this.loadComponent(name)
      await this.initComponent(component, name, settings)
    }
  }

  getInjectedScript(clientGeneric: ClientGeneric) {
    let injectedScript = ''

    const clientListeners: Set<any> = new Set(
      Object.values(clientGeneric.webcmPrefs.listeners).flat()
    )

    for (const snippet of [...this.requiredSnippets, ...clientListeners]) {
      const snippetPath = path.join(__dirname, 'browser', `${snippet}.js`)
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

  async processEmbeds(response: string) {
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
        const embed = await this.registeredEmbeds[name]({ parameters })
        const iframe = `<iframe sandbox="allow-scripts" src="about:blank" style="border: 0"srcDoc="${embed}"></iframe>`
        div.innerHTML = iframe
      }
    }

    return dom.serialize()
  }

  async processWidgets(response: string) {
    const dom = new JSDOM(response)
    for (const fn of this.registeredWidgets) {
      const widget = await fn()
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
