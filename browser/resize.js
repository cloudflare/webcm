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
  const res = await fetch(webcm._systemEventsPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event: 'resize', payload }),
  })
  webcm._processServerResponse(res)
}

window.addEventListener('resize', _event => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(getDimensions, resizeDelay)
})
