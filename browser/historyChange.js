;['pushState', 'replaceState'].forEach(changeState => {
  window.history[changeState] = (...args) => {
    History.prototype[changeState].apply(history, args)
    webcm
      .track(
        {
          event: 'historyChange',
          payload: {
            history: [{ url: document.location.href, title: document.title }],
          },
        },
        true
      )
      .then(webcm._processServerResponse)
    // TODO reset any client-stored variables?
  }
})
