import { getEcommerceParams } from './ecommerce.mjs'
import { gaDoubleClick } from './gaDoubleClick.mjs'
import { getToolRequest } from './requestBuilder.mjs'

const BASE_URL = 'https://www.google-analytics.com/collect?'

export default async function (manager, settings) {
  // ====== Subscribe to User-Configured Events ======
  manager.addEventListener('event', event => sendGA3Event(event, settings))

  // ====== Subscribe to Pageview Events ======
  manager.addEventListener('pageview', event => sendGA3Event(event, settings))

  // ====== Subscribe to Ecommerce Events ======
  manager.addEventListener('ecommerce', async event => {
    sendGA3Event(event, settings, true)
  })
}

const getFullURL = requestPayload => {
  const params = new URLSearchParams(requestPayload).toString()
  return BASE_URL + params
}

/**
 * Google Analytics has the same behaviour for both Pageviews and User-Configured Events
 * This function will be used to handle both types of events
 * */
const sendGA3Event = function (event, settings, ecommerce = false) {
  const requestPayload = getToolRequest(event)

  const ecommerceParams = {}
  ecommerce && (ecommerceParams = getEcommerceParams(event))

  const finalURL = getFullURL({ ...requestPayload, ...ecommerceParams })
  fetch(finalURL)

  // TODO should this be send before handling ecommerce? I think I had this question before
  // and the answer was yes :-?
  if (settings['ga-audiences'] || settings['ga-doubleclick']) {
    gaDoubleClick(event, finalURL)
  }
}
