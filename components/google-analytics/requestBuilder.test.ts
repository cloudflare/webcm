import { Client } from '../../lib/client'
import { MCEvent } from '../../lib/manager'
import { getToolRequest } from './requestBuilder'

const isInt = (num: string) => !isNaN(parseInt(num))

describe('getToolRequest', () => {
  const mockEvent = new Event('pageview') as MCEvent
  mockEvent.client = {
    title:
      "New & Used Cars For Sale Matthews NC With Scott Clark's Toyota Dealership",
    language: 'en-GB',
    url: new URL('https://www.scottclarkstoyota.com/'),
    emitter: 'browser',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4488.0 Safari/537.36',
    ip: '2001:8a0:6383:1700:95e3:97c3:d338:890c',
    referer: '',
    fetch: vi.fn(),
    execute: vi.fn(),
    return: vi.fn(),
    get: vi.fn().mockImplementation(key => {
      const cookies: Record<string, string> = {
        _ga: 'GA1.1.2006998272.1617012296',
        _gid: 'GA1.2.1520407294.1621950425',
      }
      return cookies[key]
    }),
    set: vi.fn(),
    attachEvent: vi.fn(),
  } as unknown as Client
  mockEvent.payload = {
    vp: '1440x796',
    sr: '1440x900',
    cd1: 'myCustomDimension123',
    ec: 'testCategory',
  }
  const mockSettings = {
    tid: 'UA-146414266-3',
    hideOriginalIP: false,
  }

  it('return request object ready to be used for GA tracking', () => {
    const rawParams = getToolRequest(mockEvent, mockSettings)
    const expectedNonRandomInts = {
      cd1: 'myCustomDimension123',
      ec: 'testCategory',
      cid: '2006998272.1617012296',
      dl: 'https://www.scottclarkstoyota.com/',
      dt: "New & Used Cars For Sale Matthews NC With Scott Clark's Toyota Dealership",
      _gid: '1520407294.1621950425',
      sr: '1440x900',
      t: 'pageview',
      tid: 'UA-146414266-3',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4488.0 Safari/537.36',
      uip: '2001:8a0:6383:1700:95e3:97c3:d338:890c',
      ul: 'en-GB',
      v: 1,
      vp: '1440x796',
    }
    const { gjid, jid, z, ...nonRandomInts } = rawParams
    expect(nonRandomInts).toEqual(expectedNonRandomInts)
    expect([gjid, jid, z].every(isInt)).toEqual(true)
  })
})
