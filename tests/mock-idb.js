/**
 * In-memory Mock implementation of W3C IndexedDB API for Node.js test runners.
 */
export function createMockIndexedDB() {
    const databases = new Map();

    class MockIDBRequest {
        constructor() {
            this.result = undefined;
            this.error = null;
            this.onsuccess = null;
            this.onerror = null;
        }

        _succeed(result) {
            this.result = result;
            if (typeof this.onsuccess === 'function') {
                this.onsuccess({ target: this });
            }
        }

        _fail(error) {
            this.error = error;
            if (typeof this.onerror === 'function') {
                this.onerror({ target: this });
            }
        }
    }

    class MockOpenDBRequest extends MockIDBRequest {
        constructor() {
            super();
            this.onupgradeneeded = null;
            this.onblocked = null;
        }
    }

    class MockObjectStore {
        constructor(storeMap) {
            this.storeMap = storeMap;
        }

        get(key) {
            const req = new MockIDBRequest();
            queueMicrotask(() => {
                const val = this.storeMap.get(key);
                req._succeed(val);
            });
            return req;
        }

        put(value, key) {
            const req = new MockIDBRequest();
            queueMicrotask(() => {
                this.storeMap.set(key, value);
                req._succeed(key);
            });
            return req;
        }

        delete(key) {
            const req = new MockIDBRequest();
            queueMicrotask(() => {
                this.storeMap.delete(key);
                req._succeed(undefined);
            });
            return req;
        }

        clear() {
            const req = new MockIDBRequest();
            queueMicrotask(() => {
                this.storeMap.clear();
                req._succeed(undefined);
            });
            return req;
        }
    }

    class MockTransaction {
        constructor(db, storeNames, mode) {
            this.db = db;
            this.storeNames = Array.isArray(storeNames) ? storeNames : [storeNames];
            this.mode = mode;
            this.error = null;
            this.onabort = null;
            this.oncomplete = null;
        }

        objectStore(name) {
            const storeMap = this.db._getStore(name);
            return new MockObjectStore(storeMap);
        }
    }

    class MockDatabase {
        constructor(name, version) {
            this.name = name;
            this.version = version;
            this.stores = new Map();
            this.objectStoreNames = {
                contains: (storeName) => this.stores.has(storeName)
            };
        }

        createObjectStore(storeName) {
            if (!this.stores.has(storeName)) {
                this.stores.set(storeName, new Map());
            }
            return new MockObjectStore(this.stores.get(storeName));
        }

        _getStore(storeName) {
            if (!this.stores.has(storeName)) {
                throw new Error(`NotFoundError: Object store "${storeName}" does not exist.`);
            }
            return this.stores.get(storeName);
        }

        transaction(storeNames, mode = 'readonly') {
            return new MockTransaction(this, storeNames, mode);
        }

        close() {
            // No-op for mock
        }
    }

    return {
        open(dbName, version = 1) {
            const req = new MockOpenDBRequest();

            queueMicrotask(() => {
                let isNew = !databases.has(dbName);
                if (isNew) {
                    databases.set(dbName, new MockDatabase(dbName, version));
                }
                const db = databases.get(dbName);

                if (isNew && typeof req.onupgradeneeded === 'function') {
                    req.result = db;
                    req.onupgradeneeded({ target: req });
                }

                req.result = db;
                if (typeof req.onsuccess === 'function') {
                    req.onsuccess({ target: req });
                }
            });

            return req;
        },
        _reset() {
            databases.clear();
        }
    };
}

/**
 * Mock localStorage with configurable byte quota limit
 */
export function createMockLocalStorage(quotaBytes = 5 * 1024 * 1024) {
    const store = new Map();

    function calculateCurrentSize() {
        let total = 0;
        for (const [k, v] of store.entries()) {
            total += (k.length + v.length) * 2; // UTF-16 approximate byte size
        }
        return total;
    }

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            const stringVal = String(value);
            const currentSize = calculateCurrentSize();
            const existingEntrySize = store.has(key) ? (key.length + store.get(key).length) * 2 : 0;
            const newEntrySize = (key.length + stringVal.length) * 2;

            if ((currentSize - existingEntrySize + newEntrySize) > quotaBytes) {
                const err = new Error(`QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of '${key}' exceeded the quota.`);
                err.name = 'QuotaExceededError';
                throw err;
            }

            store.set(key, stringVal);
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
        get length() {
            return store.size;
        }
    };
}
