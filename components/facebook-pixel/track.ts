import * as crypto from 'crypto'
import { ComponentSettings, MCEvent } from '../../lib/manager'
import { flattenKeys } from './utils'

const USER_DATA: { [k: string]: any } = {
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
function fbCookieBase(event: MCEvent) {
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

/**
 * Fetch FBP cookie
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc/
 **/
const getFBP = (event: MCEvent) => {
  const { client } = event
  let fbp = ''
  if (client.get('_fbp')) {
    // If it exists, great - we use it!
    fbp = client.get('_fbp')
  } else {
    // If _fbp is missing, we are generating it, saving it as cookie
    fbp = fbCookieBase(event) + String(Math.round(2147483647 * Math.random()))
    client.set('_fbp', fbp)
  }

  return fbp
}

/**
 * Fetch FBC cookie
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc/
 **/
const getFBC = (event: MCEvent) => {
  const { client } = event

  let fbc = ''
  if (client.get('_fbc')) {
    fbc = client.get('_fbc')
  }

  // Check if we can extract it from the URL
  if (client.url.searchParams?.get('fbclid')) {
    fbc = fbCookieBase(event) + client.url.searchParams?.get('fbclid')
    client.set('_fbc', fbc)
  }

  return fbc
}

const getBaseRequest = (event: MCEvent, settings: ComponentSettings) => {
  const { client, payload } = event
  const eventId = String(Math.round(Math.random() * 100000000000000000))
  const fbp = getFBP(event)

  const request: { [k: string]: any } = {
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

  return request
}

export const getRequestBody = async (
  event: MCEvent,
  settings: ComponentSettings
) => {
  const { payload } = event

  const fbc = getFBC(event)
  const request = getBaseRequest(event, settings)

  // appending hashed user data
  const encoder = new TextEncoder()
  for (const [key, options] of Object.entries(USER_DATA)) {
    let value = payload[key]
    if (value) {
      if (options.hashed) {
        const data = encoder.encode(value.trim().toLowerCase())
        value = await crypto.createHash('sha256').update(data).digest('hex')
      }
      request.user_data[key] = value
      delete payload[key]
    }
  }

  if (fbc) {
    request.user_data.fbc = fbc
  }

  request.custom_data = flattenKeys(payload)

  return request
}
