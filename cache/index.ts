/* eslint-disable @typescript-eslint/ban-types */
const cache: { [k: string]: { value: any; expiry: number } } = {}

export const useCache = async (
  key: string,
  callback: Function,
  expirySeconds = 3600
) => {
  const currentTime = new Date().valueOf() / 1000
  const cached = cache[key]
  if (cached && cached.expiry >= currentTime) return cached.value
  cache[key] = { value: await callback(), expiry: currentTime + expirySeconds }
  return cache[key].value
}

export const invalidateCache = (key: string) => {
  delete cache[key]
}
