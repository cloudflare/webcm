import { Manager } from '@managed-components/types'

export default async function (manager: Manager) {
  manager.addEventListener('event', event => {
    const { client, payload } = event

    payload.tid = client.get('upward_tid')

    for (const param in payload) {
      if (
        payload[param] === undefined ||
        payload[param] === null ||
        payload[param] === ''
      ) {
        delete payload[param]
      }
    }

    if (Object.keys(payload).length) {
      const params = new URLSearchParams(payload).toString()
      fetch(`https://www.upward.net/search/u_convert.fsn?${params}`)
    }
  })

  manager.addEventListener('pageview', async event => {
    const { client } = event
    const tid = client.url.searchParams.get('tid')
    if (tid) {
      client.set('upward_tid', tid, {
        scope: 'infinite',
      })
    }
  })
}
