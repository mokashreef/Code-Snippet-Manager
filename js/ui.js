import { escapeHtml, formatDate, getLanguageName, getLanguageColor, truncate } from './utils.js';

/**
 * Render all snippets to the grid
 * @param {Array} snippets - Array of snippet objects
 */
export function renderSnippets(snippets) {
    const grid = document.getElementById('snippetsGrid');
    const emptyState = document.getElementById('emptyState');
    const snippetsCount = document.getElementById('snippetsCount');
    
    const count = snippets.length;
    snippetsCount.textContent = count === 0 ? 'لا توجد أكواد' : 
        count === 1 ? 'كود واحد' : 
        count === 2 ? 'كودان' : 
        `${count} ${count <= 10 ? 'أكواد' : 'كود'}`;
    
    if (count === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    grid.innerHTML = snippets.map(snippet => renderSnippetCard(snippet)).join('');
    
    highlightCode();
}

/**
 * Render a single snippet card
 * @param {Object} snippet - Snippet object
 * @returns {string} HTML string
 */
export function renderSnippetCard(snippet) {
    const languageColor = getLanguageColor(snippet.language);
    const languageName = getLanguageName(snippet.language);
    const truncatedCode = truncate(snippet.code, 150);
    const timeAgo = formatDate(snippet.updatedAt || snippet.createdAt);
    
    return `
        <div class="snippet-card" data-id="${snippet.id}">
            <div class="snippet-header">
                <div class="snippet-language" style="background: ${languageColor}20; color: ${languageColor};">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="8" r="3"/>
                    </svg>
                    ${escapeHtml(languageName)}
                </div>
                <div class="snippet-actions">
                    <button class="btn-icon" onclick="window.editSnippet('${snippet.id}')" title="تعديل">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                            <path d="M12 2L16 6L6 16H2V12L12 2Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="window.deleteSnippet('${snippet.id}')" title="حذف">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                            <path d="M3 5H15M6 5V3H12V5M7 8V13M11 8V13M5 5L6 15H12L13 5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <h3 class="snippet-title">${escapeHtml(snippet.title)}</h3>
            
            ${snippet.description ? `
                <p class="snippet-description">${escapeHtml(snippet.description)}</p>
            ` : ''}
            
            <div class="snippet-code-wrapper">
                <pre><code class="language-${snippet.language}">${escapeHtml(truncatedCode)}</code></pre>
                <button class="btn-copy" onclick="window.copySnippet('${snippet.id}')" title="نسخ الكود">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                        <rect x="6" y="6" width="10" height="10" rx="1" stroke-width="1.5"/>
                        <path d="M12 6V3C12 2.4 11.6 2 11 2H3C2.4 2 2 2.4 2 3V11C2 11.6 2.4 12 3 12H6" stroke-width="1.5"/>
                    </svg>
                    نسخ
                </button>
            </div>
            
            ${snippet.tags && snippet.tags.length > 0 ? `
                <div class="snippet-tags">
                    ${snippet.tags.map(tag => `
                        <span class="tag" onclick="window.filterByTag('${escapeHtml(tag)}')">${escapeHtml(tag)}</span>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="snippet-footer">
                <span class="snippet-time">${timeAgo}</span>
            </div>
        </div>
    `;
}

/**
 * Render tag filter buttons
 * @param {Array} tags - Array of tag objects {name, count}
 * @param {string} activeTag - Currently active tag filter
 */
export function renderTagFilters(tags, activeTag = '') {
    const container = document.getElementById('tagsContainer');
    const clearBtn = document.getElementById('clearFilterBtn');
    
    if (tags.length === 0) {
        container.innerHTML = '<p class="tags-empty">لا توجد وسوم بعد</p>';
        clearBtn.style.display = 'none';
        return;
    }
    
    clearBtn.style.display = activeTag ? 'inline-block' : 'none';
    
    container.innerHTML = tags.map(tag => `
        <button 
            class="tag-filter ${tag.name === activeTag ? 'active' : ''}" 
            onclick="window.filterByTag('${escapeHtml(tag.name)}')"
            data-tag="${escapeHtml(tag.name)}"
        >
            ${escapeHtml(tag.name)}
            <span class="tag-count">${tag.count}</span>
        </button>
    `).join('');
}

/**
 * Open modal for add/edit
 * @param {Object|null} snippet - Snippet to edit, or null for new
 */
export function openModal(snippet = null) {
    const modal = document.getElementById('snippetModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('snippetForm');
    
    // Reset form
    form.reset();
    
    if (snippet) {
        modalTitle.textContent = 'تعديل الكود';
        document.getElementById('snippetId').value = snippet.id;
        document.getElementById('snippetTitle').value = snippet.title;
        document.getElementById('snippetLanguage').value = snippet.language;
        document.getElementById('snippetCode').value = snippet.code;
        document.getElementById('snippetDescription').value = snippet.description || '';
        document.getElementById('snippetTags').value = snippet.tags ? snippet.tags.join(', ') : '';
    } else {
        modalTitle.textContent = 'إضافة كود جديد';
        document.getElementById('snippetId').value = '';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        document.getElementById('snippetTitle').focus();
    }, 100);
}


export function closeModal() {
    const modal = document.getElementById('snippetModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success' | 'error' | 'info'
 */
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');
    
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toastIcon.innerHTML = `
            <path d="M16 10L8 18L4 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        `;
    } else if (type === 'error') {
        toastIcon.innerHTML = `
            <path d="M10 2L18 10L10 18L2 10L10 2Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 7V11M10 14H10.01" stroke-width="2" stroke-linecap="round"/>
        `;
    }
    
    toast.className = `toast toast-${type}`;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}


export function highlightCode() {
    if (window.Prism) {
        Prism.highlightAll();
    }
}

/**
 * Update search count display
 * @param {number} count - Number of results
 * @param {string} query - Search query
 */
export function updateSearchCount(count, query) {
    const searchCount = document.getElementById('searchCount');
    
    if (!query.trim()) {
        searchCount.textContent = '';
        return;
    }
    
    searchCount.textContent = count === 0 ? 'لا توجد نتائج' : 
        count === 1 ? 'نتيجة واحدة' : 
        count === 2 ? 'نتيجتان' : 
        `${count} ${count <= 10 ? 'نتائج' : 'نتيجة'}`;
}

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @returns {boolean} User's choice
 */
export function confirm(message) {
    return window.confirm(message);
}
