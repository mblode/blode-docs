interface CacheEntry<Value> {
  expiresAt: number;
  value: Promise<Value>;
}

interface TimedPromiseCacheOptions {
  maxEntries: number;
  ttlMs: number;
}

export interface TimedPromiseCache<Key, Value> {
  clear(): void;
  delete(key: Key): void;
  getOrCreate(key: Key, factory: () => Promise<Value>): Promise<Value>;
}

export const createTimedPromiseCache = <Key, Value>({
  maxEntries,
  ttlMs,
}: TimedPromiseCacheOptions): TimedPromiseCache<Key, Value> => {
  const entries = new Map<Key, CacheEntry<Value>>();

  const deleteOldest = () => {
    const oldestKey = entries.keys().next().value as Key | undefined;
    if (oldestKey !== undefined) {
      entries.delete(oldestKey);
    }
  };

  const pruneExpired = (now: number) => {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) {
        entries.delete(key);
      }
    }
  };

  return {
    clear() {
      entries.clear();
    },
    delete(key) {
      entries.delete(key);
    },
    getOrCreate(key, factory) {
      const now = Date.now();
      pruneExpired(now);

      const existing = entries.get(key);
      if (existing) {
        return existing.value;
      }

      const value = (async () => {
        try {
          return await factory();
        } catch (error) {
          entries.delete(key);
          throw error;
        }
      })();

      entries.set(key, {
        expiresAt: now + ttlMs,
        value,
      });

      if (entries.size > maxEntries) {
        deleteOldest();
      }

      return value;
    },
  };
};
