import { UPSTREAM_RETRY_COUNT, UPSTREAM_TIMEOUT_MS } from '../config.js';
import { UpstreamError } from '../errors.js';
async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    }
    finally {
        clearTimeout(timeout);
    }
}
export class DefaultEspnClient {
    async getJson(url) {
        let lastError;
        for (let attempt = 0; attempt <= UPSTREAM_RETRY_COUNT; attempt += 1) {
            try {
                const response = await fetchWithTimeout(url, UPSTREAM_TIMEOUT_MS);
                if (!response.ok) {
                    throw new UpstreamError(`Upstream request failed with status ${response.status}`, { url, status: response.status });
                }
                return (await response.json());
            }
            catch (error) {
                lastError = error;
            }
        }
        throw new UpstreamError('Upstream request failed after retry policy', {
            url,
            retries: UPSTREAM_RETRY_COUNT,
            cause: lastError instanceof Error ? lastError.message : String(lastError)
        });
    }
}
