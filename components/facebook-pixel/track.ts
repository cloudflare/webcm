import { ComponentSettings, MCEvent } from '@managed-components/types'
import * as crypto from 'crypto'
import { flattenKeys } from './utils'

const USER_DATA: Record<string, { hashed?: boolean }> = {
  em: { hashed: true },
  ph: { hashed: true },
  fn: { hashed: true },
  ln: { hashed: true },
  db: { hashed: true },
  ge: { hashed: true },
  ct: { hashed: true },
  st: { hashed: true },
  zp: { hashed: true },
  country: { hashed: true },
  external_id: { hashed: true },
  subscription_id: {},
  fb_login_id: {},
  lead_id: {},
}

// Build the start of every FB Cookie
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc/
const fbCookieBase = (event: MCEvent) => {
  const { client } = event
  return (
    'fb.' +
    (client.url.hostname
      ? client.url.hostname.split('.').length - 1
      : client.url.href.split('/')[2].split('.').length - 1) +
    '.' +
    new Date().valueOf() +
    '.'
  )
}

const setNewFBP = (event: MCEvent) => {
  const val =
    fbCookieBase(event) + String(Math.round(2147483647 * Math.random()))
  event.client.set('fb-pixel', val)
  return val
}

const getFBC = (event: MCEvent) => {
  const { client } = event
  let fbc = client.get('fb-click') || ''

  if (client.url.searchParams?.get('fbclid')) {
    fbc = fbCookieBase(event) + client.url.searchParams.get('fbclid')
    client.set('fb-click', fbc)
  }
  return fbc
}

const getBaseRequestBody = (event: MCEvent, settings: ComponentSettings) => {
  const { client, payload } = event
  const eventId = String(Math.round(Math.random() * 100000000000000000))
  const fbp = event.client.get('fb-pixel') || setNewFBP(event)

  const body: { [k: string]: any } = {
    event_name: payload.ev || event.name || event.type,
    event_id: eventId,
    action_source: 'website',
    event_time: client.timestamp && Math.floor(client.timestamp / 1000),
    event_source_url: client.url.href,
    data_processing_options: [],
    user_data: {
      fbp,
      ...(!settings.hideClientIP && {
        client_user_agent: client.userAgent,
        client_ip_address: client.ip,
      }),
    },
    custom_data: {},
  }
  delete payload.ev

  return body
}

export const getRequestBody = async (
  event: MCEvent,
  settings: ComponentSettings
) => {
  const { payload } = event
  const fbc = getFBC(event)
  const body = getBaseRequestBody(event, settings)

  // appending hashed user data
  const encoder = new TextEncoder()
  for (const [key, options] of Object.entries(USER_DATA)) {
    let value = payload[key]
    if (value) {
      if (options.hashed) {
        const data = encoder.encode(value.trim().toLowerCase())
        value = await crypto.createHash('sha256').update(data).digest('hex')
      }
      body.user_data[key] = value
      delete payload[key]
    }
  }

  if (fbc) {
    body.user_data.fbc = fbc
  }

  body.custom_data = flattenKeys(payload)

  return body
}
