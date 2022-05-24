import { ComponentSettings, Manager, MCEvent } from '../../lib/manager'
import { getEcommerceRequestBody } from './ecommerce'
import { getRequestBody } from './track'

const sendEvent = async (payload: any, settings: ComponentSettings) => {
  const property = settings.property
  const graphEndpoint = `https://graph.facebook.com/v13.0/${property}/events`

  const requestBody = {
    data: [payload],
    access_token: settings.accessToken,
    ...(settings.testKey && {
      test_event_code: settings.testKey,
    }),
  }

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
