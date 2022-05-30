import { ComponentSettings, MCEvent } from '@managed-components/types'
import { getRequestBody } from './track'

/**
 * Mapping the standard MC ecommerce API to FB ecommerce event names
 */
const EVENT_NAMES_MAP: { [k: string]: string } = {
  'Order Completed': 'Purchase',
  'Product Added': 'AddToCart',
  'Products Searched': 'Search',
  'Checkout Started': 'InitiateCheckout',
  'Payment Info Entered': 'AddPaymentInfo',
  'Product Added to Wishlist': 'AddToWishlist',
  'Product Viewed': 'ViewContent',
}

const getContentName = (payload: any) => {
  return [
    ...(payload.products?.map((p: any) => p.name) || []),
    ...((payload.name && [payload.name]) || []),
  ]
    .filter(n => n)
    .join()
}

const getContentIds = (payload: any) => {
  return [
    ...(payload.products?.map((p: any) => p.sku || p.product_id) || []),
    ...(((payload.sku || payload.product_id) && [
      payload.sku || payload.product_id,
    ]) ||
      []),
  ]
}

const getValue = (payload: any) =>
  payload.value || payload.price || payload.total || payload.revenue

const mapEcommerceData = (event: MCEvent) => {
  const { payload, client } = event

  const custom_data: { [k: string]: any } = {}

  custom_data.currency = payload.currency
  custom_data.content_type = 'product'
  custom_data.content_ids = getContentIds(payload)
  custom_data.content_name = getContentName(payload)
  custom_data.content_category = payload.category
  custom_data.value = getValue(payload)
  payload.order_id && (custom_data.order_id = payload.order_id)

  if (
    event.name &&
    ['Checkout Started', 'Order Completed'].includes(event.name)
  ) {
    custom_data.num_items = (payload.products?.length || 1).toString()
  }
  if (event.name === 'Products Searched') {
    custom_data.search_string = client.url.search
  }

  return custom_data
}

export const getEcommerceRequestBody = async (
  event: MCEvent,
  settings: ComponentSettings
) => {
  const request = await getRequestBody(event, settings)

  request.event_name = EVENT_NAMES_MAP[event.name || ''] || event.name
  delete request.custom_data.eventName

  request.custom_data = { ...request.custom_data, ...mapEcommerceData(event) }

  return request
}
