/**
 * Utility functions for formatting various data types in the admin panel
 * Includes currency, date, time, file size, and other display formatters
 */

/**
 * Format currency values
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD') {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Format large currency values with K, M, B suffixes
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string with suffix
 */
function formatCurrencyCompact(amount, currency = 'USD') {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    
    if (amount >= 1000000000) {
        return `${formatCurrency(amount / 1000000000, currency).replace(/[^$\d.-]/g, '')}B`;
    } else if (amount >= 1000000) {
        return `${formatCurrency(amount / 1000000, currency).replace(/[^$\d.-]/g, '')}M`;
    } else if (amount >= 1000) {
        return `${formatCurrency(amount / 1000, currency).replace(/[^$\d.-]/g, '')}K`;
    }
    
    return formatCurrency(amount, currency);
}

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'medium', 'long', 'full')
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'medium') {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const options = {
        short: { month: 'short', day: 'numeric', year: 'numeric' },
        medium: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
        long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
        full: { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit',
            timeZoneName: 'short'
        }
    };
    
    return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
}

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string for input
 */
function formatDateForInput(date) {
    if (!date) return '';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toISOString().split('T')[0];
}

/**
 * Format time ago (relative time)
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
function formatTimeAgo(date) {
    if (!date) return 'Unknown';
    
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now - dateObj;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears}y ago`;
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format phone number
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Format US phone numbers
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    // Return original if not standard US format
    return phoneNumber;
}

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
function formatPercentage(value, decimals = 1) {
    if (typeof value !== 'number') {
        value = parseFloat(value) || 0;
    }
    
    return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with thousand separators
 * @param {number} number - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
function formatNumber(number, decimals = 0) {
    if (typeof number !== 'number') {
        number = parseFloat(number) || 0;
    }
    
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

/**
 * Format duration in minutes to human readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
function formatDuration(minutes) {
    if (!minutes || minutes < 1) return '< 1 min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
        return `${mins} min`;
    } else if (mins === 0) {
        return `${hours} hr`;
    } else {
        return `${hours}h ${mins}m`;
    }
}

/**
 * Format lead time string
 * @param {string} leadTime - Lead time string
 * @returns {string} Formatted lead time
 */
function formatLeadTime(leadTime) {
    if (!leadTime) return 'TBD';
    
    // If it's already a formatted string, return as is
    if (typeof leadTime === 'string' && leadTime.includes('-')) {
        return leadTime;
    }
    
    // Convert days to weeks if appropriate
    const days = parseInt(leadTime);
    if (isNaN(days)) return leadTime;
    
    if (days >= 14) {
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        if (remainingDays === 0) {
            return `${weeks} week${weeks > 1 ? 's' : ''}`;
        } else {
            return `${weeks}w ${remainingDays}d`;
        }
    }
    
    return `${days} day${days > 1 ? 's' : ''}`;
}

/**
 * Format status badge HTML
 * @param {string} status - Status value
 * @param {Object} statusInfo - Status display info
 * @returns {string} HTML string for status badge
 */
function formatStatusBadge(status, statusInfo) {
    return `<span class="status-badge ${status}" title="${statusInfo.label}">
        <i class="fas ${statusInfo.icon}"></i>
        ${statusInfo.label}
    </span>`;
}

/**
 * Format priority badge HTML
 * @param {string} priority - Priority value
 * @param {Object} priorityInfo - Priority display info
 * @returns {string} HTML string for priority badge
 */
function formatPriorityBadge(priority, priorityInfo) {
    return `<span class="priority-badge ${priority}" title="${priorityInfo.label}">
        <i class="fas ${priorityInfo.icon}"></i>
        ${priorityInfo.label}
    </span>`;
}

/**
 * Format customer name with company
 * @param {Object} customer - Customer object
 * @returns {string} Formatted customer name
 */
function formatCustomerName(customer) {
    if (!customer) return 'Unknown Customer';
    
    const name = customer.name || 'Unknown';
    const company = customer.company;
    
    if (company && company !== name) {
        return `${name} (${company})`;
    }
    
    return name;
}

/**
 * Format address to single line
 * @param {Object} address - Address object
 * @returns {string} Formatted address string
 */
