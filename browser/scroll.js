let scrollDelay = 250
let scrollTimeout

const getScrollPosition = event => async () => {
  const { scrollX, scrollY } = window
  const payload = {
    scrolls: [
      {
        scrollX,
        scrollY,
        timestamp: new Date().getTime(),
        element:
          event.target === document ? document.scrollingElement : event.target,
      },
    ],
  }
  webcm.track({ event: 'scroll', payload }, 1)
}

document.addEventListener('scroll', event => {
  clearTimeout(scrollTimeout)
  scrollTimeout = setTimeout(getScrollPosition(event), scrollDelay)
})
