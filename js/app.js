import * as storage from './storage.js';
import * as ui from './ui.js';
import * as utils from './utils.js';

const THEME_KEY = 'snippet-theme';
const SHORTCUTS_KEY = 'snippet-shortcuts-enabled';
const HELP_KEY = 'snippet-help-shown';

const state = {
    currentFilter: '',
    searchQuery: '',
    shortcutsEnabled: true,
    paletteOpen: false
};

function init() {
    initTheme();
    loadSnippets();
    loadTags();
    setupEventListeners();
    setupSearchShortcuts();
    setupThemeToggle();
    setupCommandPalette();
    maybeShowFirstTimeHelp();
    console.log('✅ Code Snippet Manager initialized');
}

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);
    state.shortcutsEnabled = localStorage.getItem(SHORTCUTS_KEY) !== 'false';
    syncShortcutsButton();
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    const label = document.getElementById('themeToggleLabel');
    if (label) {
        label.textContent = theme === 'dark' ? 'داكن' : 'فاتح';
    }
}

function toggleTheme() {
    const nextTheme = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
}

function setShortcutsEnabled(enabled) {
    state.shortcutsEnabled = enabled;
    localStorage.setItem(SHORTCUTS_KEY, String(enabled));
    syncShortcutsButton();
}

function syncShortcutsButton() {
    const btn = document.getElementById('shortcutsToggleBtn');
    if (!btn) return;
    const label = btn.querySelector('.shortcut-toggle-text');
    const isOn = state.shortcutsEnabled;
    btn.classList.toggle('is-off', !isOn);
    if (label) {
        label.textContent = isOn ? 'اختصارات: مفعل' : 'اختصارات: معطل';
    }
}

function toggleShortcuts() {
    setShortcutsEnabled(!state.shortcutsEnabled);
    ui.showToast(state.shortcutsEnabled ? '✅ تم تفعيل اختصارات لوحة المفاتيح' : '⚠️ تم إيقاف اختصارات لوحة المفاتيح', 'success');
}

function maybeShowFirstTimeHelp() {
    const hasShown = localStorage.getItem(HELP_KEY) === 'true';
    if (!hasShown) {
        localStorage.setItem(HELP_KEY, 'true');
        setTimeout(() => {
            openCommandPalette();
            const paletteInput = document.getElementById('commandPaletteInput');
            if (paletteInput) {
                paletteInput.value = 'بحث';
                renderCommandPaletteItems('بحث');
            }
        }, 600);
    }
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
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    const shortcutsToggleBtn = document.getElementById('shortcutsToggleBtn');
    if (shortcutsToggleBtn) {
        shortcutsToggleBtn.addEventListener('click', toggleShortcuts);
    }

    document.getElementById('addSnippetBtn').addEventListener('click', () => {
        ui.openModal();
    });

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }

    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const input = document.getElementById('importFileInput');
            if (input) {
                input.value = '';
                input.click();
            }
        });
    }

    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) {
        importFileInput.addEventListener('change', handleImportFile);
    }

    document.getElementById('closeModalBtn').addEventListener('click', ui.closeModal);
    document.getElementById('cancelBtn').addEventListener('click', ui.closeModal);
    document.getElementById('modalBackdrop').addEventListener('click', ui.closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !state.paletteOpen) {
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

    const textarea = document.getElementById('snippetCode');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
}

