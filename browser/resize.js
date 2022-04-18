window.addEventListener('resize', async event => {
  const payload = {
    width: window.innerWidth || window.screen.availWidth,
    height: window.innerHeight || window.screen.availHeight,
  }
  const res = await fetch(ec._systemEventsPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event: 'resize', payload }),
  })
  ec._processServerResponse(res)
})
