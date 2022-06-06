window.addEventListener('pageHide', ({ persisted }) => {
  webcm.track(
    {
      event: 'pageHide',
      pageHide: { persisted },
    },
    1
  )
})
