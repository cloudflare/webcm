const webcm = {
  _processServerResponse: async res => {
    const data = await res.json()

    for (const f of data.fetch) fetch(f[0], f[1])
    for (const e of data.eval) eval(e)
    return data.return
  },
  _track: async (payload, clientPath = false) => {
    const data = { location: window.location, title: document.title, payload }
    const path = clientPath ? 'CLIENT_EVENTS_PATH' : 'TRACK_PATH'
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return webcm._processServerResponse(res)
  },
  track: (name, payload) => webcm._track({ event: 'event', name, payload }),
  _syncedAttributes: ['altKey', 'clientX', 'clientY'],
}
