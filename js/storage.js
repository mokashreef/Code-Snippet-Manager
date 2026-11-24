import { generateId, parseTags } from './utils.js';

export const STORAGE_KEY = 'code_snippets';
export const BACKUP_KEY = 'code_snippets_backup';
export const THEME_KEY = 'code_snippets_theme';
export const DB_NAME = 'CodeSnippetManagerDB';
export const DB_VERSION = 1;
export const OBJECT_STORE_NAME = 'snippets_store';

// Internal memory storage used for tests, fallback, and fast synchronous access
const memoryStorage = new Map();

/**
 * Standard Synchronous Storage Driver Interface (localStorage or Memory fallback)
 */
function getLocalStorageDriver() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const testKey = '__storage_test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            return window.localStorage;
        }
    } catch (e) {
        // Fallback to in-memory store
    }

    return {
        getItem: (key) => (memoryStorage.has(key) ? memoryStorage.get(key) : null),
        setItem: (key, val) => memoryStorage.set(key, String(val)),
        removeItem: (key) => memoryStorage.delete(key),
        clear: () => memoryStorage.clear()
    };
}

/**
 * IndexedDBStorageDriver
 * Standard IndexedDB implementation supporting large quotas (>5MB) without external dependencies.
 */
export class IndexedDBStorageDriver {
    constructor(dbName = DB_NAME, storeName = OBJECT_STORE_NAME, idbFactory = null) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
        this._idbFactory = idbFactory;
    }

    getIdbFactory() {
        if (this._idbFactory) return this._idbFactory;
        if (typeof window !== 'undefined' && window.indexedDB) {
            return window.indexedDB;
        }
        if (typeof indexedDB !== 'undefined') {
            return indexedDB;
        }
        return null;
    }

    isSupported() {
        try {
            return Boolean(this.getIdbFactory());
        } catch (e) {
            return false;
        }
    }

    async init() {
        if (this.db) return this.db;
        const factory = this.getIdbFactory();
        if (!factory) {
            throw new Error('IndexedDB is not supported or accessible in this environment.');
        }

        return new Promise((resolve, reject) => {
            let request;
            try {
                request = factory.open(this.dbName, DB_VERSION);
            } catch (err) {
                return reject(err);
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = () => {
                reject(request.error || new Error('Failed to open IndexedDB database.'));
            };

            request.onblocked = () => {
                console.warn('IndexedDB database open request was blocked by an active connection.');
            };
        });
    }

    async getItem(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(this.storeName, 'readonly');
                const store = tx.objectStore(this.storeName);
                const req = store.get(key);

                req.onsuccess = () => {
                    const result = req.result;
                    resolve(result !== undefined ? result : null);
                };

                req.onerror = () => {
                    reject(req.error || new Error(`IndexedDB failed to get key "${key}".`));
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    async setItem(key, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                const req = store.put(String(value), key);

                req.onsuccess = () => {
                    resolve();
                };

                req.onerror = () => {
                    reject(req.error || new Error(`IndexedDB failed to set key "${key}".`));
                };

                tx.onabort = () => {
                    reject(tx.error || new Error(`IndexedDB transaction aborted while setting key "${key}".`));
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    async removeItem(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                const req = store.delete(key);

                req.onsuccess = () => {
                    resolve();
                };

                req.onerror = () => {
                    reject(req.error || new Error(`IndexedDB failed to remove key "${key}".`));
                };

                tx.onabort = () => {
                    reject(tx.error || new Error(`IndexedDB transaction aborted while removing key "${key}".`));
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    async clear() {
        await this.init();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                const req = store.clear();

                req.onsuccess = () => {
                    resolve();
                };

                req.onerror = () => {
                    reject(req.error || new Error('IndexedDB failed to clear object store.'));
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Active storage state
let activeDriverType = 'sync'; // 'indexeddb' | 'localstorage' | 'memory'
let activeAsyncDriver = null;
let syncFallbackDriver = null;

// Synchronous memory cache of snippets to guarantee synchronous API compatibility and instantaneous search/filter
let cachedSnippets = null;
let isCacheLoaded = false;

export function getActiveDriverType() {
    return activeDriverType;
}

export function getActiveAsyncDriver() {
    return activeAsyncDriver;
}

export function getStorageDriver() {
    if (!syncFallbackDriver) {
        syncFallbackDriver = getLocalStorageDriver();
    }
    return syncFallbackDriver;
}

/**
 * Automatically migrates existing snippets from localStorage to IndexedDB if present.
 * Frees up the 5MB localStorage quota by removing the migrated keys once stored in IndexedDB.
 */
export async function migrateFromLocalStorage(indexedDbDriver, customLocalStorage = null) {
    const ls = customLocalStorage || (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
    if (!ls) {
        return { migrated: false, count: 0, reason: 'no_local_storage' };
    }

    try {
        const legacyData = ls.getItem(STORAGE_KEY);
        if (!legacyData) {
            return { migrated: false, count: 0, reason: 'no_legacy_data' };
        }

        // Verify if IndexedDB already has snippets stored
        const existingIdbData = await indexedDbDriver.getItem(STORAGE_KEY);
        if (existingIdbData) {
            return { migrated: false, count: 0, reason: 'indexeddb_already_has_data' };
        }

        let parsed;
        try {
            parsed = JSON.parse(legacyData);
        } catch (e) {
            console.warn('[Storage Migration] Corrupted legacy data in localStorage, skipping migration.', e);
            return { migrated: false, count: 0, reason: 'corrupted_legacy_data' };
        }

        const count = Array.isArray(parsed) ? parsed.length : 0;

        // Persist snippets to IndexedDB
        await indexedDbDriver.setItem(STORAGE_KEY, legacyData);

        // Also migrate backup and theme preference if present
        const legacyBackup = ls.getItem(BACKUP_KEY);
        if (legacyBackup) {
            await indexedDbDriver.setItem(BACKUP_KEY, legacyBackup);
            ls.removeItem(BACKUP_KEY);
        }

        const legacyTheme = ls.getItem(THEME_KEY);
        if (legacyTheme) {
            await indexedDbDriver.setItem(THEME_KEY, legacyTheme);
        }

        // Clear legacy key to free up origin 5MB localStorage quota
        ls.removeItem(STORAGE_KEY);

        console.info(`[Storage Migration] Successfully migrated ${count} snippets from localStorage to IndexedDB.`);
        return { migrated: true, count, reason: 'success' };
    } catch (error) {
        console.error('[Storage Migration] Migration error:', error);
        return { migrated: false, count: 0, error: error.message };
    }
}

/**
 * Initializes the storage subsystem.
 * Attempts to connect to IndexedDB, migrates legacy data, and hydrates the memory cache.
 * Falls back gracefully to localStorage or memory storage if IndexedDB is blocked or unsupported.
 */
export async function initStorage(options = {}) {
    const idbFactory = options.idbFactory || null;
    const customLocalStorage = options.localStorage || null;

    try {
        const driver = new IndexedDBStorageDriver(
            options.dbName || DB_NAME,
            options.storeName || OBJECT_STORE_NAME,
            idbFactory
        );

        if (driver.isSupported()) {
            await driver.init();
            activeAsyncDriver = driver;
            activeDriverType = 'indexeddb';

            // Attempt automatic migration from localStorage if needed
            const migrationResult = await migrateFromLocalStorage(driver, customLocalStorage);

            // Hydrate cache from IndexedDB
            const storedRaw = await driver.getItem(STORAGE_KEY);
            if (storedRaw) {
                try {
                    const parsed = JSON.parse(storedRaw);
                    if (Array.isArray(parsed)) {
                        cachedSnippets = parsed.map(normalizeSnippet);
                    } else {
                        cachedSnippets = [];
                    }
                } catch (e) {
                    cachedSnippets = [];
                }
            } else {
                cachedSnippets = [];
            }
            isCacheLoaded = true;

            // Also synchronize backup and theme if available in memory
            const theme = await driver.getItem(THEME_KEY);
            if (theme) {
                getStorageDriver().setItem(THEME_KEY, theme);
            }

            return {
                driverType: 'indexeddb',
                migrated: migrationResult.migrated,
                migratedCount: migrationResult.count
            };
        }
    } catch (error) {
        console.warn('[Storage] IndexedDB initialization failed or blocked, falling back to localStorage/memory:', error.message);
    }

    // Fallback: synchronous localStorage or in-memory
    const syncDriver = getStorageDriver();
    activeAsyncDriver = null;
    activeDriverType = typeof window !== 'undefined' && window.localStorage ? 'localstorage' : 'memory';

    const rawData = syncDriver.getItem(STORAGE_KEY);
    if (rawData) {
        try {
            const parsed = JSON.parse(rawData);
            cachedSnippets = Array.isArray(parsed) ? parsed.map(normalizeSnippet) : [];
        } catch (e) {
            cachedSnippets = [];
        }
    } else {
        cachedSnippets = [];
    }
    isCacheLoaded = true;

    return {
        driverType: activeDriverType,
        migrated: false,
        migratedCount: 0
    };
}

/**
 * Persists snippet collection across active storage drivers (both synchronous cache and async driver).
 */
function persistSnippets(snippets) {
    cachedSnippets = [...snippets];
    isCacheLoaded = true;

    // Persist to synchronous driver (sync fallback or memory)
    const json = JSON.stringify(snippets);
    getStorageDriver().setItem(STORAGE_KEY, json);

    // If IndexedDB driver is active, asynchronously persist
    if (activeAsyncDriver) {
        activeAsyncDriver.setItem(STORAGE_KEY, json).catch((err) => {
            console.error('[Storage] Error persisting to IndexedDB:', err);
        });
    }
}

/**
 * Asynchronously persists snippet collection and waits for IndexedDB confirmation.
 */
async function persistSnippetsAsync(snippets) {
    cachedSnippets = [...snippets];
    isCacheLoaded = true;

    const json = JSON.stringify(snippets);
    getStorageDriver().setItem(STORAGE_KEY, json);

    if (activeAsyncDriver) {
        await activeAsyncDriver.setItem(STORAGE_KEY, json);
    }
}

export function validateSnippet(snippet) {
    const errors = [];

    if (!snippet || typeof snippet !== 'object') {
        return { isValid: false, errors: ['Snippet must be a valid object.'] };
    }

    if (!snippet.title || typeof snippet.title !== 'string' || !snippet.title.trim()) {
        errors.push('Snippet title is required and cannot be empty.');
    }

    if (!snippet.code || typeof snippet.code !== 'string' || !snippet.code.trim()) {
        errors.push('Snippet code is required and cannot be empty.');
    }

    if (!snippet.language || typeof snippet.language !== 'string' || !snippet.language.trim()) {
        errors.push('Snippet programming language is required.');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export function normalizeSnippet(raw) {
    const now = new Date().toISOString();
    return {
        id: (raw.id && typeof raw.id === 'string') ? raw.id.trim() : generateId(),
        title: (raw.title && typeof raw.title === 'string') ? raw.title.trim() : 'Untitled Snippet',
        language: (raw.language && typeof raw.language === 'string') ? raw.language.toLowerCase().trim() : 'javascript',
        code: typeof raw.code === 'string' ? raw.code : '',
        description: typeof raw.description === 'string' ? raw.description.trim() : '',
        tags: parseTags(raw.tags),
        isFavorite: Boolean(raw.isFavorite),
        createdAt: (raw.createdAt && !isNaN(Date.parse(raw.createdAt))) ? raw.createdAt : now,
        updatedAt: (raw.updatedAt && !isNaN(Date.parse(raw.updatedAt))) ? raw.updatedAt : now
    };
}

export function getAllSnippets() {
    if (isCacheLoaded && cachedSnippets) {
        return cachedSnippets.map(s => ({ ...s, tags: [...s.tags] }));
    }

    const driver = getStorageDriver();
    try {
        const rawJson = driver.getItem(STORAGE_KEY);
        if (!rawJson) {
            cachedSnippets = [];
            isCacheLoaded = true;
            return [];
        }

        const parsed = JSON.parse(rawJson);
        if (!Array.isArray(parsed)) {
            console.warn('Storage corrupted: expected array of snippets, received:', typeof parsed);
            cachedSnippets = [];
            isCacheLoaded = true;
            return [];
        }

        cachedSnippets = parsed.map(normalizeSnippet);
        isCacheLoaded = true;
        return cachedSnippets.map(s => ({ ...s, tags: [...s.tags] }));
    } catch (error) {
        console.error('Failed to read snippets from storage:', error);
        return [];
    }
}

export async function getAllSnippetsAsync() {
    if (activeAsyncDriver) {
        try {
            const rawJson = await activeAsyncDriver.getItem(STORAGE_KEY);
            if (!rawJson) return [];
            const parsed = JSON.parse(rawJson);
            if (Array.isArray(parsed)) {
                cachedSnippets = parsed.map(normalizeSnippet);
                isCacheLoaded = true;
                return cachedSnippets.map(s => ({ ...s, tags: [...s.tags] }));
            }
        } catch (e) {
            console.error('Failed to read snippets from IndexedDB:', e);
        }
    }
    return getAllSnippets();
}

export function getSnippet(id) {
    if (!id) return null;
    const snippets = getAllSnippets();
    const found = snippets.find(snippet => snippet.id === id);
    return found ? { ...found, tags: [...found.tags] } : null;
}

export function saveSnippet(snippet) {
    const validation = validateSnippet(snippet);
    if (!validation.isValid) {
        return { success: false, errors: validation.errors };
    }

    try {
        const snippets = getAllSnippets();
        const normalized = normalizeSnippet(snippet);
        const existingIndex = snippets.findIndex(s => s.id === normalized.id);

        if (existingIndex !== -1) {
            normalized.createdAt = snippets[existingIndex].createdAt || normalized.createdAt;
            normalized.updatedAt = new Date().toISOString();
            snippets[existingIndex] = normalized;
        } else {
            normalized.createdAt = new Date().toISOString();
            normalized.updatedAt = normalized.createdAt;
            snippets.unshift(normalized);
        }

        persistSnippets(snippets);
        return { success: true, snippet: normalized };
    } catch (error) {
        console.error('Storage write error while saving snippet:', error);
        return { success: false, errors: ['Failed to write to persistent storage: ' + error.message] };
    }
}

export async function saveSnippetAsync(snippet) {
    const validation = validateSnippet(snippet);
    if (!validation.isValid) {
        return { success: false, errors: validation.errors };
    }

    try {
        const snippets = getAllSnippets();
        const normalized = normalizeSnippet(snippet);
        const existingIndex = snippets.findIndex(s => s.id === normalized.id);

        if (existingIndex !== -1) {
            normalized.createdAt = snippets[existingIndex].createdAt || normalized.createdAt;
            normalized.updatedAt = new Date().toISOString();
            snippets[existingIndex] = normalized;
        } else {
            normalized.createdAt = new Date().toISOString();
            normalized.updatedAt = normalized.createdAt;
            snippets.unshift(normalized);
        }

        await persistSnippetsAsync(snippets);
        return { success: true, snippet: normalized };
    } catch (error) {
        console.error('Storage async write error while saving snippet:', error);
        return { success: false, errors: ['Failed to write to persistent storage: ' + error.message] };
    }
}

export function deleteSnippet(id) {
    if (!id) return false;

    try {
        const snippets = getAllSnippets();
        const initialLength = snippets.length;
        const filtered = snippets.filter(snippet => snippet.id !== id);

        if (filtered.length === initialLength) {
            return false;
        }

        persistSnippets(filtered);
        return true;
    } catch (error) {
        console.error('Error deleting snippet:', error);
        return false;
    }
}

export async function deleteSnippetAsync(id) {
    if (!id) return false;

    try {
        const snippets = getAllSnippets();
        const initialLength = snippets.length;
        const filtered = snippets.filter(snippet => snippet.id !== id);

        if (filtered.length === initialLength) {
            return false;
        }

        await persistSnippetsAsync(filtered);
        return true;
    } catch (error) {
        console.error('Error deleting snippet async:', error);
        return false;
    }
}

export function toggleFavorite(id) {
    if (!id) return { success: false };

    try {
        const snippets = getAllSnippets();
        const target = snippets.find(s => s.id === id);

        if (!target) return { success: false };

        target.isFavorite = !target.isFavorite;
        target.updatedAt = new Date().toISOString();

        persistSnippets(snippets);
        return { success: true, isFavorite: target.isFavorite };
    } catch (error) {
        console.error('Error toggling favorite:', error);
        return { success: false };
    }
}

export async function toggleFavoriteAsync(id) {
    if (!id) return { success: false };

    try {
        const snippets = getAllSnippets();
        const target = snippets.find(s => s.id === id);

        if (!target) return { success: false };

        target.isFavorite = !target.isFavorite;
        target.updatedAt = new Date().toISOString();

        await persistSnippetsAsync(snippets);
        return { success: true, isFavorite: target.isFavorite };
    } catch (error) {
        console.error('Error toggling favorite async:', error);
        return { success: false };
    }
}

export function getAllTags() {
    const snippets = getAllSnippets();
    const tagMap = new Map();

    for (const snippet of snippets) {
        if (Array.isArray(snippet.tags)) {
            for (const tag of snippet.tags) {
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            }
        }
    }

    return Array.from(tagMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function searchSnippets({
    query = '',
    tag = '',
    language = '',
    favoritesOnly = false,
    sortBy = 'updated-desc'
} = {}) {
    let results = getAllSnippets();

    if (tag) {
        const normalizedTag = tag.toLowerCase().trim();
        results = results.filter(s => Array.isArray(s.tags) && s.tags.includes(normalizedTag));
    }

    if (language) {
        const normalizedLang = language.toLowerCase().trim();
        results = results.filter(s => s.language === normalizedLang);
    }

    if (favoritesOnly) {
        results = results.filter(s => s.isFavorite === true);
    }

    const trimmedQuery = query.trim().toLowerCase();
    if (trimmedQuery) {
        results = results.filter(snippet => {
            if (snippet.title && snippet.title.toLowerCase().includes(trimmedQuery)) return true;
            if (snippet.description && snippet.description.toLowerCase().includes(trimmedQuery)) return true;
            if (snippet.code && snippet.code.toLowerCase().includes(trimmedQuery)) return true;
            if (snippet.language && snippet.language.toLowerCase().includes(trimmedQuery)) return true;
            if (Array.isArray(snippet.tags) && snippet.tags.some(t => t.includes(trimmedQuery))) return true;
            return false;
        });
    }

    results.sort((a, b) => {
        switch (sortBy) {
            case 'updated-asc':
                return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            case 'created-desc':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'created-asc':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            case 'updated-desc':
            default:
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
    });

    return results;
}

export function getStatistics() {
    const snippets = getAllSnippets();
    const tags = getAllTags();
    const languages = new Set(snippets.map(s => s.language));
    const favorites = snippets.filter(s => s.isFavorite).length;

    return {
        totalSnippets: snippets.length,
        totalFavorites: favorites,
        totalTags: tags.length,
        languagesCount: languages.size
    };
}

export function exportSnippets() {
    const snippets = getAllSnippets();
    const exportEnvelope = {
        app: 'Code Snippet Manager',
        version: '2.1.0',
        exportedAt: new Date().toISOString(),
        count: snippets.length,
        snippets
    };

    return JSON.stringify(exportEnvelope, null, 2);
}

export function validateImportData(jsonString) {
    if (typeof jsonString !== 'string' || !jsonString.trim()) {
        return { isValid: false, error: 'Empty file or invalid data provided.', rawSnippets: [], wouldAdd: 0, wouldUpdate: 0 };
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonString);
    } catch (e) {
        return { isValid: false, error: 'Malformed JSON syntax: ' + e.message, rawSnippets: [], wouldAdd: 0, wouldUpdate: 0 };
    }

    const rawList = Array.isArray(parsed)
        ? parsed
        : (parsed && Array.isArray(parsed.snippets) ? parsed.snippets : null);

    if (!rawList) {
        return {
            isValid: false,
            error: 'Invalid schema: Data must be an array of snippets or an export envelope containing a "snippets" array.',
            rawSnippets: [],
            wouldAdd: 0,
            wouldUpdate: 0
        };
    }

    const existingSnippets = getAllSnippets();
    const existingIds = new Set(existingSnippets.map(s => s.id));
    let wouldAdd = 0;
    let wouldUpdate = 0;

    for (const item of rawList) {
        if (!item || typeof item !== 'object') continue;
        if (item.id && existingIds.has(item.id)) {
            wouldUpdate++;
        } else {
            wouldAdd++;
        }
    }

    return {
        isValid: true,
        rawSnippets: rawList,
        wouldAdd,
        wouldUpdate
    };
}

export function importSnippets(jsonString, { mode = 'merge' } = {}) {
    const validation = validateImportData(jsonString);
    if (!validation.isValid) {
        return { success: false, added: 0, updated: 0, error: validation.error };
    }

    try {
        if (mode === 'replace') {
            backupCurrent();
        }

        const validSnippets = validation.rawSnippets
            .filter(item => item && typeof item === 'object')
            .map(normalizeSnippet);

        if (mode === 'replace') {
            persistSnippets(validSnippets);
            return {
                success: true,
                added: validSnippets.length,
                updated: 0
            };
        }

        const existingList = getAllSnippets();
        const snippetMap = new Map();

        for (const existing of existingList) {
            snippetMap.set(existing.id, existing);
        }

        let addedCount = 0;
        let updatedCount = 0;

        for (const incoming of validSnippets) {
            if (snippetMap.has(incoming.id)) {
                const existing = snippetMap.get(incoming.id);
                snippetMap.set(incoming.id, {
                    ...incoming,
                    createdAt: existing.createdAt || incoming.createdAt,
                    updatedAt: new Date().toISOString()
                });
                updatedCount++;
            } else {
                snippetMap.set(incoming.id, incoming);
                addedCount++;
            }
        }

        const mergedArray = Array.from(snippetMap.values());
        persistSnippets(mergedArray);

        return {
            success: true,
            added: addedCount,
            updated: updatedCount
        };
    } catch (error) {
        console.error('Import processing error:', error);
        return { success: false, added: 0, updated: 0, error: error.message };
    }
}

export async function importSnippetsAsync(jsonString, options = {}) {
    const result = importSnippets(jsonString, options);
    if (result.success && activeAsyncDriver) {
        const json = JSON.stringify(getAllSnippets());
        await activeAsyncDriver.setItem(STORAGE_KEY, json);
    }
    return result;
}

export function backupCurrent() {
    try {
        const currentData = JSON.stringify(getAllSnippets());
        if (!currentData || currentData === '[]') return false;

        const backupEnvelope = {
            createdAt: new Date().toISOString(),
            data: currentData
        };

        const json = JSON.stringify(backupEnvelope);
        getStorageDriver().setItem(BACKUP_KEY, json);

        if (activeAsyncDriver) {
            activeAsyncDriver.setItem(BACKUP_KEY, json).catch(e => {
                console.error('[Storage] Error persisting backup to IndexedDB:', e);
            });
        }
        return true;
    } catch (error) {
        console.error('Failed to create backup:', error);
        return false;
    }
}

export function getBackupInfo() {
    try {
        const driver = getStorageDriver();
        const backupRaw = driver.getItem(BACKUP_KEY);
        if (!backupRaw) return { exists: false };

        const parsed = JSON.parse(backupRaw);
        const dataList = JSON.parse(parsed.data || '[]');

        return {
            exists: true,
            createdAt: parsed.createdAt,
            count: Array.isArray(dataList) ? dataList.length : 0
        };
    } catch (e) {
        return { exists: false };
    }
}

export function restoreBackup() {
    try {
        const driver = getStorageDriver();
        const backupRaw = driver.getItem(BACKUP_KEY);
        if (!backupRaw) return false;

        const parsed = JSON.parse(backupRaw);
        if (!parsed || !parsed.data) return false;

        const restoredSnippets = JSON.parse(parsed.data);
        if (!Array.isArray(restoredSnippets)) return false;

        persistSnippets(restoredSnippets.map(normalizeSnippet));
        return true;
    } catch (error) {
        console.error('Failed to restore backup:', error);
        return false;
    }
}

export function getStoredTheme() {
    const driver = getStorageDriver();
    const stored = driver.getItem(THEME_KEY);
    return stored === 'light' ? 'light' : 'dark';
}

export function setStoredTheme(theme) {
    const driver = getStorageDriver();
    const val = theme === 'light' ? 'light' : 'dark';
    driver.setItem(THEME_KEY, val);

    if (activeAsyncDriver) {
        activeAsyncDriver.setItem(THEME_KEY, val).catch(e => {
            console.error('[Storage] Error saving theme to IndexedDB:', e);
        });
    }
}

/**
 * Reset memory state (useful for test isolation)
 */
export function resetStorageState() {
    cachedSnippets = null;
    isCacheLoaded = false;
    memoryStorage.clear();
    activeAsyncDriver = null;
    activeDriverType = 'sync';
    syncFallbackDriver = null;
}
