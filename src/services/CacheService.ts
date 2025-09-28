type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

export default class CacheService<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl = 60 * 60 * 1000;

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  get(key: string) {
    const cached = this.cache.get(key);
    if (cached === undefined) return undefined;

    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.data;
  }

  set(key: string, data: T) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
