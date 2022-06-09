import { ComponentSettings, Manager, MCEvent } from '@managed-components/types'

const TRACK_URL = 'https://px.ads.linkedin.com/collect/'

// The pid query parameter, when used alone, is a pageview.
// Together with a conversionId it becomes a conversion event.
// conversionIds are typically supplied per 'event'
const handler = (pid: string) => async (event: MCEvent) => {
  const payload = {
    fmt: 'js',
    v: 2,
    url: event.client.url.href,
    time: new Date().valueOf(),
    pid,
    ...event.payload,
  }

  if (Object.keys(payload).length) {
    const params = new URLSearchParams(payload).toString()
    event.client.fetch(`${TRACK_URL}?${params}`)
  }
}

export default async function (manager: Manager, { pid }: ComponentSettings) {
  manager.addEventListener('pageview', handler(pid))
  manager.addEventListener('event', handler(pid))
}
