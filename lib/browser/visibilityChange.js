document.addEventListener('visibilityChange', _ => {
  webcm.track(
    {
      event: 'visibilityChange',
      visibilityChange: { state: document.visibilityState },
    },
    1
  )
})
