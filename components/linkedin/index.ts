import { ComponentSettings, Manager } from '../../lib/manager'

const TRACK_URL = 'https://px.ads.linkedin.com/collect/'

export default async function (manager: Manager, { pid }: ComponentSettings) {
  manager.addEventListener('pageview', async event => {
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
  })

  manager.addEventListener('event', async event => {
    const payload = {
      fmt: 'js',
      v: 2,
      url: event.client.url.href,
      time: new Date().valueOf(),
      ...event.payload,
    }

    if (Object.keys(payload).length) {
      const params = new URLSearchParams(payload).toString()
      event.client.fetch(`${TRACK_URL}?${params}`)
    }
  })
}
