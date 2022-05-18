const webcm = {
  _processServerResponse: async res => {
    const data = await res.json()

    for (const f of data.fetch) fetch(f[0], f[1])
    for (const e of data.eval) eval(e)
    return data.return
  },
  track: async (payload, eventType = 0) => {
    const paths = ['TRACK_PATH', 'CLIENT_EVENTS_PATH', 'EC_EVENTS_PATH']
    const data = { location: window.location, title: document.title, payload }
    const res = await fetch(paths[eventType], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return webcm._processServerResponse(res)
  },
  _syncedAttributes: ['altKey', 'clientX', 'clientY'],
}
