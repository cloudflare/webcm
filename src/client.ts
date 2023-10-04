import Cookies from 'cookies'
import { Request, Response } from 'express'
import { ManagerGeneric } from './manager'
import { Client as MCClient } from '@managed-components/types'
import { PERMISSIONS } from './constants'
export class ClientGeneric {
  type = 'browser'
  title?: string
  referer: string
  timestamp: number
  offset?: number
  request: Request
  response: Response
  manager: ManagerGeneric
  url: URL
  cookies: Cookies
  cookiesKey?: string
  pendingVariables: { [k: string]: string }
  pageVars: { [k: string]: string }
  webcmPrefs: {
    listeners: {
      [k: string]: string[]
    }
  }

  constructor(
    request: Request,
    response: Response,
    manager: ManagerGeneric,
    config: { cookiesKey?: string; hostname?: string }
  ) {
    this.cookiesKey = config.cookiesKey || ''
    this.manager = manager
    this.request = request
    this.response = response
    this.pendingVariables = {}
    this.title = request.body.title
    this.referer = request.body.referer
    this.timestamp = request.body.timestamp || new Date().getTime()
    this.pageVars = request.body.pageVars || { __client: {} }
    this.offset = request.body.offset
    this.url = new URL(
      request.body?.location ||
        'http://' + config.hostname + request.originalUrl
    )
    this.cookies = new Cookies(request, response, { keys: [this.cookiesKey] })
    if (this.pageVars.__webcm_prefs) {
      this.webcmPrefs = this.pageVars.__webcm_prefs as any
    } else {
      this.webcmPrefs = { listeners: {} }
    }
  }

  setPrefs() {
    let exists
    for (let i = 0; i < this.response.payload.pageVars.length; i++) {
      const [key] = this.response.payload.pageVars[i]

      if (key === '__webcm_prefs') {
        exists = true
        this.response.payload.pageVars.splice(i, 1, [
          '__webcm_prefs',
          this.webcmPrefs,
        ])
      }
    }
    if (!exists) {
      this.response.payload.pageVars.push(['__webcm_prefs', this.webcmPrefs])
    }
  }

  execute(code: string) {
    this.response.payload.execute.push(code)
  }
  return(component: string, value: unknown) {
    this.response.payload.return ||= {}
    this.response.payload.return[component] = value
  }
  fetch(resource: string, settings?: RequestInit) {
    this.response.payload.fetch.push([resource, settings || {}])
  }
  set(key: string, value?: string | null, opts?: ClientSetOptions) {
    const cookieOpts: Cookies.SetOption = { signed: !!this.cookiesKey }
    const { expiry, scope = 'infinite' } = opts || {}
    if (typeof expiry === 'number') {
      cookieOpts.maxAge = expiry
    }
    if (expiry instanceof Date) {
      cookieOpts.expires = expiry
    }
    switch (scope) {
      case 'page':
        this.response.payload.pageVars.push([key, value])
        break
      case 'session':
        delete cookieOpts.expires
        delete cookieOpts.maxAge
        this.cookies.set(key, value, cookieOpts)
        break
      default:
        cookieOpts.maxAge ||= 31536000000000
        this.cookies.set(key, value, cookieOpts)
        break
    }
    if (value === null || value === undefined) {
      delete this.pendingVariables[key]
    } else {
      this.pendingVariables[key] = value
    }
  }
  get(key: string) {
    return (
      this.cookies.get(key, { signed: !!this.cookiesKey }) ||
      this.pageVars[key] ||
      this.pendingVariables[key]
    )
  }
  attachEvent(component: string, event: string) {
    if (!this.webcmPrefs.listeners[component]) {
      this.webcmPrefs.listeners[component] = [event]
    } else {
      this.webcmPrefs.listeners[component].push(event)
    }

    this.setPrefs()
  }
  detachEvent(component: string, event: string) {
    const eventIndex = this.webcmPrefs.listeners[component]?.indexOf(event)
    if (eventIndex > -1) {
      this.webcmPrefs.listeners[component].splice(eventIndex, 1)
      this.setPrefs()
    }
  }
}

interface ClientSetOptions {
  scope?: 'page' | 'session' | 'infinite'
  expiry?: Date | number | null
}

export class Client implements MCClient {
  #generic
  #component
  emitter
  userAgent
  language
  referer
  ip
  title?
  timestamp
  url

  constructor(component: string, generic: ClientGeneric) {
    this.#generic = generic
    this.#component = component
    this.url = this.#generic.url
    this.title = this.#generic.title
    this.timestamp = this.#generic.timestamp
    this.emitter = 'browser'
    this.userAgent = this.#generic.request.headers['user-agent'] || ''
    this.language = this.#generic.request.headers['accept-language'] || ''
    this.referer = this.#generic.referer || ''
    this.ip = this.#generic.request.ip || ''
  }
  return(value: unknown) {
    this.#generic.return(this.#component, value)
  }
  get(key: string, componentOverride?: string) {
    const permission = componentOverride
      ? PERMISSIONS.clientExtGet
      : PERMISSIONS.clientGet
    if (this.#generic.manager.checkPermissions(this.#component, permission)) {
      const component = componentOverride || this.#component
      return this.#generic.get(component + '__' + key)
    }
  }
  set(key: string, value?: string | null, opts?: ClientSetOptions) {
    if (
      this.#generic.manager.checkPermissions(
        this.#component,
        PERMISSIONS.clientSet
      )
    ) {
      this.#generic.set(this.#component + '__' + key, value, opts)
      return true
    }
  }
  fetch(resource: string, settings?: RequestInit) {
    if (
      this.#generic.manager.checkPermissions(
        this.#component,
        PERMISSIONS.clientFetch
      )
    ) {
      this.#generic.fetch(resource, settings)
      return true
    }
  }
  execute(code: string) {
    if (
      this.#generic.manager.checkPermissions(
        this.#component,
        PERMISSIONS.clientExecute
      )
    ) {
      this.#generic.execute(code)
      return true
    }
  }
  attachEvent(event: string) {
    this.#generic.attachEvent(this.#component, event)
  }
  detachEvent(event: string) {
    this.#generic.detachEvent(this.#component, event)
  }
}
