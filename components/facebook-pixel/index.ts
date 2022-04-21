import { ComponentSettings, Manager } from '../../lib/index'
import { sha256, flattenKeys } from '../../lib/utils'

export default async function (manager: Manager, settings: ComponentSettings) {
  // ====== Subscribe to User-Configured Events ======
  manager.addEventListener(
    'event',
    async event => await sendFbEvent(event, settings)
  )

  // ====== Subscribe to Pageview Events ======
  manager.addEventListener(
    'pageview',
    async event => await sendFbEvent(event, settings)
  )

  // ====== Subscribe to Ecommerce Events ======
  manager.addEventListener(
    'ecommerce',
    async event => await sendFbEvent(event, settings)
  )
}

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

const sendFbEvent = async (event: Event, settings: ComponentSettings) => {
  const { client, payload } = event

  const eventId = String(Math.round(Math.random() * 100000000000000000))

  // Build the start of every FB Cookie
  function fbCookieBase() {
    return (
      'fb.' +
      (client.page.url.hostname
        ? client.page.url.hostname.split('.').length - 1
        : client.page.url.href.split('/')[2].split('.').length - 1) +
      '.' +
      new Date().valueOf() +
      '.'
    )
  }

  // Try fetching the FBC and FBP cookies
  // https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc/
  let fbc = ''
  if (client.get['_fbc']) {
    fbc = client.get['_fbc']
  }

  // Check if we can extract it from the URL
  if (client.page.query.fbclid) {
    fbc = fbCookieBase() + client.page.query.fbclid
    client.set('_fbc', fbc)
  }

  let fbp = ''
  if (client.get['_fbp']) {
    // If it exists, great - we use it!
    fbp = client.get['_fbp']
  } else {
    // If _fbp is missing, we are generating it, saving it as cookie, and sending one request from the client side too
    fbp = fbCookieBase() + String(Math.round(2147483647 * Math.random())) // This is taken from the FB pixel code
    client.set('_fbp', fbp)

    console.log("Facebook cookie wasn't available, going light mode once")
    const params: { [k: string]: any } = {
      it: new Date().valueOf(),
      id: payload.property,
      ev: payload.ev,
      eid: eventId,
      dl: client.page.url.href,
      rl: client.page.referrer || '',
      if: false,
      sw: client.device.width, // TODO do we have all this info under client already? I don't think so
      sh: client.device.height,
      v: '2.9.33',
      r: 'stable',
      fbp: fbp,
      coo: false, // seems to be true for "codeless" events, maybe created from the online GUI
      rqm: 'GET',
      ts: new Date().valueOf(),
    }

    if (fbc) params.fbc = fbc

    for (const p in payload) {
      if (!['ev', 'property'].includes(p)) {
        params[`cd[${[p]}]`] = payload[p]
      }
    }
  }

  // ====== starting FB cloud load ======

  const request: { [k: string]: any } = {
    event_name: payload.ev,
    event_id: eventId,
    action_source: 'website',
    event_time: client.misc.timestamp, // TODO also this misc.timestamp, do we even really need it here?
    event_source_url: client.page.url.href,
    data_processing_options: [],
    user_data: {
      fbp: fbp,
      ...(settings.hideOriginalIP && {
        // From https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters :
        // If you send client_ip_address or client_user_agent, you must send both keys.
        client_user_agent: client.device.userAgent.ua,
        client_ip_address: client.device.ip,
      }),
    },
    custom_data: {},
  }

  for (const [key, options] of Object.entries(USER_DATA)) {
    let value = payload[key]
    if (value) {
      if (options.hashed) {
        value = await sha256(value.trim().toLowerCase())
      }
      request.user_data[key] = value
      delete payload[key]
    }
  }

  if (fbc) {
    request.user_data.fbc = fbc
  }

  delete payload.ev
  const property = payload.property
  delete payload.property

  request.custom_data = payload

  if (client.__zarazEcommerce === true) {
    request.custom_data.currency = client.currency
    request.custom_data.content_ids = [
      ...(client.products?.map((p: any) => p.sku || p.product_id) || []),
      ...(((client.sku || client.product_id) && [
        client.sku || client.product_id,
      ]) ||
        []),
    ]

    request.custom_data.content_name = [
      ...(client.products?.map((p: any) => p.name) || []),
      ...((client.name && [client.name]) || []),
    ]
      .filter(n => n)
      .join()

    request.custom_data.content_category = client.category
    request.custom_data.value =
      client.value || client.price || client.total || client.revenue

    switch (client.__zarazTrack) {
      case 'Order Completed':
        request.event_name = 'PURCHASE'
        break
      case 'Product Added':
        request.event_name = 'ADD_TO_CART'
        break
      case 'Checkout Started':
        request.event_name = 'INITIATE_CHECKOUT'
        request.custom_data.num_items = (
          client.products?.length || 1
        ).toString()
        break
      case 'Payment Info Entered':
        request.event_name = 'ADD_PAYMENT_INFO'
        break
      case 'Product Added to Wishlist':
        request.event_name = 'ADD_TO_WISHLIST'
        break
      case 'Product Viewed':
        request.event_name = 'VIEW_CONTENT'
        break
      default:
        request.event_name = client.__zarazTrack
    }

    const additionalData = flattenKeys(client)
    delete additionalData.__zarazTrack
    request.custom_data = { ...additionalData, ...request.custom_data }
  }

  // TODO how do we handle secrets here? or the settings.testKey???
  const requestBody = {
    data: [request],
    // access_token: event.secrets.accessToken,
    // ...(event.settings.testKey && {
    //   test_event_code: event.settings.testKey,
    // }),
  }

  const graphEndpoint = `https://graph.facebook.com/v11.0/${property}/events`
  fetch(graphEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
}
