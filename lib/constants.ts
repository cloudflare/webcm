export const PERMISSIONS = {
  SERVE: 'serve_static',
  PROXY: 'server_functions',
  ROUTE: 'server_functions',
  WIDGET: 'provide_widget',
  // client permissions
  CLIENT_GET: 'client_kv',
  CLIENT_EXT_GET: 'client_ext_kv',
  CLIENT_SET: 'client_kv',
  CLIENT_EXECUTE: 'run_client_js',
  CLIENT_FETCH: 'client_fetch',
  // manager specific permissions
  HOOK_USER_EVENTS: 'hook_user_events',
  PAGEVIEW: 'pageview',
  CLIENT_CREATED: 'client_created',
}

export const MANAGER_EVENTS = {
  CLIENT_CREATED: 'clientcreated',
  PAGEVIEW: 'pageview',
  ECOMMERCE: 'ecommerce',
  USER_EVENT: 'event',
}
