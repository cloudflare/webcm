import Cookies from 'cookies'
import { Request, Response } from 'express'
import config from '../config.json'
import { ManagerGeneric } from './manager'

export class ClientGeneric {
  type: string
  title?: string
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
  }

  eval(code: string) {
    this.response.payload.eval.push(code)
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
    this.cookies.set('webcm_prefs', JSON.stringify(this.webcmPrefs), {
      signed: true,
    })
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
  headers: Request['headers']
  emitter: string

  constructor(component: string, generic: ClientGeneric) {
    this.#generic = generic
    this.#component = component
    this.headers = this.#generic.request.headers // TODO - make this less comprehensive (e.g. language, etc. NOT cookies)
    this.url = this.#generic.url
    this.title = this.#generic.title
    this.emitter = 'browser'
  }

  eval(...args: any) {
    //@ts-ignore
    this.#generic.eval(this.#component, ...args)
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
