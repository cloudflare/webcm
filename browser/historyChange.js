;['pushState', 'replaceState'].forEach(changeState => {
  window.history[changeState] = (...args) => {
    History.prototype[changeState].apply(history, args)
    fetch(ec._systemEventsPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'historyChange',
        payload: {
          history: [{ url: document.location.href, title: document.title }],
        },
      }),
    }).then(ec._processServerResponse)
    // TODO reset any client-stored variables?
  }
})
