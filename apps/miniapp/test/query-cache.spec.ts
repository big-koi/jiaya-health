import { describe, expect, it, vi } from 'vitest'
import { createQueryCache } from '../src/services/query/query-cache'

describe('query cache', () => {
  it('在 TTL 内返回缓存，过期后不返回', () => {
    let now = 1000
    const cache = createQueryCache({ ttlMs: 30_000, now: () => now })
    cache.set('profiles', ['p1'])
    expect(cache.get('profiles')).toEqual(['p1'])
    now = 31_001
    expect(cache.get('profiles')).toBeUndefined()
  })

  it('合并相同 key 的并发请求并且失败后允许重试', async () => {
    const cache = createQueryCache({ ttlMs: 30_000 })
    let resolveRequest: ((value: string[]) => void) | undefined
    const loader = vi.fn(() => new Promise<string[]>((resolve) => { resolveRequest = resolve }))
    const first = cache.dedupe('profiles', loader)
    const second = cache.dedupe('profiles', loader)
    expect(loader).toHaveBeenCalledTimes(1)
    resolveRequest?.(['p1'])
    await expect(Promise.all([first, second])).resolves.toEqual([['p1'], ['p1']])

    const failing = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(['p2'])
    await expect(cache.dedupe('other', failing)).rejects.toThrow('offline')
    await expect(cache.dedupe('other', failing)).resolves.toEqual(['p2'])
  })

  it('按前缀清理缓存', () => {
    const cache = createQueryCache({ ttlMs: 30_000 })
    cache.set('dashboard:p1', 1)
    cache.set('dashboard:p2', 2)
    cache.set('profiles', 3)
    cache.invalidate('dashboard:')
    expect(cache.get('dashboard:p1')).toBeUndefined()
    expect(cache.get('dashboard:p2')).toBeUndefined()
    expect(cache.get('profiles')).toBe(3)
  })
})
