import { invalidateCache, useCache } from './index'

describe('Cache', () => {
  it('caches and invalidates as expected', async () => {
    const getLunch = (who: string) => (who === 'mouse' ? 'cheese' : 'dust')

    let lunch = await useCache('cheese', () => getLunch('mouse'))
    lunch = await useCache('cheese', () => getLunch('not mouse'))
    expect(lunch).toEqual('cheese')

    invalidateCache('cheese')
    lunch = await useCache('cheese', () => getLunch('not mouse'))
    expect(lunch).toEqual('dust')
  })
})
