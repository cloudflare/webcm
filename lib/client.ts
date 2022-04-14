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

export const buildClient = (req: Request, res: Response) => {
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
    fetch: (resource: string, settings: any) => {
      res.payload.fetch.push([resource, settings])
    },
    set: (key: string, value: any) => {
      res.append('set-cookie', `${key}=${value}`)
    },
    get: (key: string) => {
      return cookies[key]
    },
  }
}
