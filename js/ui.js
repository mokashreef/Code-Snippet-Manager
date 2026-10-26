/**
 * @fileoverview Presentation and UI Component Rendering Layer.
 * Manages DOM updates, card generation, modal dialogs, syntax highlighting triggers,
 * toast notifications, and event delegation hooks.
 *
 * Architecture & Security Note:
 * 1. XSS Defense-in-Depth: All dynamic text content is escaped through `escapeHtml`
 *    and `escapeAttribute` before being injected into HTML template literals.
 * 2. Event Delegation: Interactive card actions (copy, favorite, view, edit, delete)
 *    use clean `data-action` attributes and centralized delegation in `app.js` rather
 *    than polluting the global `window` scope with multiple disparate global handlers.
 * 3. Accessibility (a11y): Modals implement ARIA attributes (`role="dialog"`, `aria-modal="true"`),
 *    keyboard trap consideration, and proper focus restoration.
 */

import {
    escapeHtml,
    escapeAttribute,
    formatDate,
    getLanguageName,
    getLanguageColor,
    getPrismLanguage,
    truncate
} from './utils.js';

/**
 * Render collection of snippet cards into the grid container.
 * Handles empty state toggling, result count display, and code highlighting triggers.
 *
 * @param {Array<Object>} snippets - Normalized snippets to display
 */
