export interface CacheEntry<T> {
  value: T;
  storedAtMs: number;
  lastSuccessfulRefreshUtc: string;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, value: T): CacheEntry<T> {
    const entry: CacheEntry<T> = {
      value,
      storedAtMs: Date.now(),
      lastSuccessfulRefreshUtc: new Date().toISOString(),
    };
    this.store.set(key, entry);
    return entry;
  }

  get<T>(key: string): CacheEntry<T> | null {
    const raw = this.store.get(key);
    return raw ? (raw as CacheEntry<T>) : null;
  }
}
