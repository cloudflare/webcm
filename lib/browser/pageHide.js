window.addEventListener('pagehide', ({ persisted }) => {
  webcm.track('client', {
    event: 'pageHide',
    pageHide: [{ persisted, timestamp: new Date().getTime() }],
  })
})

webcm.pageVars.__client.pageHide = true
