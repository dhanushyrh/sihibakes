const ADMIN_CACHE_TTL_MS = 120_000;

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const cache = new Map<string, CacheEntry<unknown>>();

export async function getCachedAdminData<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;

  if (hit && hit.expiresAt > now) {
    return hit.data;
  }

  const data = await loader();
  cache.set(key, { data, expiresAt: now + ADMIN_CACHE_TTL_MS });
  return data;
}

export function invalidateAdminDataCache(keyPrefix?: string) {
  if (!keyPrefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}
