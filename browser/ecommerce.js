webcm.ecommerce =
  webcm.ecommerce ||
  ((name, payload) => webcm._track({ event: 'ecommerce', name, payload }, true))
