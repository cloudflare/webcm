import { Request, Response } from 'express'

const parseCookies = (cookieString?: string) => {
  if (!cookieString) return {}
  return Object.fromEntries(
    cookieString
      .replaceAll('; ', ';')
      .split(';')
      .map(cookie => cookie.split('='))
  )
}

export interface MCClient {
  page: {
    query: {
      [k: string]: string
    }
  }
  type: string
  eval: (code: string) => void
  return: (value: unknown) => void
  fetch: (resource: string, settings: unknown) => void
  set: (key: string, value: unknown) => void
  get: (key: string) => any
}

export const buildClient = (req: Request, res: Response): MCClient => {
  const url = new URL(req.fullUrl)
  const cookies = parseCookies(req.headers['cookie'])
  return {
    page: {
      query: Object.fromEntries(url.searchParams),
    },
    type: 'browser',
    eval: (code: string) => {
      res.payload.eval.push(code)
    },
    return: (value: unknown) => {
      res.payload.return = value
    },
    fetch: (resource: string, settings: unknown) => {
      res.payload.fetch.push([resource, settings])
    },
    set: (key: string, value: unknown) => {
      res.append('set-cookie', `${key}=${value}`)
    },
    get: (key: string) => {
      return cookies[key]
    },
  }
}
