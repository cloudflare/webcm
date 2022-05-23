declare namespace Express {
  interface Request {
    fullUrl: string
  }
  interface Response {
    payload: {
      fetch: [string, RequestInit][]
      execute: string[]
      return?: { [k: string]: unknown }
    }
  }
}
