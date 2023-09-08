;['pushState', 'replaceState'].forEach(changeState => {
  window.history[changeState] = (...args) => {
    History.prototype[changeState].apply(history, args)
    webcm
      .track('client', {
        event: 'historyChange',
        historyChange: [
          {
            url: document.location.href,
            title: document.title,
            timestamp: new Date().getTime(),
          },
        ],
      })
      .then(webcm._processServerResponse)
    webcm.pageVars = {}
  }
})

webcm.pageVars.__client.historyChange = true
