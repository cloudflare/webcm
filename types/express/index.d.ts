declare namespace Express {
  interface Request {
    fullUrl: string
  }
  interface Response {
    payload: {
      fetch: any[]
      eval: any[]
      return: any
    }
  }
}
