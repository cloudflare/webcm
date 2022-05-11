webcm.ecommerce =
  webcm.ecommerce ||
  ((name, payload) => webcm.track({ event: 'ecommerce', name, payload }, true))
