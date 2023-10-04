webcm.sendPE = async entries => {
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
  const resources = prepEntries(entries)
  if (!resources.length) return
  webcm.track('client', {
    event: 'resourcePerformanceEntry',
    resourcePerformanceEntry: resources,
  })
}

if (window.performance && window.performance.getEntriesByType) {
  webcm.sendPE(window.performance.getEntriesByType('resource'))
}

if (typeof PerformanceObserver !== 'undefined') {
  const performanceObserver = new PerformanceObserver(list => {
    webcm.sendPE(list.getEntries())
  })
  performanceObserver.observe({ entryTypes: ['resource'] })
}

webcm.pageVars.__client.resourcePerformanceEntry = true
