import { ComponentSettings, Manager, MCEvent } from '../../lib/manager'
import { getFinalURL } from './requestBuilder'

export default async function (manager: Manager, settings: ComponentSettings) {
  manager.addEventListener('event', event => sendEvent(event, settings))

  manager.addEventListener('pageview', event => {
    sendEvent(event, settings)
  })

  manager.addEventListener('ecommerce', async event =>
    sendEvent(event, settings, true)
  )
}

const sendEvent = async (
  event: MCEvent,
  settings: ComponentSettings,
  ecommerce = false
) => {
  const { client } = event
  const { finalURL, requestBody } = getFinalURL(event, settings, ecommerce)
  fetch(finalURL, {
    headers: { 'User-Agent': client.userAgent },
  })

  if (settings['ga-audiences'] || settings['ga-doubleclick']) {
    const baseDoubleClick = 'https://stats.g.doubleclick.net/g/collect?'
    const doubleClick = {
      t: 'dc',
      aip: '1',
      _r: '3',
      v: '1',
      _v: 'j86',
      tid: settings.tid,
      cid: requestBody['cid'],
      _u: 'KGDAAEADQAAAAC~',
      z: (+Math.floor(2147483647 * Math.random())).toString(),
    }
    const doubleClickParams = new URLSearchParams(doubleClick).toString()
    const finalDoubleClickURL = baseDoubleClick + doubleClickParams

    if (
      settings['ga-audiences'] &&
      (!client.get('_z_ga_audiences') ||
        client.get('_z_ga_audiences') !== requestBody['cid'])
    ) {
      // Build the GAv4 Audiences request
      const audiences = {
        ...doubleClick,
        t: 'sr',
        _r: '4',
        slf_rd: '1',
      }
      const audienceParams = new URLSearchParams(audiences).toString()
      const baseAudienceURL = 'https://www.google.com/ads/ga-audiences?'
      const finalAudienceURL = baseAudienceURL + audienceParams
      let clientJSAudience = ''
      // Call GAv4-Audiences on Google.com
      clientJSAudience += `fetch("${finalAudienceURL}");`
      clientJSAudience += client.set('_z_ga_audiences', requestBody['cid'], {
        scope: 'infinite',
      })
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
      // If no GAv4-Audiences, just trigger DoubleClick normally
      client.fetch(finalDoubleClickURL)
    }
  }
}
