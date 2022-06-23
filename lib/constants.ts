export const PERMISSIONS: { [k: string]: string } = {
  serve: 'serve_static_files',
  proxy: 'provide_server_functionality',
  route: 'provide_server_functionality',
  widget: 'provide_widget',
  // client permissions
  clientGet: 'access_client_kv',
  clientExtGet: 'access_extended_client_kv',
  clientSet: 'access_client_kv',
  clientExecute: 'execute_unsafe_scripts',
  clientFetch: 'client_network_requests',
}
