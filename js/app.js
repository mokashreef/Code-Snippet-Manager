import * as storage from './storage.js';
import * as ui from './ui.js';
import * as utils from './utils.js';

const state = {
    currentFilter: '',
    searchQuery: ''
};

let codeEditor = null; // CodeMirror instance
let pendingImport = {
    raw: null,
    parsed: null
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
    // Add snippet button
    document.getElementById('addSnippetBtn').addEventListener('click', () => {
        ui.openModal();
        // initialize editor slightly after modal opens
        setTimeout(() => prepareEditorForModal(), 50);
    });

    // Close / cancel
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        ui.closeModal();
        clearEditor();
    });
    document.getElementById('cancelBtn').addEventListener('click', () => {
        ui.closeModal();
        clearEditor();
    });
    document.getElementById('modalBackdrop').addEventListener('click', () => {
        ui.closeModal();
        clearEditor();
    });

    // Keyboard ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ui.closeModal();
            hideImportPreview();
            clearEditor();
        }
    });

    // Form submit
    document.getElementById('snippetForm').addEventListener('submit', handleFormSubmit);

    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', utils.debounce((e) => {
        state.searchQuery = e.target.value;
        loadSnippets();
    }, 300));

    // Clear filter
    document.getElementById('clearFilterBtn').addEventListener('click', () => {
        state.currentFilter = '';
        loadSnippets();
        loadTags();
    });

    // Auto-resize textarea (hidden when using editor) — keep for fallback
    const textarea = document.getElementById('snippetCode');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    // Language change -> update editor mode
    const langSelect = document.getElementById('snippetLanguage');
    langSelect.addEventListener('change', (e) => {
        setEditorModeForLanguage(e.target.value);
    });

    // Export / Import / Restore
    document.getElementById('exportBtn').addEventListener('click', handleExport);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFileInput').value = null;
        document.getElementById('importFileInput').click();
    });
    document.getElementById('restoreBackupBtn').addEventListener('click', handleRestoreBackup);

    // File input change
    document.getElementById('importFileInput').addEventListener('change', handleImportFileInput);

    // Import preview modal buttons
    document.getElementById('importPreviewClose').addEventListener('click', hideImportPreview);
    document.getElementById('cancelImportPreviewBtn').addEventListener('click', hideImportPreview);
    document.getElementById('importPreviewMergeBtn').addEventListener('click', () => applyImport({ merge: true }));
    document.getElementById('importPreviewReplaceBtn').addEventListener('click', () => applyImport({ merge: false }));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const meta = e.ctrlKey || e.metaKey;
        if (meta && e.shiftKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            handleExport();
        }

        // Command palette (Ctrl/Cmd+K)
        if (meta && !e.shiftKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggleCommandPalette();
        }

        // Quick find (/) focuses search
        if (!meta && e.key === '/') {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    });

    // Command palette close
    document.getElementById('commandPaletteClose').addEventListener('click', hideCommandPalette);
    document.getElementById('commandPaletteBackdrop').addEventListener('click', hideCommandPalette);
    document.getElementById('commandPaletteInput').addEventListener('input', utils.debounce(handleCommandPaletteSearch, 150));
}

