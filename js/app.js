import * as storage from './storage.js';
import * as ui from './ui.js';
import * as utils from './utils.js';

const state = {
    currentFilter: '',
    searchQuery: ''
};

function init() {
    loadSnippets();
    
    loadTags();
    
    setupEventListeners();
    
    console.log('✅ Code Snippet Manager initialized');
}


function loadSnippets() {
    const snippets = storage.searchSnippets(state.searchQuery, state.currentFilter);
    ui.renderSnippets(snippets);
    ui.updateSearchCount(snippets.length, state.searchQuery);
}


function loadTags() {
    const tags = storage.getAllTags();
    ui.renderTagFilters(tags, state.currentFilter);
}


function setupEventListeners() {
    document.getElementById('addSnippetBtn').addEventListener('click', () => {
        ui.openModal();
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', ui.closeModal);
    document.getElementById('cancelBtn').addEventListener('click', ui.closeModal);
    document.getElementById('modalBackdrop').addEventListener('click', ui.closeModal);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ui.closeModal();
        }
    });
    
    document.getElementById('snippetForm').addEventListener('submit', handleFormSubmit);
    
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', utils.debounce((e) => {
        state.searchQuery = e.target.value;
        loadSnippets();
    }, 300));
    
    document.getElementById('clearFilterBtn').addEventListener('click', () => {
        state.currentFilter = '';
        loadSnippets();
        loadTags();
    });
    
    // Auto-resize textarea
    const textarea = document.getElementById('snippetCode');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
}


function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const id = document.getElementById('snippetId').value || utils.generateId();
    const title = document.getElementById('snippetTitle').value.trim();
    const language = document.getElementById('snippetLanguage').value;
    const code = document.getElementById('snippetCode').value.trim();
    const description = document.getElementById('snippetDescription').value.trim();
    const tagsString = document.getElementById('snippetTags').value;
    const tags = utils.parseTags(tagsString);
    
    const snippet = {
        id,
        title,
        language,
        code,
        description,
        tags
    };
    
    const success = storage.saveSnippet(snippet);
    
    if (success) {
        ui.closeModal();
        loadSnippets();
        loadTags();
        
        const isEdit = document.getElementById('snippetId').value !== '';
        ui.showToast(
            isEdit ? '✅ تم تحديث الكود بنجاح' : '✅ تم إضافة الكود بنجاح',
            'success'
        );
    } else {
        ui.showToast('❌ حدث خطأ أثناء الحفظ', 'error');
    }
}


window.editSnippet = function(id) {
    const snippet = storage.getSnippet(id);
    if (snippet) {
        ui.openModal(snippet);
    }
};

/**
 * Delete snippet (called from global scope)
 */
window.deleteSnippet = function(id) {
    const snippet = storage.getSnippet(id);
    if (!snippet) return;
    
    const confirmed = ui.confirm(`هل أنت متأكد من حذف الكود "${snippet.title}"؟`);
    
    if (confirmed) {
        const success = storage.deleteSnippet(id);
        
        if (success) {
            loadSnippets();
            loadTags();
            ui.showToast('🗑️ تم حذف الكود', 'success');
        } else {
            ui.showToast('❌ حدث خطأ أثناء الحذف', 'error');
        }
    }
};

/**
 * Copy snippet code (called from global scope)
 */
window.copySnippet = async function(id) {
    const snippet = storage.getSnippet(id);
    if (!snippet) return;
    
    const success = await utils.copyToClipboard(snippet.code);
    
    if (success) {
        ui.showToast('📋 تم نسخ الكود بنجاح', 'success');
    } else {
        ui.showToast('❌ فشل النسخ. حاول مرة أخرى', 'error');
    }
};

/**
 * Filter by tag (called from global scope)
 */
window.filterByTag = function(tag) {
    // Toggle filter
    if (state.currentFilter === tag) {
        state.currentFilter = '';
    } else {
        state.currentFilter = tag;
    }
    
    // Clear search when filtering by tag
    state.searchQuery = '';
    document.getElementById('searchInput').value = '';
    
    loadSnippets();
    loadTags();
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
