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
  webcm.track({ event: 'scroll', payload }, true)
}

document.addEventListener('scroll', event => {
  clearTimeout(scrollTimeout)
  scrollTimeout = setTimeout(getScrollPosition(event), scrollDelay)
})
