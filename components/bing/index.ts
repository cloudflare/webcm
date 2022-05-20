import { ComponentSettings, Manager, MCEvent } from '../../lib/manager'

const TRACK_URL = 'https://bat.bing.com/action/0'

const getECParams = (event: MCEvent) => {
  const { payload, name } = event
  const data: any = {
    ec: 'ecommerce',
    gc: payload.currency,
    gv: payload.revenue || payload.total || payload.value,
  }

  switch (name) {
    case 'Order Completed':
      data.ea = 'purchase'
      data.el = payload.order_id || payload.checkout_id || payload.product_id
      data.ev = payload.revenue || payload.total || payload.value
      break
    case 'Product Added':
      data.ea = 'add_to_cart'
      data.el =
        payload.name ||
        payload.product_id ||
        payload.sku ||
        payload.products?.map((p: any) => p.name).join()
      data.ev = payload.price || payload.total || payload.value
      data.gv = payload.price || data.gv
      break
    case 'Checkout Started':
      data.ea = 'begin_checkout'
      data.el = payload.checkout_id || payload.order_id || payload.product_id
      data.ev = payload.revenue || payload.total || payload.value
      break
    case 'Subscribe':
      data.ea = 'subscribe'
      data.el = payload.order_id || payload.checkout_id || payload.product_id
      data.ev = payload.revenue || payload.total || payload.value
      break
    default:
      data.ea = name
      data.el =
        payload.order_id ||
        payload.checkout_id ||
        payload.product_id ||
        payload.name ||
        payload.products?.map((p: any) => p.name).join()
      data.ev =
        payload.revenue || payload.total || payload.value || payload.price
  }
  return data
}

const getStandardParams = (event: MCEvent) => {
  return {
    Ver: '2',
    p: event.client.url.href,
    tl: event.client.title,
    lg: (event.client.language || '').split(',')[0].trim(),
    rn: (+(Math.random() * 1000000)).toString(),
    mid: crypto.randomUUID(),
    // TODO - how do we want to handle these?
    // sw: system.device.width,
    // sh: system.device.height,
    // sc: system.device.colors,
  }
}

export default async function (manager: Manager, _settings: ComponentSettings) {
  manager.addEventListener('event', async event => {
    const payload = getStandardParams(event)

    if (Object.keys(payload).length) {
      const params = new URLSearchParams(payload).toString()
      event.client.fetch(`${TRACK_URL}?${params}`)
    }
  })

  manager.addEventListener('ecommerce', async event => {
    const payload = {
      ...getStandardParams(event),
      ...getECParams(event),
    }

    if (Object.keys(payload).length) {
      const params = new URLSearchParams(payload).toString()
      event.client.fetch(`${TRACK_URL}?${params}`)
    }
  })
}
