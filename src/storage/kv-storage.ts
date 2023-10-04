import { writeFileSync, readFileSync } from 'fs'

const BASE_DIR = 'kv'

export const set = (key: string, value: any) => {
  writeFileSync(BASE_DIR + '/' + key, JSON.stringify(value))
  return true
}

export const get = (key: string) => {
  try {
    return JSON.parse(readFileSync(BASE_DIR + '/' + key).toString())
  } catch {
    return
  }
}
