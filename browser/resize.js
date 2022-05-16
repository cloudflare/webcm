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
      },
    ],
  }
  webcm.track({ event: 'resize', payload }, true)
}

window.addEventListener('resize', _event => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(getDimensions, resizeDelay)
})
