document.addEventListener('visibilityChange', _ => {
  webcm.track(
    {
      event: 'visibilityChange',
      visibilityChange: [
        { state: document.visibilityState, timestamp: new Date().getTime() },
      ],
    },
    1
  )
})