import {
  ComponentSettings,
  EmbedCallback,
  Manager as MCManager,
  MCEvent as PrimaryMCEvent,
  MCEventListener,
  WidgetCallback,
} from '@managed-components/types'
import { Request } from 'express'
import { existsSync, readFileSync, rmdir } from 'fs'
import { JSDOM } from 'jsdom'
import pacote from 'pacote'
import path from 'path'
import { invalidateCache, useCache } from './cache/index'
import { Client, ClientGeneric } from './client'
import { MANAGER_EVENTS, PERMISSIONS } from './constants'
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
    this.name =
      type === MANAGER_EVENTS.ecommerce ? this.payload.name : undefined
  }
}

type ComponentConfigPermissions = {
  [key: string]: { description: string; required: boolean }
}

type ComponentConfig = {
  name: string
  settings: ComponentSettings
  permissions: string[]
}

const EXTS = ['.mjs', '.js', '.mts', '.ts']

export class ManagerGeneric {
  components: ComponentConfig[]
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
  permissions: { [k: string]: string[] }

  constructor(Context: {
    components: ComponentConfig[]
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
    this.permissions = {}
    this.clientListeners = {}
    this.mappedEndpoints = {}
    this.proxiedEndpoints = {}
    this.staticFiles = {}
    this.name = 'WebCM'
    this.trackPath = Context.trackPath
    this.clientEventsPath = Context.clientEventsPath
    this.ecommerceEventsPath = Context.ecommerceEventsPath
    this.components = Context.components
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
    settings: ComponentSettings,
    permissions: string[]
  ) {
    if (component) {
      try {
        // save component permissions in memory
        this.permissions[name] = permissions
        console.info(':: Initialising component', name)
        await component.default(new Manager(name, this), settings)
      } catch (error) {
        console.error(':: Error initialising component', component, error)
      }
    }
  }

  async loadComponentManifest(basePath: string) {
    const manifestPath = path.join(basePath, 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

    return manifest
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
    const manifest = await this.loadComponentManifest(basePath)
    return { component, manifest }
  }

  async fetchRemoteComponent(basePath: string, name: string) {
    let component
    const componentPath = path.join(this.componentsFolderPath, name)
    try {
      await pacote.extract(`@managed-components/${name}`, componentPath)
      component = await this.fetchLocalComponent(basePath)
    } catch (error) {
      console.error(':: Error fetching remote component', name, error)
      rmdir(componentPath, () =>
        console.info(':::: Removed empty component folder', componentPath)
      )
    }

    return component
  }

  async loadComponent(name: string) {
    const localPathBase = path.join(this.componentsFolderPath, name)
    return existsSync(localPathBase)
      ? this.fetchLocalComponent(localPathBase)
      : this.fetchRemoteComponent(localPathBase, name)
  }

  async hasRequiredPermissions(
    component: string,
    requiredPermissions: ComponentConfigPermissions,
    givenPermissions: string[]
  ) {
    let hasPermissions = true
    const missingPermissions = []
    for (const [key, value] of Object.entries(requiredPermissions)) {
      if (value.required) {
        if (!givenPermissions.includes(key)) {
          hasPermissions = false
          missingPermissions.push(key)
        }
      }
    }
    !hasPermissions &&
      console.error(
        `:: 🔒 Missing permissions ${JSON.stringify(
          missingPermissions
        ).toLocaleUpperCase()} for component ${component}. Component may not function correctly.`
      )
    return hasPermissions
  }

  async init() {
    for (const compConfig of this.components) {
      const { name, settings, permissions } = compConfig
      const { component, manifest } = (await this.loadComponent(name)) || {}

      await this.initComponent(component, name, settings, permissions)
      this.hasRequiredPermissions(name, manifest.permissions, permissions)
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

  checkPermissions(component: string, method: string) {
    const componentPermissions = this.permissions[component] || []
    if (!componentPermissions.includes(method)) {
      console.error(
        `⚠️  ${component} component: ${method?.toLocaleUpperCase()} - permissions not granted `
      )
      return false
    }
    return true
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
    let permission
    if (
      [
        MANAGER_EVENTS.clientCreated,
        MANAGER_EVENTS.userEvent,
        MANAGER_EVENTS.pageview,
      ].includes(type)
    ) {
      permission = PERMISSIONS[type]
      if (this.#generic.checkPermissions(this.#component, permission)) {
        this.#generic.addEventListener(this.#component, type, callback)
        return true
      }
    } else {
      this.#generic.addEventListener(this.#component, type, callback)
      return true
    }
  }

  createEventListener(type: string, callback: MCEventListener) {
    this.#generic.clientListeners[`${type}__${this.#component}`] = callback
    return true
  }

  get(key: string) {
    return get(this.#component + '__' + key)
  }

  set(key: string, value: any) {
    return set(this.#component + '__' + key, value)
  }

  route(path: string, callback: (request: Request) => Response) {
    if (this.#generic.checkPermissions(this.#component, PERMISSIONS.route)) {
      return this.#generic.route(this.#component, path, callback)
    }
  }

  proxy(path: string, target: string) {
    if (this.#generic.checkPermissions(this.#component, PERMISSIONS.proxy)) {
      return this.#generic.proxy(this.#component, path, target)
    }
  }

  serve(path: string, target: string) {
    if (this.#generic.checkPermissions(this.#component, PERMISSIONS.serve)) {
      return this.#generic.serve(this.#component, path, target)
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async useCache(key: string, callback: Function, expiry?: number) {
    return await useCache(this.#component + '__' + key, callback, expiry)
  }

  invalidateCache(key: string) {
    invalidateCache(this.#component + '__' + key)
    return true
  }

  registerEmbed(name: string, callback: EmbedCallback) {
    this.#generic.registeredEmbeds[this.#component + '__' + name] = callback
    return true
  }

  registerWidget(callback: WidgetCallback) {
    if (this.#generic.checkPermissions(this.#component, PERMISSIONS.widget)) {
      this.#generic.registeredWidgets.push(callback)
      return true
    }
  }
}
