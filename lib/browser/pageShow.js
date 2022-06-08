window.addEventListener('pageShow', ({ persisted }) => {
  webcm.track(
    {
      event: 'pageShow',
      pageShow: [{ persisted, timestamp: new Date().getTime() }],
    },
    1
  )
})
