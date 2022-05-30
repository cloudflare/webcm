import { ComponentSettings, Manager } from '@managed-components/types'
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
  manager.addEventListener('event', async event => {
    const request = await getRequestBody(event, settings)
    sendEvent(request, settings)
  })

  manager.addEventListener('pageview', async event => {
    const request = await getRequestBody(event, settings)
    sendEvent(request, settings)
  })

  manager.addEventListener('ecommerce', async event => {
    const request = await getEcommerceRequestBody(event, settings)
    sendEvent(request, settings)
  })
}
