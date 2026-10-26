/**
 * @fileoverview Persistence and Data Access Layer for Code Snippet Manager.
 * Handles schema validation, normalization, CRUD operations, indexing, multi-criteria
 * filtering, backup snapshots, and safe import/export mechanics.
 *
 * Architectural Decision:
 * 1. Storage Driver Abstraction: Gracefully handles environments where localStorage is
 *    restricted (e.g. private browsing mode, disabled cookies, or headless Node.js tests)
 *    by falling back to a memory-backed store.
 * 2. Immutable/Defensive Copies: Returned arrays and objects are cloned to avoid unintended
 *    mutations across module boundaries.
 * 3. Atomic Updates & Backups: Destructive operations (such as import with 'replace' mode)
 *    trigger an automatic backup snapshot to prevent permanent data loss.
 */

import { generateId, parseTags } from './utils.js';

export const STORAGE_KEY = 'code_snippets';
export const BACKUP_KEY = 'code_snippets_backup';
export const THEME_KEY = 'code_snippets_theme';

/**
 * In-memory fallback map for environments lacking localStorage (e.g., Node.js test runner).
 */
const memoryStorage = new Map();

/**
 * Safe localStorage accessor ensuring cross-environment compatibility.
 * Detects if localStorage is accessible without throwing SecurityError.
 *
 * @returns {{ getItem: (key: string) => string|null, setItem: (key: string, val: string) => void, removeItem: (key: string) => void }}
 */
function getStorageDriver() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const testKey = '__storage_test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            return window.localStorage;
        }
    } catch (e) {
        // localStorage is restricted or disabled; use memory fallback
    }

    return {
        getItem: (key) => (memoryStorage.has(key) ? memoryStorage.get(key) : null),
        setItem: (key, val) => memoryStorage.set(key, String(val)),
        removeItem: (key) => memoryStorage.delete(key),
        clear: () => memoryStorage.clear()
    };
}

/**
 * Validates a snippet object structure against required schema rules.
 *
 * @param {unknown} snippet - Raw snippet object to validate
 * @returns {{ isValid: boolean, errors: string[] }} Validation result
 */
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

/**
 * Normalizes raw snippet data to ensure all expected properties are present,
 * typed correctly, and sanitized before persistence.
 *
 * @param {Object} raw - Untrusted or raw snippet data
 * @returns {Object} Normalized snippet object conforming to v2 schema
 */
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

/**
 * Retrieve all snippets from storage.
 * Reads JSON, normalizes schema if necessary, and returns a cloned array.
 *
 * @returns {Array<Object>} List of normalized snippets
 */
export function getAllSnippets() {
    const driver = getStorageDriver();
    try {
        const rawJson = driver.getItem(STORAGE_KEY);
        if (!rawJson) return [];

        const parsed = JSON.parse(rawJson);
        if (!Array.isArray(parsed)) {
            console.warn('Storage corrupted: expected array of snippets, received:', typeof parsed);
            return [];
        }

        return parsed.map(normalizeSnippet);
    } catch (error) {
        console.error('Failed to read snippets from storage:', error);
        return [];
    }
}

/**
 * Retrieve a single snippet by its unique identifier.
 *
 * @param {string} id - Snippet identifier
 * @returns {Object|null} Matching snippet or null if not found
 */
export function getSnippet(id) {
    if (!id) return null;
    const snippets = getAllSnippets();
    const found = snippets.find(snippet => snippet.id === id);
    return found ? { ...found } : null;
}

/**
 * Save a snippet (inserts a new record or updates an existing one).
 * Maintains `createdAt` and `updatedAt` timestamps automatically.
 *
 * @param {Object} snippet - Snippet data payload
 * @returns {{ success: boolean, snippet?: Object, errors?: string[] }} Result object
 */
export function saveSnippet(snippet) {
    const validation = validateSnippet(snippet);
    if (!validation.isValid) {
        return { success: false, errors: validation.errors };
    }

    try {
        const driver = getStorageDriver();
        const snippets = getAllSnippets();
        const normalized = normalizeSnippet(snippet);
        const existingIndex = snippets.findIndex(s => s.id === normalized.id);

        if (existingIndex !== -1) {
            // Preserve original creation timestamp on updates
            normalized.createdAt = snippets[existingIndex].createdAt || normalized.createdAt;
            normalized.updatedAt = new Date().toISOString();
            snippets[existingIndex] = normalized;
        } else {
            // New snippet: prepend to list so it displays prominently
            normalized.createdAt = new Date().toISOString();
            normalized.updatedAt = normalized.createdAt;
            snippets.unshift(normalized);
        }

        driver.setItem(STORAGE_KEY, JSON.stringify(snippets));
        return { success: true, snippet: normalized };
    } catch (error) {
        console.error('Storage write error while saving snippet:', error);
        return { success: false, errors: ['Failed to write to persistent storage: ' + error.message] };
    }
}

