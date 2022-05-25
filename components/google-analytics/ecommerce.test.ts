import { Client } from '../../lib/client'
import { MCEvent } from '../../lib/manager'
import { getEcommerceParams } from './ecommerce'

const KNOWN_NON_ECOMMMERCE_KEYS = [
  '_gid', // google id
  '_r', // TBC - what is this?
  '_s', // interaction step
  '_u', // "usage"
  '_v', // client version
  'a', // adsense id
  'cid', // client id
  'de', // document encoding
  'dl', // document location
  'dt', // document title
  'ev', // event value
  'gjid', // google job id
  'gtm', // gtm container id
  'je', // java enabled
  'jid', // random number
  'ni', // noninteraction
  'sd', // screen color depth
  'sr', // screen resolution
  'tid', // tracking id
  'ua', // user agent
  'uip', // user ip
  'ul', // user language
  'v', // version
  'vp', // viewport
  'z', // random number
]

describe('EEC getToolRequest', () => {
  const mockEvent = new Event('ecommerce') as MCEvent
  mockEvent.client = {} as unknown as Client
  mockEvent.name = 'Product Added'
  mockEvent.payload = {
    cart_id: 'skdjsidjsdkdj29j',
    product_id: '507f1f77bcf86cd799439011',
    sku: 'G-32',
    category: 'Games',
    name: 'Monopoly: 3rd Edition',
    brand: 'Hasbro',
    currency: 'USD',
    variant: '200 pieces',
    price: 18.99,
    quantity: 1,
    coupon: 'MAYDEALS',
    step: 3,
    shipping: 12,
    revenue: 21.99,
    total: 18.99,
    tax: 4,
    list_id: 'totally unique list id',
    position: 'way up top',
    url: 'https://www.example.com/product/path',
    image_url: 'https://www.example.com/product/path.jpg',
    products: [
      {
        brand: 'Hasbro',
        product_id: '507f1f77bcf86cd799439011',
        sku: '45790-32',
        name: 'Monopoly: 3rd Edition',
        quantity: 1,
        price: 19,
        category: 'Games',
        variant: '200 pieces',
        url: 'https://www.example.com/product/path',
        image_url: 'https://www.example.com/product/path.jpg',
      },
      {
        variant: '200 pieces',
        brand: 'Hasbro',
        product_id: '505bd76785ebb509fc183733',
        sku: '46493-32',
        name: 'Uno Card Game',
        quantity: 2,
        price: 3,
        position: 2,
        category: 'Games',
      },
    ],
  }

  it('returns correct request object values for a "Product Added" event', () => {
    mockEvent.name = 'Product Added'
    const rawParams = getEcommerceParams(mockEvent)
    const expectedEcommerceNonRandomInts = {
      ea: 'add_to_cart',
      t: 'event',
      cu: 'USD',
      ec: 'ecommerce',
      pa: 'add',
      pr1id: '45790-32',
      pr1nm: 'Monopoly: 3rd Edition',
      pr1pr: 19,
      pr1qt: 1,
      pr1ps: 'way up top',
      pr1br: 'Hasbro',
      pr1ca: 'Games',
      pr1va: '200 pieces',
      pr2br: 'Hasbro',
      pr2ca: 'Games',
      pr2id: '46493-32',
      pr2nm: 'Uno Card Game',
      pr2pr: 3,
      pr2ps: 2,
      pr2qt: 2,
      pr2va: '200 pieces',
      cos: 3,
      pal: 'totally unique list id',
      tr: 21.99,
      ts: 12,
      tt: 4,
    }
    const { gjid, jid, z, ...nonRandomInts } = rawParams
    const { cid, dl, dt, sr, ua, uip, ul, v, vp, ...ecommerce } = nonRandomInts
    expect(ecommerce).toEqual(expectedEcommerceNonRandomInts)
  })

  const PARAM_SAMPLES = [
    [
      'Product Viewed',
      'v=1&_v=j96&a=446283257&t=event&ni=1&_s=2&dl=https%3A%2F%2Fenhancedecommerce.appspot.com%2Fitem%2Fdc646&ul=en-gb&de=UTF-8&dt=Product%20View&sd=30-bit&sr=1440x900&vp=756x796&je=0&ec=engagement&ea=view_item&_u=SCCAAUAL~&jid=&gjid=&cid=584451219.1643125233&tid=UA-41425441-17&_gid=1435971536.1643125233&gtm=2ou1o0&pa=detail&pr1id=dc646&pr1nm=Lunchpod%20T-Shirt&pr1pr=90.00&pr1br=Lunchpod&pr1ca=T-Shirts&z=927989127',
    ],
    [
      'Product Clicked',
      'v=1&_v=j96&a=424041947&t=event&_s=7&dl=https%3A%2F%2Fenhancedecommerce.appspot.com%2Fcheckout&ul=en-gb&de=UTF-8&dt=Checkout&sd=30-bit&sr=1440x900&vp=565x796&je=0&ec=engagement&ea=select_content&el=product&_u=SCCAAUALAAAAAC~&jid=1366390561&gjid=740475387&cid=584451219.1643125233&tid=UA-41425441-17&_gid=1435971536.1643125233&_r=1&gtm=2ou1o0&pa=click&pr1id=dc646&pr1nm=Lunchpod%20T-Shirt&pr1pr=90.00&pr1br=Lunchpod&pr1ca=T-Shirts&pal=shirts%20you%20may%20like&pr1ps=1&z=408658493',
    ],
    [
      'Product Removed',
      'v=1&_v=j96&a=446283257&t=event&cu=USD&_s=6&dl=https%3A%2F%2Fenhancedecommerce.appspot.com%2Fitem%2Fdc646&ul=en-gb&de=UTF-8&dt=Product%20View&sd=30-bit&sr=1440x900&vp=756x796&je=0&ec=ecommerce&ea=remove_from_cart&_u=SCCAAUAL~&jid=&gjid=&cid=584451219.1643125233&tid=UA-41425441-17&_gid=1435971536.1643125233&gtm=2ou1o0&pa=remove&pr1id=dc646&pr1nm=Lunchpod%20T-Shirt&pr1pr=90.00&pr1qt=1&pr1br=Lunchpod&pr1ca=T-Shirts&pr1va=red&z=1297694514',
    ],
    [
      'Checkout Step Viewed',
      'v=1&_v=j96&a=1446574094&t=event&cu=USD&_s=4&dl=https%3A%2F%2Fenhancedecommerce.appspot.com%2Fcheckout&ul=en-gb&de=UTF-8&dt=Checkout&sd=30-bit&sr=1440x900&vp=618x796&je=0&ec=ecommerce&ea=checkout_progress&ev=47&_u=SCCAAUAL~&jid=&gjid=&cid=584451219.1643125233&tid=UA-41425441-17&_gid=1435971536.1643125233&gtm=2ou1o0&cos=1&pa=checkout&pr1id=b55da&pr1nm=Flexigen%20T-Shirt&pr1pr=16.00&pr1qt=1&pr1br=Flexigen&pr1ca=T-Shirts&pr1va=green&pr2id=7w9e0&pr2nm=Masons%20T-Shirt&pr2pr=31.00&pr2qt=1&pr2br=Masons&pr2ca=T-Shirts&pr2va=blue&pr2ps=1&z=292982504',
    ],
    [
      'Order Completed',
      'v=1&_v=j96&a=1446574094&t=event&cu=USD&_s=10&dl=https%3A%2F%2Fenhancedecommerce.appspot.com%2Fcheckout&ul=en-gb&de=UTF-8&dt=Checkout&sd=30-bit&sr=1440x900&vp=618x796&je=0&ec=ecommerce&ea=purchase&ev=57&_u=SCCAAUALAAAAAC~&jid=&gjid=&cid=584451219.1643125233&tid=UA-41425441-17&_gid=1435971536.1643125233&gtm=2ou1o0&pa=purchase&pr1id=b55da&pr1nm=Flexigen%20T-Shirt&pr1pr=16.00&pr1qt=1&pr1br=Flexigen&pr1ca=T-Shirts&pr1va=green&pr2id=7w9e0&pr2nm=Masons%20T-Shirt&pr2pr=31.00&pr2qt=1&pr2br=Masons&pr2ca=T-Shirts&pr2va=blue&pr2ps=1&tr=57&tt=5.00&ts=5.00&z=1619564747&ti=507f1f77bcf86cd799439011',
    ],
    [
      'Order Refunded',
      'v=1&_v=j96&a=1446574094&t=event&cu=USD&_s=10&dl=https%3A%2F%2Fenhancedecommerce.appspot.com%2Fcheckout&ul=en-gb&de=UTF-8&dt=Checkout&sd=30-bit&sr=1440x900&vp=618x796&je=0&ec=ecommerce&ea=purchase&ev=57&_u=SCCAAUALAAAAAC~&jid=&gjid=&cid=584451219.1643125233&tid=UA-41425441-17&_gid=1435971536.1643125233&gtm=2ou1o0&pa=purchase&pr1id=b55da&pr1nm=Flexigen%20T-Shirt&pr1pr=16.00&pr1qt=1&pr1br=Flexigen&pr1ca=T-Shirts&pr1va=green&pr2id=7w9e0&pr2nm=Masons%20T-Shirt&pr2pr=31.00&pr2qt=1&pr2br=Masons&pr2ca=T-Shirts&pr2va=blue&pr2ps=1&tr=57&tt=5.00&ts=5.00&z=1619564747',
    ],
  ]

  PARAM_SAMPLES.forEach(([eventName, params]) => {
    describe(`for ${eventName} event`, () => {
      mockEvent.name = eventName
      const rawParams = getEcommerceParams(mockEvent)
      const actuallySentExample = Object.fromEntries(
        // Pasted query params direct from browser console
        new URLSearchParams(params)
      )
      const actualKeysSent = Object.keys(actuallySentExample)
      const keysWouldSend = Object.keys(rawParams)

      it('includes all expected keys', () => {
        for (const expectedKey of actualKeysSent) {
          !KNOWN_NON_ECOMMMERCE_KEYS.includes(expectedKey) &&
            expect(keysWouldSend).toContain(expectedKey)
        }
      })
    })
  })
})
