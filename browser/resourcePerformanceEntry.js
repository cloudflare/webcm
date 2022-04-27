const PE_CACHE_KEY = 'resources-cache'

class PECache {
  constructor() {
    this.cache = new Set()
  }

  add(e) {
    const key = this.digest(e)
    this.cache.add(key)
  }

  addRaw(key) {
    this.cache.add(key)
  }

  test(e) {
    const key = this.digest(e)
    return this.cache.has(key)
  }

  items() {
    const items = []
    this.cache.forEach(value => items.push(value))
    return items
  }

  digest(e) {
    return btoa(e)
  }
}

const resCache = new PECache()

const prepResource = resource => {
  const empty = !resource || !resource.name || resCache.test(resource.name)
  return empty ? null : { url: resource.name, timestamp: +new Date() }
}

const prepEntries = entries => {
  const resources = []
  for (const resource of entries) {
    if (['link', 'img', 'css'].includes(resource.initiatorType)) {
      const preppedResource = prepResource(resource)
      if (preppedResource) {
        resCache.add(resource.name)
        resources.push(preppedResource)
      }
    }
  }
  return resources
}

const sendPE = async entries => {
  const resources = prepEntries(entries)
  if (!resources.length) return
  const payload = { resources }
  const res = await fetch(webcm._systemEventsPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event: 'resourcePerformanceEntry', payload }),
  })
  webcm._processServerResponse(res)
}

const resCacheData = sessionStorage.getItem(PE_CACHE_KEY)

if (resCacheData) {
  for (const d of JSON.parse(resCacheData)) {
    resCache.addRaw(d)
  }
}

if (window.performance && window.performance.getEntriesByType) {
  sendPE(window.performance.getEntriesByType('resource'))
}

if (typeof PerformanceObserver !== 'undefined') {
  const performanceObserver = new PerformanceObserver(list => {
    sendPE(list.getEntries())
  })
  performanceObserver.observe({ entryTypes: ['resource'] })
}