function handleFormSubmit(e) {
    e.preventDefault();

    // Get form values
    const id = document.getElementById('snippetId').value || utils.generateId();
    const title = document.getElementById('snippetTitle').value.trim();
    const language = document.getElementById('snippetLanguage').value;
    const description = document.getElementById('snippetDescription').value.trim();
    const tagsString = document.getElementById('snippetTags').value;
    const tags = utils.parseTags(tagsString);

    // Get code from editor (fallback to textarea)
    const code = (codeEditor && typeof codeEditor.getValue === 'function') ? codeEditor.getValue() : document.getElementById('snippetCode').value.trim();

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
        clearEditor();
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

// Open editor and populate when modal opens
function prepareEditorForModal(initialCode = '') {
    // Ensure CodeMirror is available
    if (typeof CodeMirror === 'undefined') return;

    const editorContainer = document.getElementById('snippetCodeEditor');
    if (!editorContainer) return;

    if (!codeEditor) {
        codeEditor = CodeMirror(editorContainer, {
            value: initialCode || document.getElementById('snippetCode').value || '',
            mode: 'javascript',
            theme: 'material-darker',
            lineNumbers: true,
            indentUnit: 2,
            tabSize: 2,
            autofocus: true,
            viewportMargin: Infinity
        });

        // Sync editor changes back to hidden textarea if needed
        codeEditor.on('change', () => {
            const textarea = document.getElementById('snippetCode');
            if (textarea) textarea.value = codeEditor.getValue();
        });
    } else {
        // set existing value if provided
        if (initialCode) codeEditor.setValue(initialCode);
    }

    // set mode according to selected language
    const lang = document.getElementById('snippetLanguage').value;
    setEditorModeForLanguage(lang);
}

function clearEditor() {
    if (!codeEditor) return;
    codeEditor.setValue('');
    // optionally destroy instance? keep it to reuse
}

function setEditorModeForLanguage(lang) {
    if (!codeEditor || typeof codeEditor.setOption !== 'function') return;

    const map = {
        javascript: 'javascript',
        typescript: 'javascript',
        html: 'htmlmixed',
        css: 'css',
        python: 'python',
        php: 'php',
        sql: 'sql',
        json: { name: 'javascript', json: true },
        markdown: 'markdown',
        bash: 'shell'
    };

    const mode = map[lang] || 'javascript';
    codeEditor.setOption('mode', mode);
}

// Override global functions that previously existed so we can attach editor logic
window.editSnippet = function(id) {
    const snippet = storage.getSnippet(id);
    if (snippet) {
        // fill form fields then open modal
        document.getElementById('snippetId').value = snippet.id || '';
        document.getElementById('snippetTitle').value = snippet.title || '';
        document.getElementById('snippetLanguage').value = snippet.language || '';
        document.getElementById('snippetDescription').value = snippet.description || '';
        document.getElementById('snippetTags').value = (snippet.tags || []).join(', ');

        ui.openModal(snippet);

        // initialize editor with snippet code after modal is visible
        setTimeout(() => prepareEditorForModal(snippet.code || ''), 60);
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

// Export handler (download JSON file)
function handleExport() {
    const json = storage.exportSnippets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const fname = `snippets_${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    ui.showToast('⬇️ تم تصدير السنيبتات', 'success');
}

// Import flow
function handleImportFileInput(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const raw = ev.target.result;
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('تنسيق غير صالح: يجب أن يكون مصفوفة من السنيبتات');

            pendingImport.raw = raw;
            pendingImport.parsed = parsed;
            showImportPreview(parsed);
        } catch (err) {
            ui.showToast('❌ ملف غير صالح: ' + err.message, 'error');
        }
    };
    reader.readAsText(file, 'utf-8');
}

function showImportPreview(parsed) {
    // compute summary
    const existing = storage.getAllSnippets();
    const existingIds = new Set(existing.map(s => s.id));
    let wouldAdd = 0;
    let wouldUpdate = 0;
    const items = [];

    parsed.forEach((item, idx) => {
        const title = item.title || item.id || `سنيبت ${idx + 1}`;
        if (item.id && existingIds.has(item.id)) {
            wouldUpdate++;
            items.push({ title, type: 'update' });
        } else {
            wouldAdd++;
            items.push({ title, type: 'add' });
        }
    });

    const summaryEl = document.getElementById('importPreviewSummary');
    summaryEl.innerHTML = `<p>سيتم إضافة <strong>${wouldAdd}</strong> سنيبت، وتحديث <strong>${wouldUpdate}</strong> سنيبت (إن وجدت مطابقات بالـ id).</p>`;

    const listEl = document.getElementById('importPreviewList');
    listEl.innerHTML = '';
    const maxShow = 50;
    items.slice(0, maxShow).forEach(it => {
        const div = document.createElement('div');
        div.className = 'import-preview-item';
        div.textContent = `${it.type === 'add' ? 'إضافة' : 'تحديث'} — ${it.title}`;
        listEl.appendChild(div);
    });
    if (items.length > maxShow) {
        const more = document.createElement('div');
        more.className = 'import-preview-more';
        more.textContent = `و ${items.length - maxShow} المزيد...`;
        listEl.appendChild(more);
    }

    // show modal
    const modal = document.getElementById('importPreviewModal');
    if (modal) modal.style.display = 'block';
}

function hideImportPreview() {
    const modal = document.getElementById('importPreviewModal');
    if (modal) modal.style.display = 'none';
    pendingImport.raw = null;
    pendingImport.parsed = null;
}

async function applyImport(options = { merge: true }) {
    if (!pendingImport.raw) return;

    // create backup before replace
    if (!options.merge) {
        const ok = storage.backupCurrent();
        if (!ok) {
            ui.showToast('❌ فشل إنشاء النسخة الاحتياطية', 'error');
            return;
        }
    }

    const result = storage.importSnippets(pendingImport.raw, { merge: options.merge });

    if (result && result.success) {
        hideImportPreview();
        loadSnippets();
        loadTags();
        ui.showToast(`✅ اكتملت العملية — تمت الإضافة: ${result.added}، التحديث: ${result.updated}`, 'success');
    } else {
        ui.showToast('❌ فشل الاستيراد: ' + (result.error || 'خطأ غير معروف'), 'error');
    }
}

function handleRestoreBackup() {
    const backup = storage.getBackup();
    if (!backup) {
        ui.showToast('ℹ️ لا توجد نسخة احتياطية محفوظة', 'warning');
        return;
    }

    const confirmed = ui.confirm(`آخر نسخة احتياطية: ${backup.createdAt}. هل تريد الاستعادة؟`);
    if (!confirmed) return;

    const ok = storage.restoreBackup();
    if (ok) {
        loadSnippets();
        loadTags();
        ui.showToast('✅ تم استعادة النسخة الاحتياطية', 'success');
    } else {
        ui.showToast('❌ فشل استعادة النسخة', 'error');
    }
}

// Simple command palette (search commands)
function toggleCommandPalette() {
    const el = document.getElementById('commandPalette');
    if (!el) return;
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        el.setAttribute('aria-hidden', 'false');
        document.getElementById('commandPaletteInput').focus();
        populateCommandPalette();
    } else {
        hideCommandPalette();
    }
}

function hideCommandPalette() {
    const el = document.getElementById('commandPalette');
    if (!el) return;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
}

function populateCommandPalette() {
    const list = document.getElementById('commandPaletteList');
    list.innerHTML = '';
    const commands = [
        { id: 'add', title: 'أضف كود جديد', action: () => { ui.openModal(); setTimeout(()=>prepareEditorForModal(),50); hideCommandPalette(); } },
        { id: 'export', title: 'تصدير السنيبتات', action: () => { handleExport(); hideCommandPalette(); } },
        { id: 'import', title: 'استيراد سنيبتات', action: () => { document.getElementById('importFileInput').click(); hideCommandPalette(); } },
        { id: 'restore', title: 'استعادة آخر نسخة احتياطية', action: () => { handleRestoreBackup(); hideCommandPalette(); } }
    ];

    commands.forEach(cmd => {
        const li = document.createElement('li');
        li.tabIndex = 0;
        li.className = 'command-item';
        li.textContent = cmd.title;
        li.addEventListener('click', cmd.action);
        list.appendChild(li);
    });
}

function handleCommandPaletteSearch(e) {
    const q = e.target.value.trim().toLowerCase();
    const list = document.getElementById('commandPaletteList');
    Array.from(list.children).forEach(li => {
        li.style.display = li.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
