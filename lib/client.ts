import { Request, Response } from 'express'
// import parseCookies from '../utils/parseCookies'
import Cookies from 'cookies'
import config from '../config.json'
import { ManagerGeneric } from './manager'

export class ClientGeneric {
  type: string
  page: any
  request: Request
  response: Response
  manager: ManagerGeneric
  url: any
  cookies: any
  webcmPrefs: any

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
  addEventListener(component: string, event: string, handler: Function) {
    console.log('called for ', event)
    // console.log(this.webcmPrefs)
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

export class Client {
  #generic: ClientGeneric
  #component: string
  url: URL
  emitter: string

  constructor(component: string, generic: ClientGeneric) {
    this.#generic = generic
    this.#component = component
    this.url = this.#generic.url
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
    //@ts-ignore
    return this.#generic.get(this.#component + '__' + key)
  }
  set(key: string, value: any) {
    //@ts-ignore
    this.#generic.set(this.#component + '__' + key, value)
  }

  addEventListener(...args: any) {
    //@ts-ignore
    this.#generic.addEventListener(this.#component, ...args)
  }
}
