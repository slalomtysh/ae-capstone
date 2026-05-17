export class MemoryCache {
    store = new Map();
    set(key, value) {
        const entry = {
            value,
            storedAtMs: Date.now(),
            lastSuccessfulRefreshUtc: new Date().toISOString()
        };
        this.store.set(key, entry);
        return entry;
    }
    get(key) {
        const raw = this.store.get(key);
        return raw ? raw : null;
    }
}
