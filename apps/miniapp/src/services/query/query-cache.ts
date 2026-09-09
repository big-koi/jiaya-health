type QueryCacheOptions = { ttlMs: number; now?: () => number }
type CacheEntry = { value: unknown; expiresAt: number }

export function createQueryCache({ ttlMs, now = Date.now }: QueryCacheOptions) {
  const values = new Map<string, CacheEntry>()
  const pending = new Map<string, Promise<unknown>>()

  return {
    get<T>(key: string): T | undefined {
      const entry = values.get(key)
      if (!entry) return undefined
      if (entry.expiresAt <= now()) {
        values.delete(key)
        return undefined
      }
      return entry.value as T
    },
    set<T>(key: string, value: T): void {
      values.set(key, { value, expiresAt: now() + ttlMs })
    },
    async dedupe<T>(key: string, loader: () => Promise<T>): Promise<T> {
      const running = pending.get(key)
      if (running) return running as Promise<T>
      const cached = this.get<T>(key)
      if (cached !== undefined) return cached
      const request = loader()
        .then((value) => {
          this.set(key, value)
          return value
        })
        .finally(() => pending.delete(key))
      pending.set(key, request)
      return request
    },
    invalidate(prefix: string): void {
      for (const key of values.keys()) {
        if (key.startsWith(prefix)) values.delete(key)
      }
    },
  }
}

export type QueryCache = ReturnType<typeof createQueryCache>
