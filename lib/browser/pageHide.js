window.addEventListener('pageHide', ({ persisted }) => {
  webcm.track(
    {
      event: 'pageHide',
      pageHide: [{ persisted, timestamp: new Date().getTime() }],
    },
    1
  )
})
