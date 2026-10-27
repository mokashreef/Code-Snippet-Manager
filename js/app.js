import * as storage from './storage.js';
import * as ui from './ui.js';
import * as utils from './utils.js';

const state = {
    searchQuery: '',
    currentTag: '',
    currentLanguage: '',
    favoritesOnly: false,
    sortBy: 'updated-desc',
    pendingImport: null,
    isFormDirty: false
};

export function init() {
    const storedTheme = storage.getStoredTheme();
    ui.applyTheme(storedTheme);
    populateLanguageFilter();
    refreshView();
    setupActionDelegation();
    setupToolbarListeners();
    setupFormListeners();
    setupImportExportListeners();
    setupKeyboardShortcuts();
}

export function refreshView() {
    const snippets = storage.searchSnippets({
        query: state.searchQuery,
        tag: state.currentTag,
        language: state.currentLanguage,
        favoritesOnly: state.favoritesOnly,
        sortBy: state.sortBy
    });

    ui.renderSnippets(snippets);
    ui.renderTagFilters(storage.getAllTags(), state.currentTag);
    ui.renderStats(storage.getStatistics());

    const searchCountEl = document.getElementById('searchCount');
    if (searchCountEl) {
        if (!state.searchQuery && !state.currentTag && !state.currentLanguage && !state.favoritesOnly) {
            searchCountEl.textContent = '';
        } else {
            const count = snippets.length;
            searchCountEl.textContent = `${count} ${count === 1 ? 'نتيجة' : 'نتائج'}`;
        }
    }
}

function populateLanguageFilter() {
    const select = document.getElementById('languageFilterSelect');
    if (!select) return;

    select.innerHTML = '<option value="">كل اللغات</option>';
    for (const [key, meta] of Object.entries(utils.LANGUAGE_REGISTRY)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = meta.name;
        select.appendChild(option);
    }
}

function setupActionDelegation() {
    const snippetsGrid = document.getElementById('snippetsGrid');
    if (snippetsGrid) {
        snippetsGrid.addEventListener('click', handleGridAction);
    }

    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) {
        tagsContainer.addEventListener('click', (e) => {
            const tagBtn = e.target.closest('[data-action="filter-tag"]');
            if (tagBtn) {
                const tag = tagBtn.dataset.tag;
                toggleTagFilter(tag);
            }
        });
    }

    const clearFilterBtn = document.getElementById('clearFilterBtn');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            state.currentTag = '';
            refreshView();
        });
    }
}

async function handleGridAction(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const snippetId = actionEl.dataset.id;
    if (!snippetId && action !== 'filter-tag') return;

    switch (action) {
        case 'view': {
            const snippet = storage.getSnippet(snippetId);
            if (snippet) ui.openViewerModal(snippet);
            break;
        }

        case 'copy': {
            const snippet = storage.getSnippet(snippetId);
            if (!snippet) return;
            const success = await utils.copyToClipboard(snippet.code);
            if (success) {
                ui.showToast('📋 تم نسخ الكود بنجاح إلى الحافظة', 'success');
            } else {
                ui.showToast('❌ تعذر نسخ الكود', 'error');
            }
            break;
        }

        case 'toggle-favorite': {
            const result = storage.toggleFavorite(snippetId);
            if (result.success) {
                ui.showToast(
                    result.isFavorite ? '⭐ تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة',
                    'info',
                    2000
                );
                refreshView();
            }
            break;
        }

        case 'edit': {
            const snippet = storage.getSnippet(snippetId);
            if (snippet) {
                state.isFormDirty = false;
                ui.openEditModal(snippet);
            }
            break;
        }

        case 'delete': {
            const snippet = storage.getSnippet(snippetId);
            if (!snippet) return;
            const confirmed = ui.confirmDialog(`هل أنت متأكد من حذف الكود "${snippet.title}"؟`);
            if (confirmed) {
                const deleted = storage.deleteSnippet(snippetId);
                if (deleted) {
                    ui.showToast('🗑️ تم حذف الكود بنجاح', 'success');
                    refreshView();
                } else {
                    ui.showToast('❌ فشل حذف الكود', 'error');
                }
            }
            break;
        }

        case 'filter-tag': {
            const tag = actionEl.dataset.tag;
            toggleTagFilter(tag);
            break;
        }
    }
}

function toggleTagFilter(tag) {
    if (state.currentTag.toLowerCase() === (tag || '').toLowerCase()) {
        state.currentTag = '';
    } else {
        state.currentTag = tag;
    }
    refreshView();
}

