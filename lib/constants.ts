export const PERMISSIONS: { [k: string]: string } = {
  serve: 'serve_static',
  proxy: 'server_functions',
  route: 'server_functions',
  widget: 'provide_widget',
  // client permissions
  clientGet: 'client_kv',
  clientExtGet: 'client_ext_kv',
  clientSet: 'client_kv',
  clientExecute: 'run_client_js',
  clientFetch: 'client_fetch',
  // manager specific permissions
  event: 'hook_user_events',
  pageview: 'pageview',
  clientcreated: 'client_created',
}

export const MANAGER_EVENTS = {
  clientCreated: 'clientcreated',
  pageview: 'pageview',
  ecommerce: 'ecommerce',
  userEvent: 'event',
}