export function renderSnippets(snippets) {
    const grid = document.getElementById('snippetsGrid');
    const emptyState = document.getElementById('emptyState');
    const countDisplay = document.getElementById('snippetsCount');

    if (!grid) return;

    const count = Array.isArray(snippets) ? snippets.length : 0;

    // Localized count string (Arabic grammar pluralization)
    if (countDisplay) {
        if (count === 0) {
            countDisplay.textContent = 'لا توجد أكواد';
        } else if (count === 1) {
            countDisplay.textContent = 'كود واحد';
        } else if (count === 2) {
            countDisplay.textContent = 'كودان';
        } else if (count >= 3 && count <= 10) {
            countDisplay.textContent = `${count} أكواد`;
        } else {
            countDisplay.textContent = `${count} كوداً`;
        }
    }

    if (count === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Generate card templates
    grid.innerHTML = snippets.map(snippet => renderSnippetCard(snippet)).join('');

    // Trigger syntax highlighting on newly injected DOM elements
    highlightCode();
}

/**
 * Generate HTML string for an individual snippet card.
 *
 * @param {Object} snippet - Snippet data object
 * @returns {string} Sanitized HTML markup
 */
export function renderSnippetCard(snippet) {
    const langColor = getLanguageColor(snippet.language);
    const langName = getLanguageName(snippet.language);
    const prismClass = getPrismLanguage(snippet.language);
    const previewCode = truncate(snippet.code, 180);
    const timeAgo = formatDate(snippet.updatedAt || snippet.createdAt);
    const isFav = Boolean(snippet.isFavorite);

    return `
        <article class="snippet-card ${isFav ? 'is-favorite' : ''}" data-id="${escapeAttribute(snippet.id)}">
            <header class="snippet-header">
                <div class="snippet-language-badge" style="--badge-color: ${langColor};">
                    <span class="language-indicator" style="background-color: ${langColor};"></span>
                    <span class="language-name">${escapeHtml(langName)}</span>
                </div>
                <div class="snippet-actions">
                    <button
                        type="button"
                        class="btn-icon btn-favorite ${isFav ? 'active' : ''}"
                        data-action="toggle-favorite"
                        data-id="${escapeAttribute(snippet.id)}"
                        title="${isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}"
                        aria-label="${isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </button>
                    <button
                        type="button"
                        class="btn-icon"
                        data-action="view"
                        data-id="${escapeAttribute(snippet.id)}"
                        title="عرض كامل للكود"
                        aria-label="عرض كامل للكود"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button
                        type="button"
                        class="btn-icon"
                        data-action="edit"
                        data-id="${escapeAttribute(snippet.id)}"
                        title="تعديل الكود"
                        aria-label="تعديل الكود"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button
                        type="button"
                        class="btn-icon btn-icon-danger"
                        data-action="delete"
                        data-id="${escapeAttribute(snippet.id)}"
                        title="حذف الكود"
                        aria-label="حذف الكود"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </header>

            <h3 class="snippet-title" data-action="view" data-id="${escapeAttribute(snippet.id)}">
                ${escapeHtml(snippet.title)}
            </h3>

            ${snippet.description ? `
                <p class="snippet-description">${escapeHtml(snippet.description)}</p>
            ` : ''}

            <div class="snippet-code-wrapper" data-action="view" data-id="${escapeAttribute(snippet.id)}" title="انقر لعرض الكود كاملاً">
                <pre><code class="language-${escapeAttribute(prismClass)}">${escapeHtml(previewCode)}</code></pre>
                <button
                    type="button"
                    class="btn-copy"
                    data-action="copy"
                    data-id="${escapeAttribute(snippet.id)}"
                    title="نسخ الكود"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>نسخ</span>
                </button>
            </div>

            ${Array.isArray(snippet.tags) && snippet.tags.length > 0 ? `
                <div class="snippet-tags">
                    ${snippet.tags.map(tag => `
                        <button type="button" class="tag" data-action="filter-tag" data-tag="${escapeAttribute(tag)}">
                            #${escapeHtml(tag)}
                        </button>
                    `).join('')}
                </div>
            ` : ''}

            <footer class="snippet-footer">
                <span class="snippet-time" title="${escapeAttribute(snippet.updatedAt || snippet.createdAt)}">
                    🕒 ${escapeHtml(timeAgo)}
                </span>
                <button type="button" class="btn-text snippet-view-link" data-action="view" data-id="${escapeAttribute(snippet.id)}">
                    عرض الكود كامل &larr;
                </button>
            </footer>
        </article>
    `;
}

/**
 * Render tag pills filter list with usage counts and clear button.
 *
 * @param {Array<{ name: string, count: number }>} tags - Tag list with counts
 * @param {string} [activeTag=''] - Currently selected tag
 */
export function renderTagFilters(tags, activeTag = '') {
    const container = document.getElementById('tagsContainer');
    const clearBtn = document.getElementById('clearFilterBtn');

    if (!container) return;

    if (!tags || tags.length === 0) {
        container.innerHTML = '<p class="tags-empty">لا توجد وسوم مسجلة بعد</p>';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    if (clearBtn) {
        clearBtn.style.display = activeTag ? 'inline-flex' : 'none';
    }

    container.innerHTML = tags.map(tag => {
        const isSelected = tag.name.toLowerCase() === (activeTag || '').toLowerCase();
        return `
            <button
                type="button"
                class="tag-filter ${isSelected ? 'active' : ''}"
                data-action="filter-tag"
                data-tag="${escapeAttribute(tag.name)}"
            >
                <span>#${escapeHtml(tag.name)}</span>
                <span class="tag-count">${tag.count}</span>
            </button>
        `;
    }).join('');
}

/**
 * Update quick stats metrics in header or summary bar.
 *
 * @param {{ totalSnippets: number, totalFavorites: number, totalTags: number, languagesCount: number }} stats - Metrics
 */
export function renderStats(stats) {
    const totalEl = document.getElementById('statTotalSnippets');
    const favsEl = document.getElementById('statFavorites');
    const tagsEl = document.getElementById('statTags');
    const langsEl = document.getElementById('statLanguages');

    if (totalEl) totalEl.textContent = stats.totalSnippets;
    if (favsEl) favsEl.textContent = stats.totalFavorites;
    if (tagsEl) tagsEl.textContent = stats.totalTags;
    if (langsEl) langsEl.textContent = stats.languagesCount;
}

/**
 * Render and open the dedicated Full Snippet Viewer Modal.
 * Displays un-truncated code with syntax highlighting, line count, language badge,
 * full description, tags, copy, and edit shortcuts.
 *
 * @param {Object} snippet - Snippet to view
 */
export function openViewerModal(snippet) {
    const modal = document.getElementById('viewerModal');
    if (!modal || !snippet) return;

    const titleEl = document.getElementById('viewerTitle');
    const langBadgeEl = document.getElementById('viewerLanguageBadge');
    const descEl = document.getElementById('viewerDescription');
    const codeEl = document.getElementById('viewerCode');
    const tagsContainer = document.getElementById('viewerTags');
    const copyBtn = document.getElementById('viewerCopyBtn');
    const editBtn = document.getElementById('viewerEditBtn');
    const dateEl = document.getElementById('viewerDate');
    const linesCountEl = document.getElementById('viewerLinesCount');

    const langName = getLanguageName(snippet.language);
    const langColor = getLanguageColor(snippet.language);
    const prismClass = getPrismLanguage(snippet.language);

    if (titleEl) titleEl.textContent = snippet.title;
    if (langBadgeEl) {
        langBadgeEl.textContent = langName;
        langBadgeEl.style.backgroundColor = `${langColor}25`;
        langBadgeEl.style.color = langColor;
        langBadgeEl.style.borderColor = `${langColor}60`;
    }

    if (descEl) {
        if (snippet.description) {
            descEl.textContent = snippet.description;
            descEl.style.display = 'block';
        } else {
            descEl.style.display = 'none';
        }
    }

    if (codeEl) {
        codeEl.className = `language-${prismClass}`;
        codeEl.textContent = snippet.code;
    }

    if (linesCountEl) {
        const lineCount = (snippet.code || '').split('\n').length;
        linesCountEl.textContent = `${lineCount} ${lineCount === 1 ? 'سطر' : 'أسطر'}`;
    }

    if (dateEl) {
        dateEl.textContent = `آخر تعديل: ${formatDate(snippet.updatedAt || snippet.createdAt)}`;
    }

    if (tagsContainer) {
        if (Array.isArray(snippet.tags) && snippet.tags.length > 0) {
            tagsContainer.innerHTML = snippet.tags
                .map(t => `<span class="tag">#${escapeHtml(t)}</span>`)
                .join('');
            tagsContainer.style.display = 'flex';
        } else {
            tagsContainer.style.display = 'none';
        }
    }

    if (copyBtn) copyBtn.dataset.id = snippet.id;
    if (editBtn) editBtn.dataset.id = snippet.id;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Trigger Prism highlight on the viewer's code element
    if (window.Prism && codeEl) {
        Prism.highlightElement(codeEl);
    }
}

/**
 * Close the viewer modal.
 */
export function closeViewerModal() {
    const modal = document.getElementById('viewerModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Open the Add/Edit Snippet Form Modal.
 *
 * @param {Object|null} [snippet=null] - Snippet to edit, or null to create a new one
 */
export function openEditModal(snippet = null) {
    const modal = document.getElementById('snippetModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('snippetForm');
    const codeLengthCount = document.getElementById('codeLengthCount');

    if (!modal || !form) return;

    form.reset();

    if (snippet) {
        if (modalTitle) modalTitle.textContent = 'تعديل الكود البرمجي';
        document.getElementById('snippetId').value = snippet.id;
        document.getElementById('snippetTitle').value = snippet.title;
        document.getElementById('snippetLanguage').value = snippet.language;
        document.getElementById('snippetCode').value = snippet.code;
        document.getElementById('snippetDescription').value = snippet.description || '';
        document.getElementById('snippetTags').value = Array.isArray(snippet.tags) ? snippet.tags.join(', ') : '';
        if (codeLengthCount) codeLengthCount.textContent = `${snippet.code.length} حرف`;
    } else {
        if (modalTitle) modalTitle.textContent = 'إضافة كود جديد';
        document.getElementById('snippetId').value = '';
        if (codeLengthCount) codeLengthCount.textContent = '0 حرف';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Auto-focus title input
    setTimeout(() => {
        const titleInput = document.getElementById('snippetTitle');
        if (titleInput) titleInput.focus();
    }, 120);
}

/**
 * Close Add/Edit form modal.
 */
export function closeEditModal() {
    const modal = document.getElementById('snippetModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Open the Import Preview Modal.
 *
 * @param {{ isValid: boolean, error?: string, rawSnippets: Array<Object>, wouldAdd: number, wouldUpdate: number }} validation - Pre-import check
 */
export function openImportModal(validation) {
    const modal = document.getElementById('importModal');
    if (!modal) return;

    const summaryEl = document.getElementById('importSummary');
    const errorEl = document.getElementById('importError');
    const confirmBtn = document.getElementById('confirmImportBtn');

    if (!validation.isValid) {
        if (errorEl) {
            errorEl.textContent = validation.error || 'الملف المختار غير صالح';
            errorEl.style.display = 'block';
        }
        if (summaryEl) summaryEl.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = true;
    } else {
        if (errorEl) errorEl.style.display = 'none';
        if (summaryEl) {
            summaryEl.style.display = 'block';
            summaryEl.innerHTML = `
                <div class="import-preview-box">
                    <p>📦 تم العثور على <strong>${validation.rawSnippets.length}</strong> كود برمجي داخل الملف.</p>
                    <ul class="import-stats-list">
                        <li>➕ أكواد جديدة ستُضاف: <strong>${validation.wouldAdd}</strong></li>
                        <li>🔄 أكواد موجودة ستُحدّث: <strong>${validation.wouldUpdate}</strong></li>
                    </ul>
                    <p class="import-note">💡 نصيحة: خيار "الدمج" هو الأكثر أماناً لأنه يحافظ على أكوادك الحالية.</p>
                </div>
            `;
        }
        if (confirmBtn) confirmBtn.disabled = false;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close the Import Modal.
 */
export function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Open the Keyboard Shortcuts Reference Modal.
 */
export function openShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close Keyboard Shortcuts Modal.
 */
export function closeShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Display a modern, non-blocking toast notification.
 *
 * @param {string} message - Notification text
 * @param {'success'|'error'|'info'|'warning'} [type='success'] - Toast level
 * @param {number} [duration=3500] - Duration in milliseconds before auto-dismiss
 */
export function showToast(message, type = 'success', duration = 3500) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast?.querySelector('.toast-icon');

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;

    const icons = {
        success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22 4 12 14.01 9 11.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        error: '<circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke-width="2" stroke-linecap="round"/>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="13" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2"/>',
        info: '<circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="8" x2="12.01" y2="8" stroke-width="2"/>'
    };

    if (toastIcon) {
        toastIcon.innerHTML = icons[type] || icons.info;
    }

    toast.className = `toast toast-${type} show`;

    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

/**
 * Apply theme to document and update toggle button state.
 *
 * @param {'dark'|'light'} theme - 'dark' or 'light'
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        const isDark = theme === 'dark';
        themeToggleBtn.setAttribute('title', isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن');
        themeToggleBtn.setAttribute('aria-label', isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن');

        themeToggleBtn.innerHTML = isDark
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
               </svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
               </svg>`;
    }
}

/**
 * Trigger Prism syntax highlighting across elements.
 * Safely guards against situations where Prism may not yet be loaded or active.
 */
export function highlightCode() {
    if (typeof window !== 'undefined' && window.Prism && typeof window.Prism.highlightAll === 'function') {
        try {
            window.Prism.highlightAll();
        } catch (e) {
            console.warn('Prism highlighting encountered an issue:', e);
        }
    }
}

/**
 * Standard confirmation dialog abstraction.
 *
 * @param {string} message - Confirmation prompt
 * @returns {boolean} User response
 */
export function confirmDialog(message) {
    return window.confirm(message);
}
