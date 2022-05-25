import crypto from 'crypto'
import { ComponentSettings, MCEvent } from '../../lib/manager'

const getRandomInt = () => Math.floor(2147483647 * Math.random())

export const getToolRequest = (event: MCEvent, settings: ComponentSettings) => {
  const { client, payload } = event
  const requestBody = {
    t: 'pageview',
    v: 1,
    jid: getRandomInt(),
    gjid: getRandomInt(),
    z: getRandomInt(),
    dt: client.title,
    ul: client.language,
    dl: client.url?.href,
    ua: client.userAgent,
    tid: settings.tid,
    ...(!settings?.hideOriginalIP && {
      uip: client.ip,
    }),
    ...(client.referer && { dr: client.referer }),
  } as any

  if (client.get('_ga')) {
    requestBody['cid'] = client.get('_ga').split('.').slice(-2).join('.')
  } else {
    const uid = crypto.randomUUID()
    requestBody['cid'] = uid
    client.set('_ga', uid, { scope: 'infinite' })
  }

  if (client.get('_gid')) {
    requestBody['_gid'] = client.get('_gid').split('.').slice(-2).join('.')
  }

  /* Start of gclid treating */
  if (client.url.searchParams.get('_gl')) {
    try {
      const gclaw = atob(
        // because it's in a try-catch already
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        client.url.searchParams.get('_gl').split('*').pop().replaceAll('.', '')
      )
      client.set('_gcl_aw', gclaw, { scope: 'infinite' })
      requestBody.gclid = gclaw.split('.').pop()
    } catch (e) {
      console.log('Google Analytics: Error parsing gclaw', e)
    }
  }
  if (client.get('_gcl_aw')) {
    requestBody.gclid = client.get('_gcl_aw').split('.').pop()
  }
  if (client.get('gclid')) {
    requestBody.gclid = client.get('gclid')
  }
  /* End of gclid treating */

  if (requestBody.gclid) {
    const url = new URL(requestBody.dl)
    url.searchParams.get('gclid') ||
      url.searchParams.append('gclid', requestBody.gclid) // If DL doesn't have gclid in it, add it
    requestBody.dl = url
  }

  Object.entries({
    utma: '_utma',
    utmz: '_utmz',
    dpd: '_dpd',
    utm_wtk: 'utm_wtk',
  }).forEach(([searchParam, cookieName]) => {
    if (client.url.searchParams.get(searchParam)) {
      client.set(cookieName, client.url.searchParams.get(searchParam), {
        scope: 'infinite',
      })
    }
  })

  return { ...requestBody, ...payload }
}
