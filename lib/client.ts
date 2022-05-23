import Cookies from 'cookies'
import { Request, Response } from 'express'
import config from '../config.json'
import { ManagerGeneric } from './manager'

export class ClientGeneric {
  type: string
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
    this.type = 'browser'
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
  return(value: unknown) {
    this.response.payload.return = value
  }
  fetch(resource: string, settings: any) {
    this.response.payload.fetch.push([resource, settings])
  }
  set(key: string, value: any) {
    this.cookies.set(key, value, { signed: !!config.cookiesKey })
    this.pendingCookies[key] = value
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
  #generic: ClientGeneric
  #component: string
  title?: string
  url: URL
  emitter: string
  userAgent: string
  language: string
  referer: string
  ip: string

  constructor(component: string, generic: ClientGeneric) {
    this.#generic = generic
    this.#component = component
    this.url = this.#generic.url
    this.title = this.#generic.title
    this.emitter = 'browser'
    this.userAgent = this.#generic.request.headers['user-agent'] || ''
    this.language = this.#generic.request.headers['accept-language'] || ''
    this.referer = this.#generic.request.headers.referer || ''
    this.ip = this.#generic.request.ip || ''
  }

  execute(code: string) {
    this.#generic.execute(code)
  }

  return(...args: any) {
    //@ts-ignore
    this.#generic.return(this.#component, ...args)
  }
  fetch(...args: any) {
    //@ts-ignore
    this.#generic.fetch(this.#component, ...args)
  }
  get(key: string) {
    return this.#generic.get(this.#component + '__' + key)
  }
  // TODO - actually respect the scopes specified in opts
  set(key: string, value: any, _opts?: ClientSetOptions) {
    this.#generic.set(this.#component + '__' + key, value)
  }
  attachEvent(event: string) {
    this.#generic.attachEvent(this.#component, event)
  }
}