function handleExport() {
    try {
        const json = storage.exportSnippets();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `snippets-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        ui.showToast('✅ تم تصدير السنيبتات (JSON)', 'success');
    } catch (error) {
        console.error(error);
        ui.showToast('❌ فشل التصدير', 'error');
    }
}

async function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const merge = confirm('هل تريد دمج البيانات المستوردة مع الحالية؟\nاضغط OK للدمج أو Cancel للاستبدال.');
        const result = storage.importSnippets(text, { merge: !!merge });

        if (result && result.success) {
            const message = merge
                ? `✅ تم الاستيراد: ${result.added} جديد(ة), ${result.updated} محدث(ة).`
                : `✅ تم الاستبدال بنجاح (${result.added} عنصر).`;
            ui.showToast(message, 'success');
            loadSnippets();
            loadTags();
        } else {
            ui.showToast('❌ ملف JSON غير صالح أو فشل الاستيراد', 'error');
        }
    } catch (error) {
        console.error(error);
        ui.showToast('❌ حدث خطأ أثناء الاستيراد', 'error');
    } finally {
        e.target.value = '';
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

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

window.filterByTag = function(tag) {
    if (state.currentFilter === tag) {
        state.currentFilter = '';
    } else {
        state.currentFilter = tag;
    }

    state.searchQuery = '';
    document.getElementById('searchInput').value = '';

    loadSnippets();
    loadTags();
};

function setupSearchShortcuts() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    function focusSearch() {
        searchInput.focus();
        try {
            searchInput.select();
        } catch (error) {}
    }

    document.addEventListener('keydown', (e) => {
        if (!state.shortcutsEnabled) return;

        const active = document.activeElement;
        const isEditing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openCommandPalette();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            focusSearch();
            return;
        }

        if (e.key === '/' && !isEditing && !state.paletteOpen) {
            e.preventDefault();
            focusSearch();
            return;
        }

        if (e.key === 'Escape') {
            if (state.paletteOpen) {
                closeCommandPalette();
                return;
            }
            if (document.activeElement === searchInput) {
                searchInput.blur();
            }
        }
    });
}

function setupCommandPalette() {
    const palette = document.getElementById('commandPalette');
    const paletteInput = document.getElementById('commandPaletteInput');
    const list = document.getElementById('commandPaletteList');
    if (!palette || !paletteInput || !list) return;

    function getActions() {
        return [
            { id: 'focus-search', label: 'بحث', hint: 'تحديد حقل البحث', action: () => focusSearchInput() },
            { id: 'add-snippet', label: 'إضافة كود جديد', hint: 'فتح نافذة الإضافة', action: () => { ui.openModal(); closeCommandPalette(); } },
            { id: 'toggle-theme', label: 'تبديل الثيم', hint: 'داكن/فاتح', action: () => { toggleTheme(); closeCommandPalette(); } },
            { id: 'export-snippets', label: 'تصدير', hint: 'تصدير JSON', action: () => { handleExport(); closeCommandPalette(); } },
            { id: 'import-snippets', label: 'استيراد', hint: 'استيراد JSON', action: () => { const input = document.getElementById('importFileInput'); if (input) { input.click(); } closeCommandPalette(); } },
            { id: 'toggle-shortcuts', label: state.shortcutsEnabled ? 'إيقاف الاختصارات' : 'تفعيل الاختصارات', hint: 'إدخال/إيقاف', action: () => { toggleShortcuts(); closeCommandPalette(); } },
            { id: 'clear-filter', label: 'مسح الفلتر', hint: 'إزالة التصفية الحالية', action: () => { state.currentFilter = ''; state.searchQuery = ''; document.getElementById('searchInput').value = ''; loadSnippets(); loadTags(); closeCommandPalette(); } }
        ];
    }

    function focusSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        searchInput.focus();
        try { searchInput.select(); } catch (error) {}
        closeCommandPalette();
    }

    function renderCommandPaletteItems(query = '') {
        const normalized = query.trim().toLowerCase();
        const actions = getActions().filter((item) => {
            if (!normalized) return true;
            return item.label.toLowerCase().includes(normalized) || item.hint.toLowerCase().includes(normalized);
        });

        if (!actions.length) {
            list.innerHTML = '<li class="command-empty">لا توجد أوامر مطابقة</li>';
            return;
        }

        list.innerHTML = actions.map((item, index) => `
            <li class="command-item ${index === 0 ? 'selected' : ''}" data-action-id="${item.id}">
                <span class="command-label">${item.label}</span>
                <span class="command-hint">${item.hint}</span>
            </li>
        `).join('');

        list.querySelectorAll('.command-item').forEach((item) => {
            item.addEventListener('click', () => {
                const action = getActions().find((entry) => entry.id === item.dataset.actionId);
                if (action) action.action();
            });
        });
    }

    paletteInput.addEventListener('input', (e) => renderCommandPaletteItems(e.target.value));

    paletteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const items = Array.from(list.querySelectorAll('.command-item'));
            const selected = items.find(item => item.classList.contains('selected')) || items[0];
            if (!selected) return;
            const action = getActions().find((entry) => entry.id === selected.dataset.actionId);
            if (action) action.action();
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const items = Array.from(list.querySelectorAll('.command-item'));
            if (!items.length) return;
            let currentIndex = items.findIndex(item => item.classList.contains('selected'));
            if (currentIndex < 0) currentIndex = 0;
            if (e.key === 'ArrowDown') currentIndex = (currentIndex + 1) % items.length;
            if (e.key === 'ArrowUp') currentIndex = (currentIndex - 1 + items.length) % items.length;
            items.forEach((item, idx) => item.classList.toggle('selected', idx === currentIndex));
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!state.paletteOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeCommandPalette();
        }
    });

    document.getElementById('commandPaletteClose').addEventListener('click', closeCommandPalette);
    document.getElementById('commandPaletteBackdrop').addEventListener('click', closeCommandPalette);
    renderCommandPaletteItems();
}

function openCommandPalette() {
    const palette = document.getElementById('commandPalette');
    const input = document.getElementById('commandPaletteInput');
    if (!palette || !input) return;
    state.paletteOpen = true;
    palette.classList.remove('hidden');
    input.value = '';
    renderCommandPaletteItems('');
    setTimeout(() => input.focus(), 50);
}

function closeCommandPalette() {
    const palette = document.getElementById('commandPalette');
    const input = document.getElementById('commandPaletteInput');
    if (!palette || !input) return;
    state.paletteOpen = false;
    palette.classList.add('hidden');
    input.value = '';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
