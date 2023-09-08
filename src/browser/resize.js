let resizeDelay = 500
let resizeTimeout

const getDimensions = async () => {
  const { innerWidth, innerHeight, screen } = window
  const resize = [
    {
      innerWidth,
      innerHeight,
      availHeight: screen.availHeight,
      availWidth: screen.availWidth,
      timestamp: new Date().getTime(),
    },
  ]
  webcm.track('client', { event: 'resize', resize })
}

window.addEventListener('resize', _event => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(getDimensions, resizeDelay)
})

webcm.pageVars.__client.resize = true
