window.addEventListener('pageshow', ({ persisted }) => {
  webcm.track(
    'client',
    {
      event: 'pageShow',
      pageShow: [{ persisted, timestamp: new Date().getTime() }],
    },
    1
  )
})

webcm.pageVars.__client.pageShow = true
