webcm.ecommerce =
  webcm.ecommerce ||
  ((name, payload) =>
    webcm.track({ event: 'ecommerce', name, ecommerce: payload }, 2))
