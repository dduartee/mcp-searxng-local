/**
 * cache.ts
 * In-memory LRU cache with TTL.
 * Prevents repeated SearXNG calls for the same query.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class MemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>()
  private maxSize: number

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }

    // LRU: move to end (most recent)
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): void {
    // Evict oldest if full
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value
      if (firstKey !== undefined) {
        this.store.delete(firstKey)
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}
