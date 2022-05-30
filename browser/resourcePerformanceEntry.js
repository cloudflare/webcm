const prepResource = resource => {
  const empty = !resource || !resource.name
  return empty ? null : { url: resource.name, timestamp: +new Date() }
}

const prepEntries = entries => {
  const resources = []
  for (const resource of entries) {
    if (['link', 'img', 'css'].includes(resource.initiatorType)) {
      const preppedResource = prepResource(resource)
      if (preppedResource) {
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
  webcm.track({ event: 'resourcePerformanceEntry', payload }, 1)
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
