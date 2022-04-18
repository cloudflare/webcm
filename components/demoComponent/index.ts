import { Manager } from '../../lib/index'

export default async function (manager: Manager) {
  manager.addEventListener('mousedown', async event => {
    // Save mouse coordinates as a cookie
    const { client, payload } = event
    client.set('lastClickX', payload.clientX)
    client.set('lastClickY', payload.clientY)
  })

  manager.addEventListener('event', async event => {
    // Forward events to vendor
    const { client, payload } = event
    payload.user_id = client.get('user_id')

    if (Object.keys(payload).length) {
      const params = new URLSearchParams(payload).toString()
      fetch(`https://www.example.com/?${params}`)
    }
  })

  manager.addEventListener('pageview', async event => {
    // Set a user_id based on a query param
    const { client } = event

    const user_id = client.page.query.user_id
    client.set('user_id', user_id, {
      scope: 'infinite',
    })
  })

  manager.addEventListener('historyChange', async event => {
    console.info('Ch Ch Ch Chaaanges to history detected!')
  })

  manager.addEventListener('resize', async event => {
    console.info(
      'New window size!',
      event.payload?.height,
      event.payload?.width
    )
  })
}
