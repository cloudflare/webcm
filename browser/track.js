const webcm = {
  pageVars: {},
  _processServerResponse: async res => {
    const data = await res.json()
    for (const [url, opts] of data.fetch) fetch(url, opts)
    for (const [key, val] of data.pageVars) webcm.pageVars[key] = val
    for (const e of data.execute) eval(e)
    return data.return
  },
  track: async (payload, eventType = 0) => {
    const paths = ['TRACK_PATH', 'CLIENT_EVENTS_PATH', 'EC_EVENTS_PATH']
    const data = {
      payload,
      location: window.location,
      title: document.title,
      pageVars: webcm.pageVars,
      timestamp: new Date().getTime(),
      offset: new Date().getTimezoneOffset(),
    }
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
