let scrollDelay = 250
let scrollTimeout

const getScrollPosition = event => async () => {
  const payload = {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    element:
      event.target === document ? document.scrollingElement : event.target,
  }
  const res = await fetch(ec._systemEventsPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event: 'scroll', payload }),
  })
  ec._processServerResponse(res)
}

document.addEventListener('scroll', event => {
  clearTimeout(scrollTimeout)
  scrollTimeout = setTimeout(getScrollPosition(event), scrollDelay)
})
