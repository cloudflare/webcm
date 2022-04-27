import { Client } from '../../lib/client'
import { ComponentSettings, Manager } from '../../lib/manager'

export default async function (manager: Manager, settings: ComponentSettings) {
  const prefs = {
    // You can use fetch to get some remote preferences here based on `settings`
  }

  manager.addEventListener(
    'clientcreated',
    ({ client }: { client: Client }) => {
      // We have new client
      const clientNumber = client.get('clientNumber')
      if (!clientNumber) {
        const num = Math.random()
        client.set('clientNumber', num)
      }

      if (clientNumber > 0.5) {
        client.addEventListener('mousemove', async (event: Event) => {
          const { payload } = event
          console.info('🐁 🪤 Mousemove:', payload)
        })
      }

      client.addEventListener('mousedown', async (event: Event) => {
        // Save mouse coordinates as a cookie
        const { client, payload } = event
        console.info('🐁 ⬇️ Mousedown payload:', payload)
        const [firstClick] = payload.mousedown
        client.set('lastClickX', firstClick.clientX)
        client.set('lastClickY', firstClick.clientY)
      })

      client.addEventListener('historyChange', async (event: Event) => {
        console.info('Ch Ch Ch Chaaanges to history detected!', event.payload)
      })

      client.addEventListener('resize', async (event: Event) => {
        console.info('New window size!', event.payload)
      })

      client.addEventListener('scroll', async (event: Event) => {
        console.info('They see me scrollin...they hatin...', event.payload)
      })

      client.addEventListener(
        'resourcePerformanceEntry',
        async (event: Event) => {
          console.info(
            'Witness the fitness - fresh resourcePerformanceEntry',
            event.payload
          )
        }
      )
    }
  )

  manager.addEventListener('event', async (event: Event) => {
    // Forward events to vendor
    const { client, payload } = event
    payload.user_id = client.get('user_id')

    if (Object.keys(payload).length) {
      const params = new URLSearchParams(payload).toString()
      fetch(`https://www.example.com/?${params}`)
    }
  })

  manager.addEventListener('pageview', async (event: Event) => {
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
