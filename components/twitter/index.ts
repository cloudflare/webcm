import { ComponentSettings, Manager, MCEvent } from '../../lib/manager'

const getStandardParams = (event: MCEvent) => {
  return {
    type: 'javascript',
    version: '1.1.0',
    p_id: 'Twitter',
    p_user_id: 0,
    tw_sale_amount: 0,
    tw_order_quantity: 0,
    tw_iframe_status: 0,
    tpx_cb: 'twttr.conversion.loadPixels',
    tw_document_href: event.client.url.href,
  }
}

const endpoints = [
  {
    url: 'https://analytics.twitter.com/i/adsct',
    data: { tpx_cb: 'twttr.conversion.loadPixels' },
  },
  { url: 'https://t.co/i/adsct', data: {} },
]

const onEvent =
  (pageview = false) =>
  async (event: MCEvent) => {
    for (const { url, data } of endpoints) {
      const payload = {
        ...getStandardParams(event),
        ...data,
        ...event.payload,
      }
      if (pageview) payload.events = '[["pageview", null]]'
      const params = new URLSearchParams(payload).toString()
      fetch(`${url}?${params}`, {
        headers: {
          'User-Agent': event.client.request.headers.get('user-agent'),
          // 'X-Forwarded-For': system.device.ip, // TODO - get IP from client?
        },
      })
    }
  }

export default async function (manager: Manager, _settings: ComponentSettings) {
  manager.addEventListener('pageview', onEvent(true))
  manager.addEventListener('event', onEvent())
}