function formatAddress(address) {
    if (!address) return '';
    
    const parts = [
        address.street,
        address.city,
        address.state,
        address.zipCode
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
}

/**
 * Format materials list
 * @param {Array} materials - Array of materials
 * @returns {string} Formatted materials string
 */
function formatMaterialsList(materials) {
    if (!materials || materials.length === 0) return 'Not specified';
    
    if (materials.length === 1) return materials[0];
    if (materials.length <= 3) return materials.join(', ');
    
    return `${materials.slice(0, 2).join(', ')}, +${materials.length - 2} more`;
}

/**
 * Format services list
 * @param {Array} services - Array of services
 * @returns {string} Formatted services string
 */
function formatServicesList(services) {
    if (!services || services.length === 0) return 'Standard machining';
    
    // Convert service codes to readable names
    const serviceNames = services.map(service => {
        const nameMap = {
            'cnc-milling': 'CNC Milling',
            'cnc-turning': 'CNC Turning',
            '5-axis-machining': '5-Axis Machining',
            'wire-edm': 'Wire EDM',
            'anodizing': 'Anodizing',
            'plating': 'Plating',
            'powder-coating': 'Powder Coating',
            'passivation': 'Passivation'
        };
        return nameMap[service] || service;
    });
    
    if (serviceNames.length === 1) return serviceNames[0];
    if (serviceNames.length <= 3) return serviceNames.join(', ');
    
    return `${serviceNames.slice(0, 2).join(', ')}, +${serviceNames.length - 2} more`;
}

/**
 * Format RFQ title with fallback
 * @param {Object} rfq - RFQ object
 * @returns {string} Formatted RFQ title
 */
function formatRFQTitle(rfq) {
    if (!rfq) return 'Unknown RFQ';
    
    if (rfq.title && rfq.title.trim()) {
        return rfq.title;
    }
    
    if (rfq.description && rfq.description.trim()) {
        const desc = rfq.description.trim();
        return desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
    }
    
    return `RFQ ${rfq.rfqNumber || 'Unknown'}`;
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength).trim() + '...';
}

/**
 * Format boolean as Yes/No
 * @param {boolean} value - Boolean value
 * @returns {string} Yes or No string
 */
function formatBoolean(value) {
    return value ? 'Yes' : 'No';
}

/**
 * Format array as comma-separated list with limit
 * @param {Array} array - Array to format
 * @param {number} limit - Maximum items to show
 * @returns {string} Formatted array string
 */
function formatArray(array, limit = 3) {
    if (!array || array.length === 0) return '';
    
    if (array.length <= limit) {
        return array.join(', ');
    }
    
    return `${array.slice(0, limit).join(', ')}, +${array.length - limit} more`;
}

/**
 * Format validation errors
 * @param {Object} errors - Validation errors object
 * @returns {string} Formatted error message
 */
function formatValidationErrors(errors) {
    if (!errors || Object.keys(errors).length === 0) return '';
    
    const errorMessages = Object.entries(errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join('; ');
    
    return errorMessages;
}

/**
 * Format search highlight
 * @param {string} text - Text to highlight
 * @param {string} searchTerm - Search term to highlight
 * @returns {string} HTML string with highlighted search term
 */
function formatSearchHighlight(text, searchTerm) {
    if (!text || !searchTerm) return text || '';
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Export functions for use in other modules
window.formatters = {
    formatCurrency,
    formatCurrencyCompact,
    formatDate,
    formatDateForInput,
    formatTimeAgo,
    formatFileSize,
    formatPhoneNumber,
    formatPercentage,
    formatNumber,
    formatDuration,
    formatLeadTime,
    formatStatusBadge,
    formatPriorityBadge,
    formatCustomerName,
    formatAddress,
    formatMaterialsList,
    formatServicesList,
    formatRFQTitle,
    truncateText,
    formatBoolean,
    formatArray,
    formatValidationErrors,
    formatSearchHighlight
};

// Also expose individual functions globally for convenience
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatTimeAgo = formatTimeAgo;
window.formatFileSize = formatFileSize;
window.formatNumber = formatNumber; 