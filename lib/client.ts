import Cookies from 'cookies'
import { Request, Response } from 'express'
import config from '../config.json'
import { ManagerGeneric } from './manager'

export class ClientGeneric {
  type = 'browser'
  title?: string
  timestamp?: number
  offset?: number
  request: Request
  response: Response
  manager: ManagerGeneric
  url: URL
  cookies: Cookies
  pendingCookies: { [k: string]: string }
  webcmPrefs: {
    listeners: {
      [k: string]: string[]
    }
  }

  constructor(request: Request, response: Response, manager: ManagerGeneric) {
    this.manager = manager
    this.request = request
    this.response = response
    this.pendingCookies = {}
    this.title = request.body.title // TODO - or it's in the response somewhere (ie. in the title html element)
    this.timestamp = request.body.timestamp
    this.offset = request.body.offset
    this.url =
      request.body?.location || new URL(config.target + request.url || '')
    this.cookies = new Cookies(request, response, { keys: [config.cookiesKey] })
    if (this.cookies.get('webcm_prefs', { signed: !!config.cookiesKey })) {
      this.webcmPrefs = JSON.parse(
        this.cookies.get('webcm_prefs', { signed: !!config.cookiesKey }) || ''
      )
    } else {
      this.webcmPrefs = { listeners: {} }
    }
    this.cookies.set('webcm_prefs', JSON.stringify(this.webcmPrefs), {
      signed: true,
    })
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
  set(key: string, value?: string | null) {
    this.cookies.set(key, value, { signed: !!config.cookiesKey })
    if (value === null || value === undefined) {
      delete this.pendingCookies[key]
    } else {
      this.pendingCookies[key] = value
    }
  }
  get(key: string) {
    return (
      this.cookies.get(key, { signed: !!config.cookiesKey }) ||
      this.pendingCookies[key]
    )
  }
  attachEvent(component: string, event: string) {
    if (!this.webcmPrefs.listeners[component]) {
      this.webcmPrefs.listeners[component] = [event]
    } else {
      this.webcmPrefs.listeners[component].push(event)
    }
  }
}

interface ClientSetOptions {
  scope?: 'page' | 'session' | 'infinite'
  expiry?: Date | number | null
}

export class Client {
  #generic
  #component
  emitter
  userAgent
  language
  referer
  ip
  title?
  url
  fetch
  execute

  constructor(component: string, generic: ClientGeneric) {
    this.#generic = generic
    this.#component = component
    this.url = this.#generic.url
    this.fetch = this.#generic.fetch.bind(generic)
    this.execute = this.#generic.execute.bind(generic)
    this.title = this.#generic.title
    this.emitter = 'browser'
    this.userAgent = this.#generic.request.headers['user-agent'] || ''
    this.language = this.#generic.request.headers['accept-language'] || ''
    this.referer = this.#generic.request.headers.referer || ''
    this.ip = this.#generic.request.ip || ''
  }
  return(value: unknown) {
    this.#generic.return(this.#component, value)
  }
  get(key: string, componentOverride?: string) {
    const component = componentOverride || this.#component
    return this.#generic.get(component + '__' + key)
  }
  // TODO - actually respect the scopes specified in opts
  set(key: string, value?: string | null, _opts?: ClientSetOptions) {
    this.#generic.set(this.#component + '__' + key, value)
  }
  attachEvent(event: string) {
    this.#generic.attachEvent(this.#component, event)
  }
}
