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

window.addEventListener('mouseup', async event => {
  const round = (n, decPlaces = 4) => {
    const factor = 10 ** decPlaces
    return Math.floor(n * factor) / factor
  }
  const { clientX, clientY, target } = event
  const { left, top, width, height } = target.getBoundingClientRect()
  const snapshot = {
    relativeX: round(((clientX - left) / width) * 100),
    relativeY: round(((clientY - top) / height) * 100),
    target: webcm.getUniqueSelector(event.target),
    timestamp: new Date().getTime(),
  }
  for (const key of webcm._syncedAttributes) {
    if (['number', 'string', 'boolean'].includes(typeof event[key]))
      snapshot[key] = event[key]
  }
  webcm.track('client', { event: 'mouseup', mouseup: [snapshot] })
})

webcm.pageVars.__client.mouseup = true
