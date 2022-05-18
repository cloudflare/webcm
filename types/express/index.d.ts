declare namespace Express {
  interface Request {
    fullUrl: string
  }
  interface Response {
    payload: {
      fetch: any[]
      execute: any[]
      return: any
    }
  }
}
