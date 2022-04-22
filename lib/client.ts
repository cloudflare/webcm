import { Request, Response } from 'express'
import { EVENT_SPACER } from './managedComponent'

const parseCookies = (cookieString?: string) => {
  if (!cookieString) return {}
  return Object.fromEntries(
    cookieString
      .replaceAll('; ', ';')
      .split(';')
      .map(cookie => cookie.split('=')) // TODO make this more robust
  )
}

export class MCClient extends EventTarget {
  type = 'browser'
  mcMap = {} as {
    [k: string]: string[]
  }
  cookies = {} as {
    [k: string]: string
  }
  req: Request
  res: Response
  page: {
    query: {
      [k: string]: string
    }
  }

  constructor(Context: { req: Request; res: Response; TOKEN_NAME: string }) {
    super()
    this.req = Context.req
    this.res = Context.res
    this.cookies = parseCookies(this.req.headers['cookie'])

    if (this.cookies[Context.TOKEN_NAME]) {
      try {
        this.mcMap = JSON.parse(this.cookies[Context.TOKEN_NAME])
      } catch (error) {
        console.error('Error parsing CM Token cookie', error)
      }
    }

    const url = new URL(this.req.fullUrl)
    this.page = {
      query: Object.fromEntries(url.searchParams),
    }
  }

  eval(code: string) {
    this.res.payload.eval.push(code)
  }
  return(value: unknown) {
    this.res.payload.return = value
  }
  fetch(resource: string, settings: unknown) {
    this.res.payload.fetch.push([resource, settings])
  }
  set(key: string, value: unknown) {
    this.res.append('set-cookie', `${key}=${value}`)
  }
  get(key: string) {
    return this.cookies[key]
  }

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | (AddEventListenerOptions & { mcId?: string })
  ): void {
    // json parse the cookie
    // {
    //   pageview: [tool1, tool2],
    //   scroll: [tool1, tool2],
    // }

    // for keys in the cookie
    // for i in ids
    // const event = new Event(ids[i] + '_' + key)

    // client.addEventListener(event) + generate the right clientSide scripts
    super.addEventListener(type, callback, options)
  }

  dispatchEvent(event: Event) {
    this.mcMap[event.type] = this.mcMap[event.type] || ([] as any)
    this.mcMap[event.type].forEach(mcId => {
      this.dispatchEvent(new Event(mcId + EVENT_SPACER + event.type))
    })
    return this.mcMap[event.type] !== []
  }
}
