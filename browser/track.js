const webcm = {
  _processServerResponse: async res => {
    const data = await res.json()

    for (const f of data.fetch) fetch(f[0], f[1])
    for (const e of data.eval) eval(e)
    return data.return
  },
  track: async payload => {
    const res = await fetch('TRACK_PATH', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return webcm._processServerResponse(res)
  },
  _systemEventsPath: 'SYSTEM_EVENTS_PATH',
  _syncedAttributes: ['altKey', 'clientX', 'clientY'],
}
