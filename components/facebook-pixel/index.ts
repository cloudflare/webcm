import { ComponentSettings, Manager, MCEvent } from '../../lib/manager'
import { getEcommerceRequestBody } from './ecommerce'
import { getRequestBody } from './track'

const sendEvent = async (payload: any, settings: ComponentSettings) => {
  const property = settings.property
  const graphEndpoint = `https://graph.facebook.com/v13.0/${property}/events`

  const requestBody = {
    data: [payload],
    access_token: settings.accessToken,
    // TODO proably this will come with the request and it will not be part of the settings
    // and if it comes in the request it will be automatically added to the request ?
    ...(settings.testKey && {
      test_event_code: settings.testKey,
    }),
  }

  console.log('Sending event:', JSON.stringify(requestBody))

  fetch(graphEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
}

export default async function (manager: Manager, settings: ComponentSettings) {
  // ====== Subscribe to User-Configured Events ======
  manager.addEventListener('event', async (event: MCEvent) => {
    const request = await getRequestBody(event, settings)
    sendEvent(request, settings)
  })

  // ====== Subscribe to Pageview Events ======
  manager.addEventListener('pageview', async (event: MCEvent) => {
    const request = await getRequestBody(event, settings)
    sendEvent(request, settings)
  })

  // ====== Subscribe to Ecommerce Events ======
  manager.addEventListener('ecommerce', async (event: MCEvent) => {
    const request = await getEcommerceRequestBody(event, settings)

    sendEvent(request, settings)
  })
}
