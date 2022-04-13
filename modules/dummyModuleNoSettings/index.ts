import { ECWeb } from '../../lib'

export default async function (manager: ECWeb) {
  // TODO patch addEventListener to use CustomEvents instead
  manager.addEventListener('mousedown', async (event: any) => {
    // Save mouse coordinates as a cookie
    const { client, payload } = event.detail
    client.set('lastClickX', payload.clientX)
    client.set('lastClickY', payload.clientY)
  })

  // TODO patch addEventListener to use CustomEvents instead
  manager.addEventListener('event', async (event: any) => {
    // Forward events to vendor
    const { client, payload } = event.detail
    payload.user_id = client.get('user_id')

    if (Object.keys(payload).length) {
      const params = new URLSearchParams(payload).toString()
      fetch(`https://www.example.com/?${params}`)
    }
  })

  // TODO patch addEventListener to use CustomEvents instead
  manager.addEventListener('pageview', async (event: any) => {
    // Set a user_id based on a query param
    const { client } = event.detail

    const user_id = client.page.query.user_id
    client.set('user_id', user_id, {
      scope: 'infinite',
    })
  })
}
