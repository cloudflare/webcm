export default {
  // The Managed Components to load, with their settings and permissions
  components: [['demo', { ecommerce: true }]],
  // The target server URL to proxy
  target: 'http://127.0.0.1:8000',
  // The hostname to which WebCM should bind
  hostname: 'localhost',
  // The tracking URL will get all POST requests coming from `webcm.track`
  trackPath: '/ecweb/track',
  // The ecommerce URL will get all POST requests coming from `webcm.ecommerce`
  ecommerceEventsPath: '/ecweb/ecommerce',
  // The tracking URL with get all POST requests coming from client events
  clientEventsPath: '/ecweb/system',
  // The port WebCM should listen to
  port: 1337,
  // Optional: hash key to make sure cookies set by WebCM aren't tampered with
  cookiesKey: 'something-very-secret',
}
