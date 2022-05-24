import { ComponentSettings, MCEvent } from '../../lib/manager'

export const gaDoubleClick = (
  event: MCEvent,
  settings: ComponentSettings,
  finalUrl: string
) => {
  const { payload, client } = event
  const analyticsURL = new URL(finalUrl)
  const jid = analyticsURL.searchParams.get('jid')
  const gjid = analyticsURL.searchParams.get('gjid')
  const cid = analyticsURL.searchParams.get('cid')

  // Build the DoubleClick request first, because it's also needed for GA-Audiences
  const baseDoubleClick = 'https://stats.g.doubleclick.net/j/collect?'
  const doubleClick: any = {
    t: 'dc',
    aip: 1,
    _r: 3,
    v: 1,
    _v: 'j86',
    tid: payload.tid,
    cid: cid,
    jid: jid,
    gjid: gjid,
    _u: 'KGDAAEADQAAAAC~',
    z: Math.floor(2147483647 * Math.random()),
  }

  const doubleClickParams = new URLSearchParams(doubleClick).toString()
  const finalDoubleClickURL = baseDoubleClick + doubleClickParams

  if (
    settings['ga-audiences'] &&
    (!client.get('_z_ga_audiences') || client.get('_z_ga_audiences') !== cid)
  ) {
    // Build the GA Audiences request
    const audiences: any = {
      ...doubleClick,
      t: 'sr',
      _r: 4,
      slf_rd: 1,
    }
    const audienceParams = new URLSearchParams(audiences).toString()
    const baseAudienceURL = 'https://www.google.com/ads/ga-audiences?'
    const finalAudienceURL = baseAudienceURL + audienceParams
    let clientJSAudience = ''
    // Call GA-Audiences on Google.com
    client.fetch(finalAudienceURL)
    client.set('_z_ga_audiences', cid, { scope: 'infinite' })

    // Trigger the DoubleClick with XHR because we need the response text - it holds the local Google domain
    clientJSAudience += `x=new XMLHttpRequest,x.withCredentials=!0,x.open("POST","${finalDoubleClickURL}",!0),x.onreadystatechange=function(){`
    clientJSAudience += `if (4 == x.readyState) {`
    clientJSAudience += `const domain = x.responseText.trim();`
    clientJSAudience += `if (domain.startsWith("1g") && domain.length > 2) {`

    // Trigger the request to the local Google domain too
    clientJSAudience += `fetch("${finalAudienceURL}".replace("www.google.com", "www.google."+domain.slice(2)));`
    clientJSAudience += `}}`
    clientJSAudience += `},x.send();`
    client.execute(clientJSAudience)
  } else {
    // If no GA-Audiences, just trigger DoubleClick normally
    client.fetch(finalDoubleClickURL)
  }
}
