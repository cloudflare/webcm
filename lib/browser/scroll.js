webcm.getUniqueSelector =
  webcm.getUniqueSelector ||
  function (el) {
    const path = []
    let current = el

    while (current) {
      const parent = current.parentNode

      if (parent) {
        let nthOfType = 0
        for (const child of parent.children) {
          if (child === current) {
            break
          }
          if (child.nodeName === current.nodeName) {
            nthOfType++
          }
        }
        if (nthOfType > 0) {
          path.unshift(
            `${current.nodeName.toLowerCase()}:nth-of-type(${nthOfType + 1})`
          )
        } else {
          path.unshift(current.nodeName.toLowerCase())
        }
      }

      if (current === document.body) {
        break
      }

      current = parent
    }

    return path.join('>')
  }

webcm.scrollDelay = 250
webcm.scrollTimeout

webcm.getScrollPosition = event => async () => {
  const { scrollX, scrollY } = window
  const snapshot = {
    scrollX,
    scrollY,
    target: webcm.getUniqueSelector(event.target),
    timestamp: new Date().getTime(),
    element:
      event.target === document ? document.scrollingElement : event.target,
  }
  for (const key of webcm._syncedAttributes) {
    if (['number', 'string', 'boolean'].includes(typeof event[key]))
      snapshot[key] = event[key]
  }
  webcm.track({ event: 'scroll', scroll: [snapshot] }, 1)
}

document.addEventListener('scroll', event => {
  clearTimeout(webcm.scrollTimeout)
  webcm.scrollTimeout = setTimeout(
    webcm.getScrollPosition(event),
    webcm.scrollDelay
  )
})
