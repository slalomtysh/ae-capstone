import { STALE_TTL_MINUTES } from '../config.js';
import { UpstreamError } from '../errors.js';
const STALE_TTL_MS = STALE_TTL_MINUTES * 60 * 1000;
function buildMeta(isStale, lastSuccessfulRefreshUtc) {
    return {
        isStale,
        lastSuccessfulRefreshUtc,
        generatedAtUtc: new Date().toISOString(),
        staleTtlMinutes: STALE_TTL_MINUTES
    };
}
export async function withStaleFallback(cache, cacheKey, fetcher) {
    try {
        const data = await fetcher();
        const entry = cache.set(cacheKey, data);
        return {
            data,
            meta: buildMeta(false, entry.lastSuccessfulRefreshUtc)
        };
    }
    catch (error) {
        const cached = cache.get(cacheKey);
        if (cached) {
            const ageMs = Date.now() - cached.storedAtMs;
            if (ageMs <= STALE_TTL_MS) {
                return {
                    data: cached.value,
                    meta: buildMeta(true, cached.lastSuccessfulRefreshUtc)
                };
            }
        }
        throw new UpstreamError('Upstream failed and no eligible stale cache was available', {
            staleTtlMinutes: STALE_TTL_MINUTES,
            cause: error instanceof Error ? error.message : String(error)
        });
    }
}
