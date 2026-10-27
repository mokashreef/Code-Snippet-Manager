import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    generateId,
    escapeHtml,
    escapeAttribute,
    formatDate,
    truncate,
    parseTags,
    getLanguageName,
    getLanguageColor,
    getPrismLanguage,
    debounce
} from '../js/utils.js';

describe('Utility Functions (`js/utils.js`)', () => {
    describe('generateId', () => {
        it('should generate valid UUID v4 formatted strings', () => {
            const id = generateId();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            assert.match(id, uuidRegex, `Expected valid UUID v4 format, received: ${id}`);
        });

        it('should generate distinct IDs across successive invocations', () => {
            const ids = new Set(Array.from({ length: 50 }, () => generateId()));
            assert.strictEqual(ids.size, 50, 'All generated IDs must be unique');
        });
    });

    describe('escapeHtml', () => {
        it('should escape HTML characters preventing XSS injection', () => {
            const unsafe = '<script>alert("XSS & attack\'s")</script>';
            const safe = escapeHtml(unsafe);
            assert.strictEqual(safe, '&lt;script&gt;alert(&quot;XSS &amp; attack&#39;s&quot;)&lt;/script&gt;');
        });

        it('should safely handle non-string or empty inputs', () => {
            assert.strictEqual(escapeHtml(null), '');
            assert.strictEqual(escapeHtml(undefined), '');
            assert.strictEqual(escapeHtml(''), '');
        });
    });

    describe('escapeAttribute', () => {
        it('should escape double quotes, single quotes, and brackets for HTML attributes', () => {
            const unsafe = 'foo "bar" & \'baz\' <test>';
            const safe = escapeAttribute(unsafe);
            assert.strictEqual(safe, 'foo &quot;bar&quot; &amp; &#39;baz&#39; &lt;test&gt;');
        });
    });

    describe('formatDate', () => {
        it('should return relative Arabic time for recently created timestamps', () => {
            const now = new Date().toISOString();
            const result = formatDate(now, 'ar-EG');
            assert.strictEqual(result, 'الآن');
        });

        it('should return minutes ago for timestamps created 5 minutes ago', () => {
            const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const result = formatDate(fiveMinsAgo, 'ar-EG');
            assert.ok(result.includes('دقائق'), `Expected Arabic minutes text, received: ${result}`);
        });

        it('should return empty string for null or invalid timestamps', () => {
            assert.strictEqual(formatDate(null), '');
            assert.strictEqual(formatDate('invalid-date'), '');
        });
    });

    describe('truncate', () => {
        it('should truncate strings exceeding character limit and append ellipsis', () => {
            const text = 'This is a long code snippet that needs truncation';
            const truncated = truncate(text, 20);
            assert.strictEqual(truncated, 'This is a long code...');
            assert.ok(truncated.length <= 23);
        });

        it('should preserve strings shorter than or equal to the limit', () => {
            const text = 'Short code';
            assert.strictEqual(truncate(text, 50), 'Short code');
        });
    });

    describe('parseTags', () => {
        it('should split comma-separated strings into trimmed, lowercase, deduplicated tags', () => {
            const input = ' JavaScript, python , JavaScript , React.js , SQL# , ';
            const tags = parseTags(input);
            assert.deepStrictEqual(tags, ['javascript', 'python', 'react.js', 'sql#']);
        });

        it('should handle array inputs gracefully', () => {
            const input = ['Node.js', 'Express', 'node.js'];
            const tags = parseTags(input);
            assert.deepStrictEqual(tags, ['node.js', 'express']);
        });

        it('should return empty array for empty or falsy inputs', () => {
            assert.deepStrictEqual(parseTags(''), []);
            assert.deepStrictEqual(parseTags(null), []);
        });
    });

    describe('Language Registry helpers', () => {
        it('should return correct display name and color for known languages', () => {
            assert.strictEqual(getLanguageName('javascript'), 'JavaScript');
            assert.strictEqual(getLanguageColor('javascript'), '#f7df1e');
            assert.strictEqual(getPrismLanguage('javascript'), 'javascript');

            assert.strictEqual(getLanguageName('python'), 'Python');
            assert.strictEqual(getLanguageColor('python'), '#3776ab');

            assert.strictEqual(getLanguageName('cpp'), 'C++');
            assert.strictEqual(getPrismLanguage('cpp'), 'cpp');
        });

        it('should provide sensible fallback values for unrecognized languages', () => {
            assert.strictEqual(getLanguageName('customlang'), 'Customlang');
            assert.strictEqual(getLanguageColor('customlang'), '#8892b0');
            assert.strictEqual(getPrismLanguage('customlang'), 'none');
        });
    });

    describe('debounce', () => {
        it('should delay function execution until elapsed delay', (t, done) => {
            let callCount = 0;
            const debounced = debounce(() => {
                callCount++;
                assert.strictEqual(callCount, 1);
                done();
            }, 50);

            debounced();
            debounced();
            debounced();
        });

        it('should support cancellation via .cancel()', (t, done) => {
            let executed = false;
            const debounced = debounce(() => {
                executed = true;
            }, 50);

            debounced();
            debounced.cancel();

            setTimeout(() => {
                assert.strictEqual(executed, false, 'Debounced function must not run after cancellation');
                done();
            }, 80);
        });
    });
});
