const STORAGE_KEY = 'code_snippets';


export function getAllSnippets() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading snippets:', error);
        return [];
    }
}

/**
 * Get a single snippet by ID
 * @param {string} id - Snippet ID
 * @returns {Object|null} Snippet object or null if not found
 */
export function getSnippet(id) {
    const snippets = getAllSnippets();
    return snippets.find(snippet => snippet.id === id) || null;
}

/**
 * Save a snippet (add new or update existing)
 * @param {Object} snippet - Snippet object
 * @returns {boolean} Success status
 */
export function saveSnippet(snippet) {
    try {
        const snippets = getAllSnippets();
        const existingIndex = snippets.findIndex(s => s.id === snippet.id);
        
        if (existingIndex !== -1) {
            // Update existing snippet
            snippet.updatedAt = new Date().toISOString();
            snippets[existingIndex] = snippet;
        } else {
            snippet.createdAt = new Date().toISOString();
            snippet.updatedAt = new Date().toISOString();
            snippets.unshift(snippet); 
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
        return true;
    } catch (error) {
        console.error('Error saving snippet:', error);
        return false;
    }
}

/**
 * Delete a snippet by ID
 * @param {string} id - Snippet ID
 * @returns {boolean} Success status
 */
export function deleteSnippet(id) {
    try {
        const snippets = getAllSnippets();
        const filtered = snippets.filter(snippet => snippet.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Error deleting snippet:', error);
        return false;
    }
}

/**
 * Get all unique tags from snippets
 * @returns {Array} Array of tag objects with counts
 */
export function getAllTags() {
    const snippets = getAllSnippets();
    const tagMap = {};
    
    snippets.forEach(snippet => {
        if (snippet.tags && Array.isArray(snippet.tags)) {
            snippet.tags.forEach(tag => {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        }
    });
    
    // Convert to array and sort by count (descending)
    return Object.entries(tagMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Search and filter snippets
 * @param {string} query - Search query
 * @param {string} filterTag - Tag to filter by (optional)
 * @returns {Array} Filtered snippets
 */
export function searchSnippets(query = '', filterTag = '') {
    let snippets = getAllSnippets();
    
    // Filter by tag first
    if (filterTag) {
        snippets = snippets.filter(snippet => 
            snippet.tags && snippet.tags.includes(filterTag)
        );
    }
    
    // Then search if query exists
    if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        snippets = snippets.filter(snippet => {
            // Search in title
            if (snippet.title && snippet.title.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // Search in code
            if (snippet.code && snippet.code.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // Search in description
            if (snippet.description && snippet.description.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // Search in tags
            if (snippet.tags && snippet.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                return true;
            }
            
            return false;
        });
    }
    
    return snippets;
}

/**
 * Export all snippets as JSON
 * @returns {string} JSON string
 */
export function exportSnippets() {
    const snippets = getAllSnippets();
    return JSON.stringify(snippets, null, 2);
}

/**
 * Import snippets from JSON
 * @param {string} jsonString - JSON string
 * @returns {boolean} Success status
 */
export function importSnippets(jsonString) {
    try {
        const imported = JSON.parse(jsonString);
        if (Array.isArray(imported)) {
            localStorage.setItem(STORAGE_KEY, jsonString);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error importing snippets:', error);
        return false;
    }
}
