window.addEventListener('mousedown', async event => {
  const payload = {}
  for (const key of ec._syncedAttributes) {
    if (['number', 'string', 'boolean'].includes(typeof event[key]))
      payload[key] = event[key]
  }
  const res = await fetch(ec._systemEventsPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event: 'mousedown', payload }),
  })
  ec._processServerResponse(res)
})
