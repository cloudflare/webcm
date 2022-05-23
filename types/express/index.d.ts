declare namespace Express {
  interface Request {
    fullUrl: string
  }
  interface Response {
    payload: {
      fetch: [string, RequestInit][]
      local: [string, unknown][]
      session: [string, unknown][]
      execute: string[]
      return?: { [k: string]: unknown }
    }
  }
}
