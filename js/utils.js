/**
 * @fileoverview Utility functions for Code Snippet Manager.
 * Provides pure, reusable helper functions for string sanitization, UUID generation,
 * date localization, clipboard interactions, and programming language metadata.
 *
 * Architecture Note:
 * This module is intentionally stateless and contains no direct DOM side-effects,
 * making every function easily testable in isolated unit test environments (Node.js & browser).
 */

/**
 * Supported programming languages registry with their display names,
 * color tokens, and Prism.js syntax mapping identifiers.
 */
export const LANGUAGE_REGISTRY = {
    javascript: { name: 'JavaScript', color: '#f7df1e', prism: 'javascript' },
    typescript: { name: 'TypeScript', color: '#3178c6', prism: 'typescript' },
    python: { name: 'Python', color: '#3776ab', prism: 'python' },
    html: { name: 'HTML', color: '#e34c26', prism: 'html' },
    css: { name: 'CSS', color: '#1572b6', prism: 'css' },
    php: { name: 'PHP', color: '#777bb4', prism: 'php' },
    sql: { name: 'SQL', color: '#cc2927', prism: 'sql' },
    java: { name: 'Java', color: '#007396', prism: 'java' },
    cpp: { name: 'C++', color: '#00599c', prism: 'cpp' },
    csharp: { name: 'C#', color: '#239120', prism: 'csharp' },
    c: { name: 'C', color: '#555555', prism: 'c' },
    json: { name: 'JSON', color: '#292929', prism: 'json' },
    markdown: { name: 'Markdown', color: '#083fa1', prism: 'markdown' },
    bash: { name: 'Bash / Shell', color: '#4eaa25', prism: 'bash' },
    ruby: { name: 'Ruby', color: '#cc342d', prism: 'ruby' },
    go: { name: 'Go', color: '#00add8', prism: 'go' },
    rust: { name: 'Rust', color: '#dea584', prism: 'rust' },
    kotlin: { name: 'Kotlin', color: '#a97bff', prism: 'kotlin' },
    swift: { name: 'Swift', color: '#f05138', prism: 'swift' },
    yaml: { name: 'YAML', color: '#cb171e', prism: 'yaml' },
    xml: { name: 'XML', color: '#e34c26', prism: 'xml' }
};

/**
 * Generate a universally unique identifier (UUID v4).
 * Uses Web Crypto API when running in modern browsers/environments for cryptographically
 * secure randomness, falling back to a pseudo-random bitmask implementation.
 *
 * @returns {string} Standard UUID v4 string
 */
export function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // RFC4122 version 4 compliant fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const rand = (Math.random() * 16) | 0;
        const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
        return value.toString(16);
    });
}

/**
 * Escape HTML special characters to prevent Cross-Site Scripting (XSS) attacks.
 * Applied whenever user-supplied input (titles, descriptions, tags, code) is interpolated
 * into DOM templates.
 *
 * Security Note:
 * We map &, <, >, ", and ' directly rather than relying on browser DOM parsing,
 * ensuring deterministic behavior across both browser and headless Node.js test runners.
 *
 * @param {string} text - Raw unescaped string
 * @returns {string} Sanitized HTML-safe string
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escape text for safe embedding inside HTML attribute values (such as data-* attributes).
 *
 * @param {string} text - Attribute value string
 * @returns {string} Safely escaped attribute value
 */
