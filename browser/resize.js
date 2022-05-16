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
  const res = await webcm._track({ event: 'resize', payload }, true)
  webcm._processServerResponse(res)
}

window.addEventListener('resize', _event => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(getDimensions, resizeDelay)
})
