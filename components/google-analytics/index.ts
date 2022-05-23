import { ComponentSettings, Manager, MCEvent } from '../../lib/manager'
import { getEcommerceParams } from './ecommerce'
import { gaDoubleClick } from './gaDoubleClick'
import { getToolRequest } from './requestBuilder'

const BASE_URL = 'https://www.google-analytics.com/collect?'

const getFullURL = (requestPayload: any) => {
  const params = new URLSearchParams(requestPayload).toString()
  return BASE_URL + params
}

/**
 * Google Analytics has the same behaviour for both Pageviews and User-Configured Events
 * This function will be used to handle both types of events
 * */
const sendGA3Event = function (
  event: MCEvent,
  settings: ComponentSettings,
  ecommerce = false
) {
  const requestPayload = getToolRequest(event, settings)

  let ecommerceParams = {}
  ecommerce && (ecommerceParams = getEcommerceParams(event))

  const finalURL = getFullURL({ ...requestPayload, ...ecommerceParams })
  fetch(finalURL)

  if (settings['ga-audiences'] || settings['ga-doubleclick']) {
    gaDoubleClick(event, settings, finalURL)
  }
}

export default async function (manager: Manager, settings: ComponentSettings) {
  // ====== Subscribe to User-Configured Events ======
  manager.addEventListener('event', event =>
    sendGA3Event(event, settings)
  )

  // ====== Subscribe to Pageview Events ======
  manager.addEventListener('pageview', _event => {
    // disabled until client.fetch is available for pageviews
    //sendGA3Event(event, settings)
  })

  // ====== Subscribe to Ecommerce Events ======
  manager.addEventListener('ecommerce', event => {
    sendGA3Event(event, settings, true)
  })
}
