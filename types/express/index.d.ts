declare namespace Express {
  interface Request {
    fullUrl: string
  }
  interface Response {
    payload: {
      fetch: [string, RequestInit][]
      pageVars: [string, unknown][]
      execute: string[]
      return?: { [k: string]: unknown }
    }
  }
}