function setupToolbarListeners() {
    const addSnippetBtn = document.getElementById('addSnippetBtn');
    if (addSnippetBtn) {
        addSnippetBtn.addEventListener('click', () => {
            state.isFormDirty = false;
            ui.openEditModal(null);
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', utils.debounce((e) => {
            state.searchQuery = e.target.value;
            refreshView();
        }, 250));
    }

    const filterFavoritesBtn = document.getElementById('filterFavoritesBtn');
    if (filterFavoritesBtn) {
        filterFavoritesBtn.addEventListener('click', () => {
            state.favoritesOnly = !state.favoritesOnly;
            filterFavoritesBtn.classList.toggle('active', state.favoritesOnly);
            filterFavoritesBtn.setAttribute('aria-pressed', String(state.favoritesOnly));
            refreshView();
        });
    }

    const languageSelect = document.getElementById('languageFilterSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            state.currentLanguage = e.target.value;
            refreshView();
        });
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            refreshView();
        });
    }

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = storage.getStoredTheme();
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            storage.setStoredTheme(nextTheme);
            ui.applyTheme(nextTheme);
            ui.showToast(
                nextTheme === 'dark' ? '🌙 تم تفعيل الوضع الداكن' : '☀️ تم تفعيل الوضع الفاتح',
                'info',
                2000
            );
        });
    }

    const shortcutsBtn = document.getElementById('shortcutsBtn');
    if (shortcutsBtn) {
        shortcutsBtn.addEventListener('click', ui.openShortcutsModal);
    }
}

function setupFormListeners() {
    const form = document.getElementById('snippetForm');
    const codeTextarea = document.getElementById('snippetCode');
    const codeLengthCount = document.getElementById('codeLengthCount');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalBackdrop = document.getElementById('modalBackdrop');

    if (form) {
        form.addEventListener('input', () => {
            state.isFormDirty = true;
        });
        form.addEventListener('submit', handleFormSubmit);
    }

    if (codeTextarea) {
        codeTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = codeTextarea.selectionStart;
                const end = codeTextarea.selectionEnd;
                const value = codeTextarea.value;

                codeTextarea.value = value.substring(0, start) + '  ' + value.substring(end);
                codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 2;
                state.isFormDirty = true;
            }
        });

        codeTextarea.addEventListener('input', () => {
            if (codeLengthCount) {
                codeLengthCount.textContent = `${codeTextarea.value.length} حرف`;
            }
        });
    }

    const safelyCloseEditModal = () => {
        if (state.isFormDirty) {
            const discard = ui.confirmDialog('لديك تعديلات غير محفوظة. هل تريد الخروج بدون حفظ؟');
            if (!discard) return;
        }
        state.isFormDirty = false;
        ui.closeEditModal();
    };

    if (cancelBtn) cancelBtn.addEventListener('click', safelyCloseEditModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', safelyCloseEditModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', safelyCloseEditModal);

    const closeViewerBtn = document.getElementById('closeViewerBtn');
    const viewerBackdrop = document.getElementById('viewerBackdrop');
    if (closeViewerBtn) closeViewerBtn.addEventListener('click', ui.closeViewerModal);
    if (viewerBackdrop) viewerBackdrop.addEventListener('click', ui.closeViewerModal);

    const viewerCopyBtn = document.getElementById('viewerCopyBtn');
    if (viewerCopyBtn) {
        viewerCopyBtn.addEventListener('click', async () => {
            const id = viewerCopyBtn.dataset.id;
            const snippet = storage.getSnippet(id);
            if (snippet) {
                const ok = await utils.copyToClipboard(snippet.code);
                if (ok) ui.showToast('📋 تم نسخ الكود كاملاً بنجاح', 'success');
            }
        });
    }

    const viewerEditBtn = document.getElementById('viewerEditBtn');
    if (viewerEditBtn) {
        viewerEditBtn.addEventListener('click', () => {
            const id = viewerEditBtn.dataset.id;
            const snippet = storage.getSnippet(id);
            ui.closeViewerModal();
            if (snippet) {
                state.isFormDirty = false;
                ui.openEditModal(snippet);
            }
        });
    }

    const closeShortcutsBtn = document.getElementById('closeShortcutsBtn');
    const shortcutsBackdrop = document.getElementById('shortcutsBackdrop');
    if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', ui.closeShortcutsModal);
    if (shortcutsBackdrop) shortcutsBackdrop.addEventListener('click', ui.closeShortcutsModal);
}

function handleFormSubmit(e) {
    e.preventDefault();

    const idInput = document.getElementById('snippetId').value;
    const title = document.getElementById('snippetTitle').value.trim();
    const language = document.getElementById('snippetLanguage').value;
    const code = document.getElementById('snippetCode').value.trim();
    const description = document.getElementById('snippetDescription').value.trim();
    const tagsRaw = document.getElementById('snippetTags').value;

    const isEdit = Boolean(idInput);
    const existingSnippet = isEdit ? storage.getSnippet(idInput) : null;

    const payload = {
        id: idInput || utils.generateId(),
        title,
        language,
        code,
        description,
        tags: utils.parseTags(tagsRaw),
        isFavorite: existingSnippet ? existingSnippet.isFavorite : false
    };

    const result = storage.saveSnippet(payload);

    if (result.success) {
        state.isFormDirty = false;
        ui.closeEditModal();
        refreshView();
        ui.showToast(
            isEdit ? '✅ تم تحديث الكود البرمجي بنجاح' : '🎉 تم حفظ الكود البرمجي الجديد بنجاح',
            'success'
        );
    } else {
        const errorMsg = (result.errors && result.errors.length)
            ? result.errors.join(' ')
            : 'حدث خطأ أثناء حفظ الكود.';
        ui.showToast(`❌ ${errorMsg}`, 'error');
    }
}

