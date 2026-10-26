# Architectural Design & Technical Specification: Code Snippet Manager

## 1. System Overview & Philosophy

**Code Snippet Manager** is a high-performance, client-side web application architected for software engineers, systems administrators, and technical writers to capture, index, search, and retrieve code snippets across 20+ programming languages.

The application follows a **Decoupled Three-Tier Client-Side Architecture**:
1. **Presentation & Interaction Layer (`js/ui.js` & `css/style.css`)**: Handles DOM rendering, semantic markup, visual design tokens, accessibility attributes (ARIA), and modal life cycles.
2. **Application State & Orchestration Layer (`js/app.js`)**: Coordinates user events, enforces single-directional data flow, mediates search/filtering pipelines, and manages keyboard shortcuts.
3. **Data Access & Domain Layer (`js/storage.js` & `js/utils.js`)**: Encapsulates persistence, storage driver abstraction, schema validation, normalization, duplicate resolution, and string sanitization.

```
+---------------------------------------------------------------------------------+
|                                 User Interface                                  |
|   [ Header & Toolbar ]   [ Filter & Sort Controls ]   [ Snippets Grid & Modals ]|
+---------------------------------------------------------------------------------+
                                        │
                                        ▼ Event Delegation
+---------------------------------------------------------------------------------+
|                       Application Controller (`js/app.js`)                      |
|           State Store (query, activeTag, language, favoritesOnly, sort)          |
+---------------------------------------------------------------------------------+
                         │                                       ▲
                         │ Command Query                         │ Render Data
                         ▼                                       │
+------------------------------------+      +-------------------------------------+
|    Data Access (`js/storage.js`)   |      |        UI Pipeline (`js/ui.js`)     |
|  - Schema Validation & Migration   |      |  - Card & Grid Renderers            |
|  - Multi-Criteria Search & Sort    |      |  - Full Code Viewer Modal           |
|  - Deduplication & Auto-Backup     |      |  - Toast Notification System        |
|  - JSON Import / Export Engine     |      |  - Dual Theme (Dark/Light) Switcher |
+------------------------------------+      +-------------------------------------+
        │                      │                                 ▲
        │ IO Operations        │ Utility Calls                   │ Syntax Tokens
        ▼                      ▼                                 │
+------------------+   +------------------------------------+   +-----------------+
| Web Storage API  |   |         Pure Helpers               |   |  Prism.js Core  |
|  (localStorage / |   |       (`js/utils.js`)              |   |  & Autoloader   |
|  Memory Fallback)|   | UUID v4, XSS Escape, Date Relative |   +-----------------+
+------------------+   +------------------------------------+
```

---

## 2. Module Boundaries & Responsibilities

### `js/utils.js` (Pure Utility Tier)
- **Role**: Stateless, deterministic helper functions.
- **Key Responsibilities**:
  - `generateId()`: Generates RFC4122 v4 compliant UUIDs using Web Crypto API (`crypto.randomUUID()`) with bitwise pseudo-random fallback.
  - `escapeHtml()` & `escapeAttribute()`: Hardens input against Cross-Site Scripting (XSS) attacks by mapping `&`, `<`, `>`, `"`, and `'`.
  - `formatDate()`: Localizes ISO timestamps into relative Arabic time (`الآن`, `منذ 5 دقائق`, `منذ ساعتين`) or standard calendar formatting.
  - `debounce()`: Dampens high-frequency keyboard input during live search queries with cancellation hooks.
  - `copyToClipboard()`: Asynchronously writes code to system clipboard via `navigator.clipboard.writeText`, falling back to `document.execCommand('copy')`.
  - `LANGUAGE_REGISTRY`: Single source of truth for language display names, branding colors, and Prism.js syntax mapping.
  - `parseTags()`: Normalizes user-entered tags by trimming whitespace, lowercasing, stripping punctuation, and deduplicating.

### `js/storage.js` (Persistence Tier)
- **Role**: Data access layer and domain validation engine.
- **Key Responsibilities**:
  - **Storage Driver Abstraction**: Checks `localStorage` availability; transparently falls back to an in-memory Map when running in restricted sandboxes (e.g., automated Node.js test runners or private browsing with disabled storage).
  - **Schema Validation & Normalization**: Guarantees all records conform to the schema (`id`, `title`, `language`, `code`, `description`, `tags`, `isFavorite`, `createdAt`, `updatedAt`).
  - **Search & Sort Engine**: Evaluates free-text search queries across titles, code blocks, descriptions, tags, and languages while executing multi-criteria sorting (`updated-desc`, `created-desc`, `title-asc`, etc.).
  - **Import & Export**: Serializes snippets into an export envelope (`{ app, version, exportedAt, count, snippets }`) and provides pre-import validation and preview metrics.
  - **Atomic Backup & Disaster Recovery**: Automatically captures a snapshot before destructive replace operations to prevent permanent data loss.

