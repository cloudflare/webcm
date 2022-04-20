let delay = 200
let timeout

const round = (n, decPlaces = 4) => {
  const factor = 10 ** decPlaces
  return Math.floor(n * factor) / factor
}

const getMousePosition = async event => {
  const rect = event.target.getBoundingClientRect()
  const payload = {
    clientX: event.clientX,
    clientY: event.clientY,
    pageX: event.pageX,
    pageY: event.pageY,
    target: event.target,
    relativeX: round(((event.clientX - rect.left) / rect.width) * 100),
    relativeY: round(((event.clientY - rect.top) / rect.height) * 100),
  }
  const res = await fetch(ec._systemEventsPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event: 'mousemove', payload }),
  })
  ec._processServerResponse(res)
}

window.addEventListener('mousemove', event => {
  clearTimeout(timeout)
  timeout = setTimeout(getMousePosition, delay, event)
})
