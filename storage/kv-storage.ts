import { writeFileSync, readFileSync } from 'fs'

const BASE_DIR = 'kv'

export const set = (key: string, value: any) => {
  writeFileSync(BASE_DIR + '/' + key, value)
  return true
}

export const get = (key: string) => {
  return readFileSync(BASE_DIR + '/' + key)
}
