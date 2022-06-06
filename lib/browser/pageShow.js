window.addEventListener('pageShow', ({ persisted }) => {
  webcm.track(
    {
      event: 'pageShow',
      pageShow: { persisted },
    },
    1
  )
})
