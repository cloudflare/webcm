declare namespace Express {
  interface Request {
    fullUrl: string
  }
  interface Response {
    payload: {
      fetch: any[]
      execute: string[]
      return: any
    }
  }
}
