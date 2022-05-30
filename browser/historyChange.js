;['pushState', 'replaceState'].forEach(changeState => {
  window.history[changeState] = (...args) => {
    History.prototype[changeState].apply(history, args)
    webcm
      .track(
        {
          event: 'historyChange',
          payload: {
            history: [
              {
                url: document.location.href,
                title: document.title,
                timestamp: new Date().getTime(),
              },
            ],
          },
        },
        1
      )
      .then(webcm._processServerResponse)
    webcm.pageVars = {}
  }
})
