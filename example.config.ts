export default {
  // The Managed Components to load, with their settings and permissions
  components: [
    {
      name: 'demo',
      settings: { ecommerce: true },
      permissions: [
        'access_client_kv',
        'provide_server_functionality',
        'provide_widget',
        'serve_static_files',
        'client_network_requests',
      ],
    },
    {
      name: 'custom-html', // adds an option to add custom HTML to the site. Run `webcm.track("event", { htmlCode: '<h1>Hello, world</h1>' })` in the browser console to see it in action
      settings: {},
      permissions: ['execute_unsafe_scripts'],
    },
    {
      name: 'google-analytics-4',
      tid: 'XXX-XXXX', // Measurement ID
      hideOriginalIP: true,
      ecommerce: false,
      baseDomain: 'localhost',
      permissions: ['access_client_kv'],
    },
  ],
  // The target server URL to proxy. If unset, webcm will spin up a simple static website and target it instead
  // target: 'http://127.0.0.1:8000',
  // The hostname to which WebCM should bind
  hostname: 'localhost',
  // The tracking URL will get all POST requests coming from `webcm.track`
  trackPath: '/webcm/track',
  // The port WebCM should listen to
  port: 1337,
  // Optional: hash key to make sure cookies set by WebCM aren't tampered with
  cookiesKey: 'something-very-secret',
}
