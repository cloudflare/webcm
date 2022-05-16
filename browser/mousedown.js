const getUniqueSelector = el => {
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

window.addEventListener('mousedown', async event => {
  const snapshot = { target: getUniqueSelector(event.target) }
  for (const key of webcm._syncedAttributes) {
    if (['number', 'string', 'boolean'].includes(typeof event[key]))
      snapshot[key] = event[key]
  }
  const payload = { mousedown: [snapshot] }
  webcm.track({ event: 'mousedown', ...payload }, true)
})
