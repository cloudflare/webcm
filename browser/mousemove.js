let delay = 200
let timeout

const getMousePosition = async event => {
  const payload = {
    clientX: event.clientX,
    clientY: event.clientY,
    target: event.target,
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
