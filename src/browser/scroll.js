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

webcm.scrollInterval = 200

webcm.getScrollPosition = async event => {
  const { scrollX, scrollY } = window
  let scrollTarget = event.target

  if (scrollTarget === document) {
    scrollTarget = document.scrollingElement
  }

  const { scrollLeft, scrollTop } = scrollTarget

  const snapshot = {
    scrollX,
    scrollY,
    scrollLeft,
    scrollTop,
    target: webcm.getUniqueSelector(scrollTarget),
    timestamp: new Date().getTime(),
  }
  for (const key of webcm._syncedAttributes) {
    if (['number', 'string', 'boolean'].includes(typeof event[key]))
      snapshot[key] = event[key]
  }

  webcm.track('client', { event: 'scroll', scroll: [snapshot] })
}

document.addEventListener('scroll', event => {
  if (
    !webcm.scrollLast ||
    event.timeStamp - webcm.scrollLast > webcm.scrollInterval
  ) {
    webcm.scrollLast = event.timeStamp
    webcm.getScrollPosition(event)
  }
})

webcm.pageVars.__client.scroll = true
