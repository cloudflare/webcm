let scrollDelay = 250
let scrollTimeout

const getScrollPosition = event => async () => {
  const { scrollX, scrollY } = window
  const payload = {
    scrolls: [
      {
        scrollX,
        scrollY,
        element:
          event.target === document ? document.scrollingElement : event.target,
      },
    ],
  }
  const res = await webcm.track({ event: 'scroll', payload }, true)
  webcm._processServerResponse(res)
}

document.addEventListener('scroll', event => {
  clearTimeout(scrollTimeout)
  scrollTimeout = setTimeout(getScrollPosition(event), scrollDelay)
})