function setupImportExportListeners() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const snippets = storage.getAllSnippets();
            if (snippets.length === 0) {
                ui.showToast('ℹ️ لا توجد أكواد لتصديرها حالياً', 'info');
                return;
            }

            const jsonString = storage.exportSnippets();
            const dateStr = new Date().toISOString().slice(0, 10);
            const filename = `code-snippets-backup-${dateStr}.json`;

            utils.downloadJsonFile(jsonString, filename);
            ui.showToast(`⬇️ تم تصدير ${snippets.length} كود بنجاح`, 'success');
        });
    }

    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');
    if (importBtn && importFileInput) {
        importBtn.addEventListener('click', () => {
            importFileInput.value = '';
            importFileInput.click();
        });

        importFileInput.addEventListener('change', handleImportFileSelect);
    }

    const confirmImportBtn = document.getElementById('confirmImportBtn');
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', executeImport);
    }

    const cancelImportBtn = document.getElementById('cancelImportBtn');
    const closeImportModalBtn = document.getElementById('closeImportModalBtn');
    const importBackdrop = document.getElementById('importBackdrop');

    if (cancelImportBtn) cancelImportBtn.addEventListener('click', ui.closeImportModal);
    if (closeImportModalBtn) closeImportModalBtn.addEventListener('click', ui.closeImportModal);
    if (importBackdrop) importBackdrop.addEventListener('click', ui.closeImportModal);

    const restoreBackupBtn = document.getElementById('restoreBackupBtn');
    if (restoreBackupBtn) {
        restoreBackupBtn.addEventListener('click', () => {
            const backupInfo = storage.getBackupInfo();
            if (!backupInfo.exists) {
                ui.showToast('ℹ️ لا توجد نسخة احتياطية محفوظة للاستعادة', 'info');
                return;
            }

            const formattedDate = utils.formatDate(backupInfo.createdAt);
            const confirmed = ui.confirmDialog(
                `هل ترغب باستعادة النسخة الاحتياطية المحفوظة (${formattedDate}) وتحتوي على ${backupInfo.count} كود؟`
            );

            if (confirmed) {
                const restored = storage.restoreBackup();
                if (restored) {
                    refreshView();
                    ui.showToast('✅ تمت استعادة النسخة الاحتياطية بنجاح', 'success');
                } else {
                    ui.showToast('❌ فشلت عملية الاستعادة', 'error');
                }
            }
        });
    }
}

function handleImportFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const fileContent = event.target?.result;
        if (typeof fileContent !== 'string') return;

        const validation = storage.validateImportData(fileContent);
        state.pendingImport = {
            rawContent: fileContent,
            validation
        };

        ui.openImportModal(validation);
    };

    reader.onerror = () => {
        ui.showToast('❌ تعذر قراءة الملف المحدد.', 'error');
    };

    reader.readAsText(file, 'utf-8');
}

function executeImport() {
    if (!state.pendingImport || !state.pendingImport.rawContent) return;

    const modeInput = document.querySelector('input[name="importMode"]:checked');
    const mode = (modeInput?.value === 'replace') ? 'replace' : 'merge';

    const result = storage.importSnippets(state.pendingImport.rawContent, { mode });

    if (result.success) {
        ui.closeImportModal();
        state.pendingImport = null;
        refreshView();

        const msg = mode === 'replace'
            ? `✅ تم استبدال الأكواد بنجاح (${result.added} كود). تم حفظ نسخة احتياطية تلقائياً.`
            : `✅ اكتمل الدمج بنجاح: تم إضافة ${result.added} وتحديث ${result.updated} كود.`;

        ui.showToast(msg, 'success', 5000);
    } else {
        ui.showToast(`❌ فشل الاستيراد: ${result.error || 'خطأ غير معروف'}`, 'error');
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const isEditingField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

        if (e.key === 'Escape') {
            ui.closeViewerModal();
            ui.closeShortcutsModal();
            ui.closeImportModal();

            const editModal = document.getElementById('snippetModal');
            if (editModal?.classList.contains('active')) {
                if (state.isFormDirty) {
                    const discard = ui.confirmDialog('لديك تعديلات غير محفوظة. هل تريد الخروج بدون حفظ؟');
                    if (discard) {
                        state.isFormDirty = false;
                        ui.closeEditModal();
                    }
                } else {
                    ui.closeEditModal();
                }
            }
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            return;
        }

        if (e.key === '/' && !isEditingField) {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            return;
        }

        if ((e.altKey && e.key.toLowerCase() === 'n') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b')) {
            e.preventDefault();
            state.isFormDirty = false;
            ui.openEditModal(null);
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            ui.openShortcutsModal();
        }
    });
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