/**
 * Delete a snippet by its unique identifier.
 *
 * @param {string} id - Snippet identifier to remove
 * @returns {boolean} True if deletion succeeded, false otherwise
 */
export function deleteSnippet(id) {
    if (!id) return false;

    try {
        const driver = getStorageDriver();
        const snippets = getAllSnippets();
        const initialLength = snippets.length;
        const filtered = snippets.filter(snippet => snippet.id !== id);

        if (filtered.length === initialLength) {
            return false; // Snippet was not found
        }

        driver.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Error deleting snippet:', error);
        return false;
    }
}

/**
 * Toggle the favorite / bookmark status for a snippet.
 *
 * @param {string} id - Snippet identifier
 * @returns {{ success: boolean, isFavorite?: boolean }} Result of toggle operation
 */
export function toggleFavorite(id) {
    if (!id) return { success: false };

    try {
        const driver = getStorageDriver();
        const snippets = getAllSnippets();
        const target = snippets.find(s => s.id === id);

        if (!target) return { success: false };

        target.isFavorite = !target.isFavorite;
        target.updatedAt = new Date().toISOString();

        driver.setItem(STORAGE_KEY, JSON.stringify(snippets));
        return { success: true, isFavorite: target.isFavorite };
    } catch (error) {
        console.error('Error toggling favorite:', error);
        return { success: false };
    }
}

/**
 * Collect and index all unique tags across snippets, sorted by usage frequency descending.
 *
 * @returns {Array<{ name: string, count: number }>} Tag frequency catalog
 */
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

/**
 * Comprehensive search, filter, and sorting query engine.
 * Supports multi-field free text search (title, code, description, tags, language),
 * tag filtering, language filtering, favorites-only filter, and multi-criteria sorting.
 *
 * @param {Object} [options={}] - Search criteria options
 * @param {string} [options.query=''] - Free-text search string
 * @param {string} [options.tag=''] - Exact tag to filter by
 * @param {string} [options.language=''] - Language to filter by
 * @param {boolean} [options.favoritesOnly=false] - Restrict to favorites
 * @param {string} [options.sortBy='updated-desc'] - Sort strategy: 'updated-desc' | 'updated-asc' | 'created-desc' | 'created-asc' | 'title-asc' | 'title-desc'
 * @returns {Array<Object>} Filtered and sorted snippets
 */