### `js/ui.js` (Presentation Tier)
- **Role**: View rendering and DOM manipulation.
- **Key Responsibilities**:
  - Translates snippet entities into semantic HTML cards with Prism-highlighted syntax snippets.
  - Manages modal viewports:
    - **Add/Edit Modal**: Form fields with line-length counter and Tab-indentation support.
    - **Full Code Viewer Modal**: Dedicated expanded viewport for complete code review with language badge, metadata, and instant copy button.
    - **Import Preview Modal**: Inspects incoming files, shows duplicate warnings, and allows choosing between Merge and Replace strategies.
    - **Keyboard Shortcuts Reference Modal**: Interactive cheatsheet for keyboard shortcuts.
  - Theme Engine: Toggles `data-theme` attribute between dark and light modes, adjusting CSS custom properties.
  - Toast Engine: Non-blocking notification queue for immediate user feedback.

### `js/app.js` (Controller & Application Lifecycle)
- **Role**: Controller binding state, storage, and UI.
- **Key Responsibilities**:
  - Manages reactive state object (`searchQuery`, `currentTag`, `currentLanguage`, `favoritesOnly`, `sortBy`, `pendingImport`, `isFormDirty`).
  - Implements event delegation on parent containers (`#snippetsGrid`, `#tagsContainer`), eliminating per-element listener memory overhead.
  - Enforces unsaved changes warnings (`isFormDirty`) before discarding drafts in modals.
  - Intercepts global keyboard shortcuts (`Ctrl+K`, `Alt+N`, `Escape`, `Ctrl+/`).

---

## 3. Data Schema & Persistence Guarantees

### Snippet Record Schema (v2.0)
```typescript
interface Snippet {
    id: string;               // UUID v4 format
    title: string;            // Non-empty human-readable label
    language: string;         // Lowercase identifier registered in LANGUAGE_REGISTRY
    code: string;             // Raw snippet content (preserved verbatim)
    description?: string;     // Contextual documentation or notes
    tags: string[];           // Lowercase, deduplicated keyword array
    isFavorite: boolean;      // Star/bookmark indicator
    createdAt: string;        // ISO 8601 UTC timestamp
    updatedAt: string;        // ISO 8601 UTC timestamp
}
```

### Storage Invariants & Guarantees
1. **Creation Timestamp Immutability**: Updating an existing snippet modifies `updatedAt` but strictly preserves the original `createdAt` timestamp.
2. **Defensive Copies**: `getAllSnippets()` returns deep copies of objects to prevent callers from directly mutating internal store state outside `saveSnippet()`.
3. **Recovery Before Replacement**: When importing snippets in `replace` mode, the existing collection is automatically snapshotted into `code_snippets_backup` before overwriting.
4. **Idempotent Merge Operations**: Importing existing IDs in `merge` mode performs an in-place property update rather than inserting duplicate records.

---

## 4. Security Considerations & Boundary Protections

1. **Cross-Site Scripting (XSS) Mitigation**:
   - Snippet code, titles, descriptions, and tags are treated as untrusted input.
   - All text interpolated into template strings passes through `escapeHtml()` or `escapeAttribute()`.
   - Event delegation uses semantic `data-action` and `data-id` properties rather than generating dynamic inline `onclick="func('${id}')"` strings, mitigating script injection vectors.

2. **Untrusted JSON Import Boundary**:
   - `validateImportData()` enforces structural sanity checks prior to persistence.
   - JSON payload must be a valid array or metadata envelope. Each record is verified for required types (`title`, `code`, `language`) and normalized before storage insertion.

3. **Client-Side Data Isolation**:
   - All data resides entirely within the browser's origin-scoped `localStorage`. No telemetry, analytics, or snippet data is transmitted over external networks.

---

## 5. Testing & Quality Assurance Architecture

The test suite uses Node.js's native test runner (`node:test`) and strict assertion module (`node:assert/strict`), ensuring zero third-party dependencies, instant execution, and 100% determinism.

### Test Matrix
- `tests/utils.test.js`:
  - UUID v4 structure and distribution.
  - HTML & attribute character escaping.
  - Relative Arabic date formatting.
  - String truncation boundaries.
  - Tag parsing and case normalization.
  - Debounce execution timing and cancellation hooks.
- `tests/storage.test.js`:
  - Schema validation rules and failure modes.
  - Snippet insertion, retrieval, and updates.
  - Creation timestamp preservation.
  - Deletion of existing and non-existent IDs.
  - Favorite toggling.
  - Multi-field free text search (title, code, description, tags, language).
  - Language, tag, and favorite filtering.
  - Multi-criteria sorting strategies.
  - Tag aggregation and statistics calculation.
  - JSON export envelope structure.
  - JSON import schema validation and error reporting.
  - Merge deduplication and Replace mode with auto-backup.
  - Theme preference persistence.

---

## 6. Performance & Scalability Design

- **DOM Recycling**: Tag buttons and snippet cards are rendered on demand.
- **Debounced Search**: Text search inputs are throttled with a 250ms debounce window to eliminate unnecessary DOM recalculations during rapid typing.
- **Asynchronous Clipboard & Autoloading**: Syntax highlighting for niche languages loads asynchronously on-demand through `prism-autoloader.js`, keeping the initial page footprint minimal.
- **Storage Memory Fallback**: Ensures headless CI/CD pipelines and unit tests execute in under 400ms without browser overhead.
