import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    saveSnippet,
    saveSnippetAsync,
    getSnippet,
    getAllSnippets,
    getAllSnippetsAsync,
    deleteSnippet,
    deleteSnippetAsync,
    toggleFavorite,
    toggleFavoriteAsync,
    getAllTags,
    searchSnippets,
    getStatistics,
    exportSnippets,
    validateImportData,
    importSnippets,
    importSnippetsAsync,
    backupCurrent,
    restoreBackup,
    validateSnippet,
    normalizeSnippet,
    getStoredTheme,
    setStoredTheme,
    IndexedDBStorageDriver,
    migrateFromLocalStorage,
    initStorage,
    resetStorageState,
    getActiveDriverType,
    STORAGE_KEY,
    BACKUP_KEY,
    THEME_KEY
} from '../js/storage.js';
import { createMockIndexedDB, createMockLocalStorage } from './mock-idb.js';

describe('Storage & Data Access Layer (`js/storage.js`)', () => {
    beforeEach(() => {
        const all = getAllSnippets();
        for (const s of all) {
            deleteSnippet(s.id);
        }
    });

    describe('Validation and Normalization', () => {
        it('should validate snippet schema and reject missing fields', () => {
            const invalidResult = validateSnippet({ title: '', code: '', language: '' });
            assert.strictEqual(invalidResult.isValid, false);
            assert.ok(invalidResult.errors.length >= 3);

            const validResult = validateSnippet({
                title: 'Valid Snippet',
                code: 'console.log("hello")',
                language: 'javascript'
            });
            assert.strictEqual(validResult.isValid, true);
            assert.strictEqual(validResult.errors.length, 0);
        });

        it('should normalize snippet assigning default schema fields', () => {
            const raw = {
                title: ' Quick Sort ',
                code: 'function sort() {}',
                language: 'JAVASCRIPT',
                tags: 'algorithms, sorting, ALGORITHMS'
            };
            const normalized = normalizeSnippet(raw);

            assert.ok(normalized.id, 'Must generate unique ID');
            assert.strictEqual(normalized.title, 'Quick Sort');
            assert.strictEqual(normalized.language, 'javascript');
            assert.deepStrictEqual(normalized.tags, ['algorithms', 'sorting']);
            assert.strictEqual(normalized.isFavorite, false);
            assert.ok(normalized.createdAt);
            assert.ok(normalized.updatedAt);
        });
    });

    describe('CRUD Operations', () => {
        it('should save a new snippet and retrieve it by ID', () => {
            const result = saveSnippet({
                title: 'Binary Search Tree',
                code: 'class Node {}',
                language: 'javascript',
                description: 'BST Data structure',
                tags: ['tree', 'data-structures']
            });

            assert.strictEqual(result.success, true);
            assert.ok(result.snippet?.id);

            const fetched = getSnippet(result.snippet.id);
            assert.ok(fetched);
            assert.strictEqual(fetched.title, 'Binary Search Tree');
            assert.strictEqual(fetched.language, 'javascript');
            assert.deepStrictEqual(fetched.tags, ['tree', 'data-structures']);
        });

        it('should update an existing snippet preserving creation timestamp', () => {
            const createRes = saveSnippet({
                title: 'Old Title',
                code: 'const a = 1;',
                language: 'javascript'
            });

            const originalId = createRes.snippet.id;
            const originalCreated = createRes.snippet.createdAt;

            const updateRes = saveSnippet({
                id: originalId,
                title: 'Updated Title',
                code: 'const a = 2;',
                language: 'javascript'
            });

            assert.strictEqual(updateRes.success, true);

            const fetched = getSnippet(originalId);
            assert.strictEqual(fetched.title, 'Updated Title');
            assert.strictEqual(fetched.code, 'const a = 2;');
            assert.strictEqual(fetched.createdAt, originalCreated, 'Creation timestamp must not be overwritten');
        });

        it('should delete snippet and return true, or false for non-existent ID', () => {
            const createRes = saveSnippet({
                title: 'To Delete',
                code: 'delete me',
                language: 'python'
            });

            const deleted = deleteSnippet(createRes.snippet.id);
            assert.strictEqual(deleted, true);
            assert.strictEqual(getSnippet(createRes.snippet.id), null);

            const nonExistent = deleteSnippet('non-existent-id');
            assert.strictEqual(nonExistent, false);
        });

        it('should toggle favorite status', () => {
            const createRes = saveSnippet({
                title: 'Favorite Candidate',
                code: 'let star = true;',
                language: 'javascript'
            });

            const toggle1 = toggleFavorite(createRes.snippet.id);
            assert.strictEqual(toggle1.success, true);
            assert.strictEqual(toggle1.isFavorite, true);

            const toggle2 = toggleFavorite(createRes.snippet.id);
            assert.strictEqual(toggle2.success, true);
            assert.strictEqual(toggle2.isFavorite, false);
        });
    });

    describe('Search, Filtering, and Sorting', () => {
        beforeEach(() => {
            saveSnippet({
                title: 'Python Web Scraper',
                code: 'import requests\nfrom bs4 import BeautifulSoup',
                language: 'python',
                description: 'Scrapes website text',
                tags: ['web', 'scraping']
            });

            saveSnippet({
                title: 'React Custom Hook',
                code: 'function useDebounce(value, delay) {}',
                language: 'javascript',
                description: 'Debounce hook for inputs',
                tags: ['react', 'hooks'],
                isFavorite: true
            });

            saveSnippet({
                title: 'SQL Monthly Revenue',
                code: 'SELECT date_trunc(\'month\', created_at), SUM(amount) FROM sales GROUP BY 1;',
                language: 'sql',
                description: 'Aggregation query',
                tags: ['database', 'analytics']
            });
        });

        it('should search across title, code, and description', () => {
            const queryScraper = searchSnippets({ query: 'scraper' });
            assert.strictEqual(queryScraper.length, 1);
            assert.strictEqual(queryScraper[0].title, 'Python Web Scraper');

            const queryBeautifulSoup = searchSnippets({ query: 'BeautifulSoup' });
            assert.strictEqual(queryBeautifulSoup.length, 1);

            const queryAggregation = searchSnippets({ query: 'aggregation' });
            assert.strictEqual(queryAggregation.length, 1);
            assert.strictEqual(queryAggregation[0].language, 'sql');
        });

        it('should filter by programming language', () => {
            const pythonOnly = searchSnippets({ language: 'python' });
            assert.strictEqual(pythonOnly.length, 1);
            assert.strictEqual(pythonOnly[0].title, 'Python Web Scraper');
        });

        it('should filter by tag', () => {
            const hookTagged = searchSnippets({ tag: 'hooks' });
            assert.strictEqual(hookTagged.length, 1);
            assert.strictEqual(hookTagged[0].title, 'React Custom Hook');
        });

        it('should filter by favorites only', () => {
            const favsOnly = searchSnippets({ favoritesOnly: true });
            assert.strictEqual(favsOnly.length, 1);
            assert.strictEqual(favsOnly[0].title, 'React Custom Hook');
        });

        it('should sort alphabetically by title', () => {
            const sortedAsc = searchSnippets({ sortBy: 'title-asc' });
            assert.strictEqual(sortedAsc[0].title, 'Python Web Scraper');
            assert.strictEqual(sortedAsc[1].title, 'React Custom Hook');
            assert.strictEqual(sortedAsc[2].title, 'SQL Monthly Revenue');

            const sortedDesc = searchSnippets({ sortBy: 'title-desc' });
            assert.strictEqual(sortedDesc[0].title, 'SQL Monthly Revenue');
        });

        it('should aggregate unique tags and statistics', () => {
            const tags = getAllTags();
            assert.ok(tags.length >= 6);

            const stats = getStatistics();
            assert.strictEqual(stats.totalSnippets, 3);
            assert.strictEqual(stats.totalFavorites, 1);
            assert.strictEqual(stats.languagesCount, 3);
        });
    });

    describe('Import and Export Capabilities', () => {
        it('should export valid JSON schema envelope', () => {
            saveSnippet({
                title: 'Export Test',
                code: 'console.log("export")',
                language: 'javascript'
            });

            const json = exportSnippets();
            const parsed = JSON.parse(json);

            assert.strictEqual(parsed.app, 'Code Snippet Manager');
            assert.strictEqual(parsed.version, '2.1.0');
            assert.ok(Array.isArray(parsed.snippets));
            assert.strictEqual(parsed.snippets.length, 1);
        });

        it('should validate imported JSON data and report preview counts', () => {
            const incoming = JSON.stringify([
                { id: 'custom-1', title: 'Imported 1', code: 'code 1', language: 'python' },
                { id: 'custom-2', title: 'Imported 2', code: 'code 2', language: 'go' }
            ]);

            const validation = validateImportData(incoming);
            assert.strictEqual(validation.isValid, true);
            assert.strictEqual(validation.wouldAdd, 2);
            assert.strictEqual(validation.wouldUpdate, 0);
        });

        it('should safely import in merge mode with deduplication', () => {
            saveSnippet({
                id: 'existing-id-1',
                title: 'Original Title',
                code: 'old code',
                language: 'javascript'
            });

            const incoming = JSON.stringify([
                { id: 'existing-id-1', title: 'Updated via Import', code: 'new code', language: 'javascript' },
                { id: 'brand-new-2', title: 'Brand New', code: 'brand new code', language: 'python' }
            ]);

            const result = importSnippets(incoming, { mode: 'merge' });
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.added, 1);
            assert.strictEqual(result.updated, 1);

            const updatedSnippet = getSnippet('existing-id-1');
            assert.strictEqual(updatedSnippet.title, 'Updated via Import');
            assert.strictEqual(updatedSnippet.code, 'new code');

            const newSnippet = getSnippet('brand-new-2');
            assert.strictEqual(newSnippet.title, 'Brand New');
        });

        it('should take automatic backup before replace import and allow restore', () => {
            saveSnippet({
                title: 'Original Before Replace',
                code: 'original',
                language: 'javascript'
            });

            const replacePayload = JSON.stringify([
                { title: 'Replaced Single Item', code: 'only one', language: 'ruby' }
            ]);

            const importResult = importSnippets(replacePayload, { mode: 'replace' });
            assert.strictEqual(importResult.success, true);
            assert.strictEqual(getAllSnippets().length, 1);
            assert.strictEqual(getAllSnippets()[0].title, 'Replaced Single Item');

            const restored = restoreBackup();
            assert.strictEqual(restored, true);
            assert.strictEqual(getAllSnippets().length, 1);
            assert.strictEqual(getAllSnippets()[0].title, 'Original Before Replace');
        });
    });

    describe('Theme Persistence', () => {
        it('should get and set user theme preference', () => {
            setStoredTheme('light');
            assert.strictEqual(getStoredTheme(), 'light');

            setStoredTheme('dark');
            assert.strictEqual(getStoredTheme(), 'dark');
        });
    });

    describe('IndexedDB Storage Driver & Quota Resilience', () => {
        let mockIdb;

        beforeEach(() => {
            mockIdb = createMockIndexedDB();
            resetStorageState();
        });

        describe('IndexedDBStorageDriver Core Operations', () => {
            it('should open database and perform getItem, setItem, removeItem and clear', async () => {
                const driver = new IndexedDBStorageDriver('TestDB', 'test_store', mockIdb);
                assert.strictEqual(driver.isSupported(), true);

                await driver.setItem('key1', 'value1');
                const val1 = await driver.getItem('key1');
                assert.strictEqual(val1, 'value1');

                const missing = await driver.getItem('nonexistent');
                assert.strictEqual(missing, null);

                await driver.removeItem('key1');
                const afterDelete = await driver.getItem('key1');
                assert.strictEqual(afterDelete, null);

                await driver.setItem('k1', 'v1');
                await driver.setItem('k2', 'v2');
                await driver.clear();
                assert.strictEqual(await driver.getItem('k1'), null);
                assert.strictEqual(await driver.getItem('k2'), null);
            });
        });

        describe('Large Payload & 5MB Quota Resilience', () => {
            it('should demonstrate localStorage quota failure for payloads > 5MB', () => {
                const mockLs = createMockLocalStorage(5 * 1024 * 1024);
                // 2MB characters (4MB UTF-16 bytes) fits within 5MB quota
                const chunk2MB = 'A'.repeat(2 * 1024 * 1024);
                mockLs.setItem('test2mb', chunk2MB);
                assert.strictEqual(mockLs.getItem('test2mb').length, 2 * 1024 * 1024);

                // Adding another 2MB exceeds the 5MB quota limit and throws QuotaExceededError
                assert.throws(() => {
                    mockLs.setItem('test2mb_second', chunk2MB);
                }, /QuotaExceededError/);
            });

            it('should successfully store and retrieve payloads exceeding 5MB via IndexedDB without error', async () => {
                const driver = new IndexedDBStorageDriver('LargePayloadDB', 'snippets_store', mockIdb);
                await driver.init();

                // Generate a 6MB payload (6 * 1024 * 1024 characters) simulating hundreds of large code files
                const largeCodePayload = 'console.log("data");\n'.repeat(300000); // ~6.3 MB
                assert.ok(largeCodePayload.length > 5 * 1024 * 1024, 'Payload must exceed standard 5MB browser quota');

                const largeSnippet = {
                    id: 'large-snippet-quota-test',
                    title: 'Massive Infrastructure Config',
                    language: 'yaml',
                    code: largeCodePayload,
                    tags: ['large', 'infrastructure']
                };

                const serialized = JSON.stringify([largeSnippet]);
                await driver.setItem(STORAGE_KEY, serialized);

                const retrieved = await driver.getItem(STORAGE_KEY);
                assert.ok(retrieved);
                assert.strictEqual(retrieved.length, serialized.length);

                const parsed = JSON.parse(retrieved);
                assert.strictEqual(parsed.length, 1);
                assert.strictEqual(parsed[0].id, 'large-snippet-quota-test');
                assert.strictEqual(parsed[0].code.length, largeCodePayload.length);
            });
        });

        describe('Automated Migration from localStorage', () => {
            it('should automatically migrate snippets from localStorage to IndexedDB and clear legacy key', async () => {
                const mockLs = createMockLocalStorage();
                const legacySnippets = [
                    { id: 'legacy-1', title: 'Legacy Snippet 1', code: 'x = 1', language: 'python', tags: ['old'] },
                    { id: 'legacy-2', title: 'Legacy Snippet 2', code: 'y = 2', language: 'python', tags: ['old'] }
                ];

                mockLs.setItem(STORAGE_KEY, JSON.stringify(legacySnippets));
                mockLs.setItem(BACKUP_KEY, JSON.stringify({ createdAt: '2026-01-01', data: '[]' }));
                mockLs.setItem(THEME_KEY, 'light');

                const driver = new IndexedDBStorageDriver('MigrationDB', 'snippets_store', mockIdb);
                await driver.init();

                const migrationResult = await migrateFromLocalStorage(driver, mockLs);
                assert.strictEqual(migrationResult.migrated, true);
                assert.strictEqual(migrationResult.count, 2);

                // Verify migrated data in IndexedDB
                const idbData = await driver.getItem(STORAGE_KEY);
                assert.ok(idbData);
                const parsedIdb = JSON.parse(idbData);
                assert.strictEqual(parsedIdb.length, 2);
                assert.strictEqual(parsedIdb[0].title, 'Legacy Snippet 1');

                // Verify legacy key is cleared from localStorage to reclaim 5MB quota
                assert.strictEqual(mockLs.getItem(STORAGE_KEY), null);
                assert.strictEqual(mockLs.getItem(BACKUP_KEY), null);

                // Verify migration is idempotent
                const secondMigration = await migrateFromLocalStorage(driver, mockLs);
                assert.strictEqual(secondMigration.migrated, false);
            });
        });

        describe('initStorage & Fallback Resilience', () => {
            it('should initialize IndexedDB driver and report indexeddb driver type', async () => {
                const initRes = await initStorage({ idbFactory: mockIdb, dbName: 'InitTestDB' });
                assert.strictEqual(initRes.driverType, 'indexeddb');
                assert.strictEqual(getActiveDriverType(), 'indexeddb');
            });

            it('should fall back gracefully to memory/localStorage if IndexedDB throws SecurityError', async () => {
                const failingIdb = {
                    open() {
                        const err = new Error('SecurityError: The operation is insecure.');
                        err.name = 'SecurityError';
                        throw err;
                    }
                };

                const initRes = await initStorage({ idbFactory: failingIdb });
                assert.ok(initRes.driverType === 'memory' || initRes.driverType === 'localstorage');

                // App still functions normally with fallback driver
                const saveRes = saveSnippet({
                    title: 'Fallback Snippet',
                    code: 'const fallback = true;',
                    language: 'javascript'
                });
                assert.strictEqual(saveRes.success, true);
                assert.strictEqual(getAllSnippets().length, 1);
            });
        });

        describe('Asynchronous CRUD Operations', () => {
            it('should support saveSnippetAsync, getAllSnippetsAsync, toggleFavoriteAsync, and deleteSnippetAsync', async () => {
                await initStorage({ idbFactory: mockIdb, dbName: 'AsyncCrudDB' });

                const saveRes = await saveSnippetAsync({
                    title: 'Async Saved Snippet',
                    code: 'await doSomething();',
                    language: 'javascript',
                    tags: ['async', 'test']
                });
                assert.strictEqual(saveRes.success, true);
                const snippetId = saveRes.snippet.id;

                const allSnippets = await getAllSnippetsAsync();
                assert.strictEqual(allSnippets.length, 1);
                assert.strictEqual(allSnippets[0].title, 'Async Saved Snippet');

                const favRes = await toggleFavoriteAsync(snippetId);
                assert.strictEqual(favRes.success, true);
                assert.strictEqual(favRes.isFavorite, true);

                const delRes = await deleteSnippetAsync(snippetId);
                assert.strictEqual(delRes, true);
                assert.strictEqual((await getAllSnippetsAsync()).length, 0);
            });
        });
    });
});
