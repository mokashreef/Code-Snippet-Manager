/**
 * Generate a unique ID (UUID v4)
 * @returns {string} Unique ID
 */
export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Format timestamp to human-readable date
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted date
 */
export function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'الآن';
    }
    
    if (diffMins < 60) {
        return `منذ ${diffMins} ${diffMins === 1 ? 'دقيقة' : diffMins === 2 ? 'دقيقتين' : 'دقائق'}`;
    }
    
    if (diffHours < 24) {
        return `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : diffHours === 2 ? 'ساعتين' : 'ساعات'}`;
    }
    
    if (diffDays < 7) {
        return `منذ ${diffDays} ${diffDays === 1 ? 'يوم' : diffDays === 2 ? 'يومين' : 'أيام'}`;
    }
    
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay = 300) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const success = document.execCommand('copy');
        textArea.remove();
        return success;
    } catch (error) {
        console.error('Copy failed:', error);
        return false;
    }
}

/**
 * Get language display name
 * @param {string} lang - Language code
 * @returns {string} Display name
 */
export function getLanguageName(lang) {
    const languages = {
        javascript: 'JavaScript',
        python: 'Python',
        php: 'PHP',
        html: 'HTML',
        css: 'CSS',
        sql: 'SQL',
        java: 'Java',
        cpp: 'C++',
        csharp: 'C#',
        typescript: 'TypeScript',
        json: 'JSON',
        markdown: 'Markdown',
        bash: 'Bash',
        ruby: 'Ruby',
        go: 'Go'
    };
    
    return languages[lang] || lang;
}

/**
 * Get language icon/color
 * @param {string} lang - Language code
 * @returns {string} Color hex code
 */
export function getLanguageColor(lang) {
    const colors = {
        javascript: '#f7df1e',
        python: '#3776ab',
        php: '#777bb4',
        html: '#e34c26',
        css: '#1572b6',
        sql: '#cc2927',
        java: '#007396',
        cpp: '#00599c',
        csharp: '#239120',
        typescript: '#3178c6',
        json: '#000000',
        markdown: '#083fa1',
        bash: '#4eaa25',
        ruby: '#cc342d',
        go: '#00add8'
    };
    
    return colors[lang] || '#6c757d';
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Parse tags from comma-separated string
 * @param {string} tagsString - Comma-separated tags
 * @returns {Array} Array of trimmed tags
 */
export function parseTags(tagsString) {
    if (!tagsString || !tagsString.trim()) return [];
    
    return tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates
}

/**
 * Get contrast color (black or white) for a background color
 * @param {string} hexColor - Hex color code
 * @returns {string} 'black' or 'white'
 */
export function getContrastColor(hexColor) {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? 'black' : 'white';
}
