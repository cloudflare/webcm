const EVENTS: { [k: string]: string } = {
  'Product Added': 'add_to_cart',
  'Product Added to Wishlist': 'add_to_wishlist',
  'Product Removed': 'remove_from_cart',
  'Product Clicked': 'select_item',
  'Product Viewed': 'view_item',
  'Cart Viewed': 'view_cart',
  'Product List Viewed': 'view_item_list',
  'Products Searched': 'view_search_results',
  'Clicked Promotion': 'select_promotion',
  'Viewed Promotion': 'view_promotion',
  'Checkout Started': 'begin_checkout',
  'Checkout Step Completed': 'checkout_progress',
  'Payment Info Entered': 'add_payment_info',
  'Order Completed': 'purchase',
  'Order Refunded': 'refund',
}

const PRODUCT_DETAILS: string[] = [
  'cart_id',
  'product_id',
  'sku',
  'category',
  'name',
  'brand',
  'variant',
  'price',
  'quantity',
  'coupon',
  'position',

  'affiliation',
  'discount',
  'currency',
]

// list of params that will be prefixed in the request with
// ep for string values
// epn for numbers
const PREFIX_PARAMS_MAPPING: { [k: string]: string } = {
  checkout_id: 'transaction_id',
  order_id: 'transaction_id', // used in refund
  affiliation: 'affiliation',
  // the last in the list has priority - total will overwrite price for example
  price: 'value',
  value: 'value',
  total: 'value',
  shipping: 'shipping',
  tax: 'tax',
  coupon: 'coupon',
  payment_type: 'payment_type',
  list_id: 'item_list_id',
  category: 'item_list_name',
  query: 'search_term',
  // promotions
  promotion_id: 'promotion_id',
  name: 'promotion_name',
  creative: 'creative_name',
  position: 'location_id',
}

// ga4 ecommerce mappings
const PRODUCT_DETAILS_MAPPING: { [k: string]: string } = {
  product_id: 'id',
  sku: 'id',
  name: 'nm',
  brand: 'br',
  category: 'ca',
  variant: 'va',
  price: 'pr',
  quantity: 'qt',
  coupon: 'cp',
}
const _listMapping: { [k: string]: string } = {
  id: 'id',
  name: 'nm',
  brand: 'br',
  variant: 'va',
  list_name: 'ln',
  list_position: 'lp',
  list: 'ln',
  position: 'lp',
  creative: 'cn',
}

const _prepareStringContent = function (value: any) {
  value = String(value)
  return ('' + value).replace(/~/g, function () {
    return '~~'
  })
}

// takes a GA4 item and turns it into a query parameter
// eg: id45790-32~caGames~nmMonopoly: 3rd Edition~pr19~qt1
const buildProductRequest = (item: { [k: string]: any }) => {
  const allKeys = {}
  for (const [id, value] of Object.entries(item)) {
    const result: { [k: string]: string } = {}
    const preppedValue = _prepareStringContent(value)
    Object.prototype.hasOwnProperty.call(PRODUCT_DETAILS_MAPPING, id) &&
      (result[PRODUCT_DETAILS_MAPPING[id]] = preppedValue)
    if (Object.prototype.hasOwnProperty.call(_listMapping, id)) {
      if (!Object.prototype.hasOwnProperty.call(result, _listMapping[id])) {
        result[_listMapping[id]] = preppedValue
      }
    }
    Object.assign(allKeys, result)
  }

  const resultList = []
  for (const [key, val] of Object.entries(allKeys)) {
    resultList.push('' + key + val)
  }

  return resultList.join('~')
}

// product comes in standard format
// returns GA4's standard item
const mapProductToItem = (product: any) => {
  const eventProductDescription = PRODUCT_DETAILS
  const item: any = {}
  for (const prop of eventProductDescription) {
    product[prop] && (item[prop] = product[prop])
  }
  return item
}

export { EVENTS, mapProductToItem, PREFIX_PARAMS_MAPPING, buildProductRequest }