export function escapeAttribute(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Format an ISO timestamp into localized, relative human-readable Arabic text.
 * Falls back to concise calendar dates when elapsed time exceeds 7 days.
 *
 * @param {string} timestamp - Valid ISO date-time string
 * @param {string} [locale='ar-EG'] - BCP 47 locale code
 * @returns {string} Human-readable relative or calendar date
 */
export function formatDate(timestamp, locale = 'ar-EG') {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Guard against future timestamps due to clock drift
    if (diffMs < 0) {
        return locale.startsWith('ar') ? 'الآن' : 'just now';
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const isArabic = locale.startsWith('ar');

    if (diffMins < 1) {
        return isArabic ? 'الآن' : 'Just now';
    }

    if (diffMins < 60) {
        if (isArabic) {
            return `منذ ${diffMins} ${diffMins === 1 ? 'دقيقة' : diffMins === 2 ? 'دقيقتين' : diffMins <= 10 ? 'دقائق' : 'دقيقة'}`;
        }
        return `${diffMins}m ago`;
    }

    if (diffHours < 24) {
        if (isArabic) {
            return `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : diffHours === 2 ? 'ساعتين' : diffHours <= 10 ? 'ساعات' : 'ساعة'}`;
        }
        return `${diffHours}h ago`;
    }

    if (diffDays < 7) {
        if (isArabic) {
            return `منذ ${diffDays} ${diffDays === 1 ? 'يوم' : diffDays === 2 ? 'يومين' : diffDays <= 10 ? 'أيام' : 'يوم'}`;
        }
        return `${diffDays}d ago`;
    }

    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Creates a debounced function that delays execution until after `delay` milliseconds
 * have elapsed since the last time the function was invoked.
 * Includes a `.cancel()` method to allow clearing scheduled timeouts on teardown.
 *
 * @param {Function} func - Target function to debounce
 * @param {number} [delay=300] - Debounce delay in milliseconds
 * @returns {Function & { cancel: () => void }} Debounced wrapper function
 */
export function debounce(func, delay = 300) {
    let timeoutId = null;

    const debounced = function (...args) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            timeoutId = null;
            func.apply(this, args);
        }, delay);
    };

    debounced.cancel = function () {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return debounced;
}

/**
 * Copy text to user's system clipboard.
 * Uses the asynchronous Permissions & Clipboard API in secure contexts (HTTPS/localhost),
 * with a graceful fallback to a hidden, temporary textarea and execCommand for older runtimes.
 *
 * @param {string} text - Plain text to copy
 * @returns {Promise<boolean>} True if copy was successful, false otherwise
 */
export async function copyToClipboard(text) {
    if (typeof text !== 'string') return false;

    // Modern asynchronous clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('Modern clipboard API failed, attempting legacy fallback:', err);
        }
    }

    // Fallback for non-secure contexts or older browsers
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            return !!successful;
        } catch (fallbackErr) {
            console.error('Legacy clipboard copy failed:', fallbackErr);
            return false;
        }
    }

    return false;
}

/**
 * Retrieve user-friendly display name for a programming language identifier.
 *
 * @param {string} lang - Internal language key (e.g., 'javascript', 'cpp')
 * @returns {string} Human-readable language name
 */
export function getLanguageName(lang) {
    const key = (lang || '').toLowerCase().trim();
    if (LANGUAGE_REGISTRY[key]) {
        return LANGUAGE_REGISTRY[key].name;
    }
    // Capitalize generic fallback
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Plain Text';
}

/**
 * Retrieve brand or theme accent color for a programming language.
 *
 * @param {string} lang - Internal language key
 * @returns {string} Hex color code
 */
export function getLanguageColor(lang) {
    const key = (lang || '').toLowerCase().trim();
    return LANGUAGE_REGISTRY[key]?.color || '#8892b0';
}

/**
 * Retrieve Prism.js language identifier for CSS class generation (`language-${prismClass}`).
 *
 * @param {string} lang - Internal language key
 * @returns {string} Prism.js compatible class token
 */
export function getPrismLanguage(lang) {
    const key = (lang || '').toLowerCase().trim();
    return LANGUAGE_REGISTRY[key]?.prism || 'none';
}

/**
 * Truncate a code block or description to a specified character limit,
 * appending an ellipsis ('...') if the original length exceeds the maximum.
 *
 * @param {string} text - Input text
 * @param {number} [maxLength=150] - Maximum allowed length before truncation
 * @returns {string} Truncated string
 */
export function truncate(text, maxLength = 150) {
    if (typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Parse comma-separated user tag input into a normalized array of unique, lowercase tags.
 * Trims extraneous whitespace, removes special symbol noise, and enforces a max length of 30 chars per tag.
 *
 * @param {string|Array<string>} tagsInput - Comma-separated string or array of tags
 * @returns {Array<string>} Clean, deduplicated array of tag strings
 */
export function parseTags(tagsInput) {
    if (!tagsInput) return [];

    const rawArray = Array.isArray(tagsInput)
        ? tagsInput
        : String(tagsInput).split(',');

    const seen = new Set();
    const result = [];

    for (const rawTag of rawArray) {
        if (typeof rawTag !== 'string') continue;
        const normalized = rawTag
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}_\-#+.]/gu, '') // Keep unicode letters, numbers, and common dev chars (#, +, .)
            .slice(0, 30);

        if (normalized.length > 0 && !seen.has(normalized)) {
            seen.add(normalized);
            result.push(normalized);
        }
    }

    return result;
}

/**
 * Trigger client-side download of JSON data as a file.
 * Automatically cleans up the object URL and anchor element after download dispatch.
 *
 * @param {string} content - Serialized file content (e.g. JSON string)
 * @param {string} filename - Suggested filename for the download dialog
 */
export function downloadJsonFile(content, filename) {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof document === 'undefined') {
        throw new Error('File download requires browser environment with Blob and URL APIs.');
    }

    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}
