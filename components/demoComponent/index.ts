import { Request } from 'express'
import { ComponentSettings, Manager } from '../../lib/manager'

export default async function (manager: Manager, settings: ComponentSettings) {
  // FYI - You can use fetch to get some remote preferences here based on `settings`

  const myRoute = manager.route('/hello', (request: Request) => {
    return new Response(`You made a ${request.method} request`)
  })
  console.log('demoComponent exposes and endpoint at', myRoute)

  if (settings.ecommerce) {
    manager.addEventListener('ecommerce', event => {
      if (event.name === 'Purchase') {
        console.info('Ka-ching! 💰', event.payload)
      }
    })
  }

  manager.addEventListener('mousemove', async event => {
    const { payload } = event
    console.info('🐁 🪤 Mousemove:', payload)
  })

  manager.addEventListener('mousedown', async event => {
    // Save mouse coordinates as a cookie
    const { client, payload } = event
    console.info('🐁 ⬇️ Mousedown payload:', payload)
    const [firstClick] = payload.mousedown
    client.set('lastClickX', firstClick.clientX)
    client.set('lastClickY', firstClick.clientY)
  })

  manager.addEventListener('historyChange', async event => {
    console.info('Ch Ch Ch Chaaanges to history detected!', event.payload)
  })

  manager.addEventListener('resize', async event => {
    console.info('New window size!', event.payload)
  })

  manager.addEventListener('scroll', async event => {
    console.info('They see me scrollin...they hatin...', event.payload)
  })

  manager.addEventListener('resourcePerformanceEntry', async event => {
    console.info(
      'Witness the fitness - fresh resourcePerformanceEntry',
      event.payload
    )
  })

  manager.addEventListener('clientcreated', ({ client }) => {
    // We have new client
    const clientNumber = client.get('clientNumber')
    if (!clientNumber) {
      const num = Math.random()
      client.set('clientNumber', num)
    }
    if (clientNumber > 0.5) {
      client.attachEvent('mousemove')
    }

    client.attachEvent('mousedown')
    client.attachEvent('historyChange')
    client.attachEvent('scroll')
    client.attachEvent('resize')
    client.attachEvent('resourcePerformanceEntry')
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

  manager.registerEmbed(
    'weather-example',
    async ({ parameters }: { parameters: { [k: string]: unknown } }) => {
      const location = parameters['location']
      const widget = await manager.useCache('weather-' + location, async () => {
        const response = await (
          await fetch(`https://wttr.in/${location}?format=j1`)
        ).json()
        return `<p>Temperature in ${location} is: ${response.current_condition[0].temp_C} &#8451;</p>`
      })
      return widget
    }
  )
}
