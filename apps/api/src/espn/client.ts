import { UPSTREAM_RETRY_COUNT, UPSTREAM_TIMEOUT_MS } from '../config.js';
import { UpstreamError } from '../errors.js';
import type { EspnClient } from '../types.js';

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export class DefaultEspnClient implements EspnClient {
  async getJson<T>(url: string): Promise<T> {
    let lastError: unknown;
    const maxAttempts = UPSTREAM_RETRY_COUNT + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetchWithTimeout(url, UPSTREAM_TIMEOUT_MS);
        if (!response.ok) {
          throw new UpstreamError(`Upstream request failed with status ${response.status}`, {
            url,
            status: response.status,
            attempt: attempt + 1,
            maxAttempts,
            timeoutMs: UPSTREAM_TIMEOUT_MS,
          });
        }
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
      }
    }

    throw new UpstreamError('Upstream request failed after retry policy', {
      url,
      retries: UPSTREAM_RETRY_COUNT,
      maxAttempts,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      causeType: lastError instanceof Error ? lastError.name : typeof lastError,
      cause: lastError instanceof Error ? lastError.message : String(lastError),
    });
  }
}
