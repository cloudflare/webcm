let resizeDelay = 500
let resizeTimeout

const getDimensions = async () => {
  const { innerWidth, innerHeight, screen } = window
  const payload = {
    dimensions: [
      {
        innerWidth,
        innerHeight,
        availHeight: screen.availHeight,
        availWidth: screen.availWidth,
        timestamp: new Date().getTime(),
      },
    ],
  }
  webcm.track({ event: 'resize', payload }, 1)
}

window.addEventListener('resize', _event => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(getDimensions, resizeDelay)
})
