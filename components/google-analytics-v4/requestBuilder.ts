import crypto from 'crypto'
import { flattenKeys, isNumber } from './utils'
import { ComponentSettings, MCEvent } from '../../lib/manager'

import {
  EVENTS,
  mapProductToItem,
  PREFIX_PARAMS_MAPPING,
  buildProductRequest,
} from './ecommerce'
const getRandomInt = () => Math.floor(2147483647 * Math.random())

const getToolRequest = (event: MCEvent, settings: ComponentSettings) => {
  const { client, payload } = event
  const requestBody: any = {
    v: 2,
    gtm: '2oe5j0', // gtm version hash
    tid: settings.tid,
    dl: client.url.href,
    dt: client.title,
    _p: getRandomInt(),
    // TODO use IP once we have it
    // _s: (params.executed && (params.executed as []).length) || 1,
    // ...(settings.hideOriginalIP && {
    //   _uip: client.device.ip,
    // }),
  }

  // TODO use referrer once we have it
  // if (client.page.referrer) {
  //   requestBody.dr = client.page.referrer
  // }

  // Check if this is a new session
  if (client.get('_ga4s')) {
    requestBody['seg'] = 1 // Session engaged
  } else {
    requestBody['seg'] = 0
    requestBody['_ss'] = 1 // Session start
    client.set('_ga4s', 1, { scope: 'session' }) // We intetionally don't want this cookie to last beyond the session
  }

  if (client.get('_ga4')) {
    // This will leave our UUID as it is, but extract the right value from tha _ga4 cookie
    requestBody['cid'] = client.get('_ga4').split('.').slice(-2).join('.')
  } else {
    const uid = crypto.randomUUID()

    requestBody['cid'] = uid
    client.set('_ga4', uid, { scope: 'infinite' })
    // Also mark as "First Visit"
    requestBody['_fv'] = 1
  }

  requestBody['sid'] = client.get('_ga4sid')
  if (!requestBody['sid']) {
    requestBody['sid'] = getRandomInt()
    client.set('_ga4sid', requestBody['sid'], { scope: 'infinite' })
  }

  /* Start of gclid treating, taken from our Google Conversion Pixel implementation */
  if (client.url.searchParams?.get('_gl')) {
    try {
      const _gl = client.url.searchParams?.get('_gl') as string
      const gclaw = atob(
        // because it's in a try-catch already
        _gl.split('*').pop()?.replaceAll('.', '') || ''
      )
      client.set('_gclaw', gclaw, { scope: 'infinite' })
      requestBody.gclid = gclaw.split('.').pop()
    } catch (e) {
      console.log('Google Analytics: Error parsing gclaw', e)
    }
  }
  if (client.get('_gcl_aw')) {
    requestBody.gclid = client.get('_gcl_aw').split('.').pop()
  }
  if (client.get('gclid')) {
    requestBody.gclid = client.get('gclid')
  }
  /* End of gclid treating */

  if (requestBody.gclid) {
    const url = new URL(requestBody.dl)
    url.searchParams.get('gclid') ||
      url.searchParams.append('gclid', requestBody.gclid) // If DL doesn't have gclid in it, add it
    requestBody.dl = url
  }

  if (client.url.searchParams?.get('utma')) {
    client.set('_utma', client.url.searchParams?.get('utma'), {
      scope: 'infinite',
    })
  }
  if (client.url.searchParams?.get('utmz')) {
    client.set('_utmz', client.url.searchParams?.get('utmz'), {
      scope: 'infinite',
    })
  }
  if (client.url.searchParams?.get('dpd')) {
    client.set('_dpd', client.url.searchParams?.get('dpd'), {
      scope: 'infinite',
    })
  }
  if (client.url.searchParams?.get('utm_wtk')) {
    client.set('utm_wtk', client.url.searchParams?.get('utm_wtk'), {
      scope: 'infinite',
    })
  }

  // TODO handle system.misc?
  if (requestBody._s > 1) {
    // const msSinceFirstEvent = system.misc.timestamp - client['zaraz.start']
    // const msSinceLastEvent =
    //   system.misc.timestampMilliseconds - (params._let as any) // _let = "_lastEventTime"
    // requestBody._et = msSinceLastEvent
  }

  const builtInKeys = ['tid', 'uid', 'en', 'ni']
  const eventData = flattenKeys(payload)

  // `up.X`s are User Properties and should stay with this perfix
  // Otherwise, it's an Event Property. If numberical - perfixed with `epn.`,
  // and if a string, it's just `ep.`
  for (const key in eventData) {
    if (!builtInKeys.includes(key) && !key.startsWith('up.')) {
      if (Number(eventData[key])) eventData['epn.' + key] = eventData[key]
      else eventData['ep.' + key] = eventData[key]
      delete eventData[key]
    }
  }

  const toolRequest = { ...requestBody, ...eventData }
  return toolRequest
}

const getFinalURL = (
  event: MCEvent,
  settings: ComponentSettings,
  ecommerce = false
) => {
  const { payload } = event
  const toolRequest = getToolRequest(event, settings)

  // ecommerce events
  if (ecommerce === true) {
    let prQueryParams

    // event name and currency will always be added as non prefixed query params
    const eventName = event.name || ''
    toolRequest.en = EVENTS[eventName] ? EVENTS[eventName] : eventName
    payload.currency && (toolRequest.cu = payload.currency)

    for (const key of Object.keys(PREFIX_PARAMS_MAPPING)) {
      const param = PREFIX_PARAMS_MAPPING[key]
      const prefix = isNumber(payload[key]) ? 'epn' : 'ep'
      payload[key] && (toolRequest[`${prefix}.${param}`] = payload[key])
    }

    if (payload.products) {
      // handle products list
      for (const [index, product] of (payload.products || []).entries()) {
        const item = mapProductToItem(product)
        prQueryParams = buildProductRequest(item)
        toolRequest[`pr${index + 1}`] = prQueryParams
      }
    } else {
      // handle single product data
      const item = mapProductToItem(payload)
      prQueryParams = buildProductRequest(item)
      if (prQueryParams) toolRequest['pr1'] = prQueryParams
    }
  }

  const queryParams = new URLSearchParams(toolRequest).toString()

  const baseURL = 'https://www.google-analytics.com/g/collect?'
  const finalURL = baseURL + queryParams

  return { finalURL, requestBody: toolRequest }
}

export { getToolRequest, getFinalURL }