export function searchSnippets({
    query = '',
    tag = '',
    language = '',
    favoritesOnly = false,
    sortBy = 'updated-desc'
} = {}) {
    let results = getAllSnippets();

    // 1. Tag filter
    if (tag) {
        const normalizedTag = tag.toLowerCase().trim();
        results = results.filter(s => Array.isArray(s.tags) && s.tags.includes(normalizedTag));
    }

    // 2. Language filter
    if (language) {
        const normalizedLang = language.toLowerCase().trim();
        results = results.filter(s => s.language === normalizedLang);
    }

    // 3. Favorites only filter
    if (favoritesOnly) {
        results = results.filter(s => s.isFavorite === true);
    }

    // 4. Free-text search query across multiple fields
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

    // 5. Sorting strategy
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

/**
 * Calculate statistical summary metrics for dashboard presentation.
 *
 * @returns {{ totalSnippets: number, totalFavorites: number, totalTags: number, languagesCount: number }} Summary stats
 */
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

/**
 * Export all snippets to a standardized JSON schema with metadata envelope.
 * Includes export timestamp, application version, and item count.
 *
 * @returns {string} Formatted JSON string
 */
export function exportSnippets() {
    const snippets = getAllSnippets();
    const exportEnvelope = {
        app: 'Code Snippet Manager',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        count: snippets.length,
        snippets
    };

    return JSON.stringify(exportEnvelope, null, 2);
}

/**
 * Validate imported JSON data prior to executing persistence changes.
 * Supports both legacy raw array format and v2 metadata-envelope format.
 *
 * @param {string} jsonString - Raw imported string
 * @returns {{ isValid: boolean, error?: string, rawSnippets: Array<Object>, wouldAdd: number, wouldUpdate: number }} Validation details
 */
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

    // Extract snippets from envelope or raw array
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

/**
 * Safely import snippets into persistent storage.
 * In 'replace' mode, automatically creates a recovery backup first.
 *
 * @param {string} jsonString - Raw JSON file contents
 * @param {Object} [options={}] - Import options
 * @param {'merge'|'replace'} [options.mode='merge'] - Resolution mode for incoming records
 * @returns {{ success: boolean, added: number, updated: number, error?: string }} Import results
 */
export function importSnippets(jsonString, { mode = 'merge' } = {}) {
    const validation = validateImportData(jsonString);
    if (!validation.isValid) {
        return { success: false, added: 0, updated: 0, error: validation.error };
    }

    try {
        const driver = getStorageDriver();

        // 1. Create automatic backup prior to destructive replace operation
        if (mode === 'replace') {
            backupCurrent();
        }

        const validSnippets = validation.rawSnippets
            .filter(item => item && typeof item === 'object')
            .map(normalizeSnippet);

        if (mode === 'replace') {
            driver.setItem(STORAGE_KEY, JSON.stringify(validSnippets));
            return {
                success: true,
                added: validSnippets.length,
                updated: 0
            };
        }

        // Merge mode: deduplicate based on snippet ID
        const existingList = getAllSnippets();
        const snippetMap = new Map();

        // Index existing records
        for (const existing of existingList) {
            snippetMap.set(existing.id, existing);
        }

        let addedCount = 0;
        let updatedCount = 0;

        for (const incoming of validSnippets) {
            if (snippetMap.has(incoming.id)) {
                // Update existing record while keeping creation date
                const existing = snippetMap.get(incoming.id);
                snippetMap.set(incoming.id, {
                    ...incoming,
                    createdAt: existing.createdAt || incoming.createdAt,
                    updatedAt: new Date().toISOString()
                });
                updatedCount++;
            } else {
                // Insert brand new record
                snippetMap.set(incoming.id, incoming);
                addedCount++;
            }
        }

        const mergedArray = Array.from(snippetMap.values());
        driver.setItem(STORAGE_KEY, JSON.stringify(mergedArray));

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

/**
 * Create a snapshot backup of the current snippets collection.
 *
 * @returns {boolean} True if backup was created successfully
 */
export function backupCurrent() {
    try {
        const driver = getStorageDriver();
        const currentData = driver.getItem(STORAGE_KEY);
        if (!currentData) return false;

        const backupEnvelope = {
            createdAt: new Date().toISOString(),
            data: currentData
        };

        driver.setItem(BACKUP_KEY, JSON.stringify(backupEnvelope));
        return true;
    } catch (error) {
        console.error('Failed to create backup:', error);
        return false;
    }
}

/**
 * Retrieve metadata details of the currently stored backup snapshot.
 *
 * @returns {{ exists: boolean, createdAt?: string, count?: number }} Backup inspection info
 */
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

/**
 * Restore snippets from the stored backup snapshot.
 *
 * @returns {boolean} True if restore succeeded
 */
export function restoreBackup() {
    try {
        const driver = getStorageDriver();
        const backupRaw = driver.getItem(BACKUP_KEY);
        if (!backupRaw) return false;

        const parsed = JSON.parse(backupRaw);
        if (!parsed || !parsed.data) return false;

        driver.setItem(STORAGE_KEY, parsed.data);
        return true;
    } catch (error) {
        console.error('Failed to restore backup:', error);
        return false;
    }
}

/**
 * Retrieve saved user theme preference from persistent storage.
 *
 * @returns {'dark'|'light'} Active theme setting ('dark' by default)
 */
export function getStoredTheme() {
    const driver = getStorageDriver();
    const stored = driver.getItem(THEME_KEY);
    return stored === 'light' ? 'light' : 'dark';
}

/**
 * Persist user theme preference to storage.
 *
 * @param {'dark'|'light'} theme - Target theme value
 */
export function setStoredTheme(theme) {
    const driver = getStorageDriver();
    driver.setItem(THEME_KEY, theme === 'light' ? 'light' : 'dark');
}
