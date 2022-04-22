import { ManagedComponent } from '../../lib/managedComponent'

export default class DemoComponent extends ManagedComponent {
  onClientCreated(client: MCClient) {
    client.addEventListener('pageview', _event => {
      console.info('📃 My special pageview handler 123:')
    })
  }
}

// export default async function (manager: Manager) {
//   const demo = new ManagedComponent(manager, namespace)

//   demo.addEventListener('clientCreated', async event => {
//     console.info(
//       '🐣 New client:',
//       event.client.get(manager.CM_CLIENT_TOKEN_NAME)
//     )

//     event.client.addEventListener('pageview', _event => {
//       console.info('📃 My special pageview handler 123:')
//     })
//   })

//   // manager.addEventListener('mousedown', async event => {
//   //   // Save mouse coordinates as a cookie
//   //   const { client, payload } = event
//   //   console.info('🐁 ⬇️ Mousedown payload:', payload)
//   //   const [firstClick] = payload.mousedown
//   //   client.set('lastClickX', firstClick.clientX)
//   //   client.set('lastClickY', firstClick.clientY)
//   // })

//   // manager.addEventListener('mousemove', async event => {
//   //   const { payload } = event
//   //   console.info('🐁 🪤 Mousemove:', payload)
//   // })

//   // manager.addEventListener('event', async event => {
//   //   // Forward events to vendor
//   //   const { client, payload } = event
//   //   payload.user_id = client.get('user_id')

//   //   if (Object.keys(payload).length) {
//   //     const params = new URLSearchParams(payload).toString()
//   //     fetch(`https://www.example.com/?${params}`)
//   //   }
//   // })

//   // manager.addEventListener('pageview', async event => {
//   //   // Set a user_id based on a query param
//   //   const { client } = event

//   //   const user_id = client.page.query.user_id
//   //   client.set('user_id', user_id, {
//   //     scope: 'infinite',
//   //   })
//   // })

//   // manager.addEventListener('historyChange', async event => {
//   //   console.info('Ch Ch Ch Chaaanges to history detected!', event.payload)
//   // })

//   // manager.addEventListener('resize', async event => {
//   //   console.info('New window size!', event.payload)
//   // })

//   // manager.addEventListener('scroll', async event => {
//   //   console.info('They see me scrollin...they hatin...', event.payload)
//   // })

//   // manager.addEventListener('resourcePerformanceEntry', async event => {
//   //   console.info(
//   //     'Witness the fitness - fresh resourcePerformanceEntry',
//   //     event.payload
//   //   )
//   // })

//   // manager.registerEmbed(
//   //   'weather-example',
//   //   async ({ parameters }: { parameters: { [k: string]: unknown } }) => {
//   //     const location = parameters['location']
//   //     const widget = await manager.useCache('weather-' + location, async () => {
//   //       const response = await (
//   //         await fetch(`https://wttr.in/${location}?format=j1`)
//   //       ).json()
//   //       return `<p>Temperature in ${location} is: ${response.current_condition[0].temp_C} &#8451;</p>`
//   //     })
//   //     return widget
//   //   }
//   // )
// }
