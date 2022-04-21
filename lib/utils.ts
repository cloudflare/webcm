export const sha256 = async (value: string) => {
  const text = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    text // The data you want to hash as an ArrayBuffer
  )

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  // convert bytes to hex string
  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
  return hashHex
}

export const flattenKeys = (obj: { [k: string]: any } = {}, prefix = '') =>
  Object.keys(obj).reduce((acc: { [k: string]: any }, k) => {
    const pre = prefix.length ? `${prefix}.` : ''
    if (
      typeof obj[k] === 'object' &&
      !Array.isArray(obj[k]) &&
      obj[k] !== null &&
      Object.keys(obj[k]).length > 0
    ) {
      Object.assign(acc, flattenKeys(obj[k], pre + k))
    } else if (Array.isArray(obj[k]) && obj[k] !== null) {
      obj[k].forEach((v: any, i: number) => {
        if (typeof v === 'object' && v !== null) {
          Object.assign(acc, flattenKeys(v, pre + k + '.' + i))
        } else {
          acc[pre + k + '.' + i] = v
        }
      })
    } else {
      acc[pre + k] = obj[k]
    }
    return acc
  }, {})
