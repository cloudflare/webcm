import Cookies from 'cookies'
import { Request, Response } from 'express'
import config from '../config.json'
import { ManagerGeneric, MCEventListener } from './manager'

export class ClientGeneric {
  type: string
  // TODO where do we set the page properties? We should also set
  // the device properties in the same way if we want device data to live here
  page: any
  device: any
  request: Request
  response: Response
  manager: ManagerGeneric
  url: URL
  cookies: any
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
    this.url = new URL(config.target + request.url)
    this.cookies = new Cookies(request, response, { keys: [config.cookiesKey] })
    if (this.cookies.get('webcm_prefs', { signed: !!config.cookiesKey })) {
      this.webcmPrefs = JSON.parse(
        this.cookies.get('webcm_prefs', { signed: !!config.cookiesKey })
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
  }
  get(key: string) {
    return this.cookies.get(key, { signed: !!config.cookiesKey })
  }
  addEventListener(
    component: string,
    event: string,
    handler: MCEventListener | null
  ) {
    console.log('called for ', event)
    if (!this.webcmPrefs.listeners[component]) {
      this.webcmPrefs.listeners[component] = [event]
    } else {
      this.webcmPrefs.listeners[component].push(event)
    }
    this.manager.clientListeners[`${event}__${component}`] = handler

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
  device: {
    [k: string]: any
  }
  page: {
    title: string
    referrer: string
    query: {
      [k: string]: unknown
    }
  }
  url: URL
  emitter: string

  constructor(component: string, generic: ClientGeneric) {
    this.#generic = generic
    this.#component = component
    this.url = this.#generic.url
    this.page = this.#generic.page
    this.device = this.#generic.device
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

  addEventListener(type: string, callback: MCEventListener | null) {
    this.#generic.addEventListener(this.#component, type, callback)
  }
}
