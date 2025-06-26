/**
 * Customer Model
 * Manages customer information, history, and relationship tracking
 */

class Customer {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        
        // Basic Information
        this.name = data.name || '';
        this.email = data.email || '';
        this.company = data.company || '';
        this.phone = data.phone || '';
        this.title = data.title || '';
        
        // Address Information
        this.address = data.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        };
        
        // Business Information
        this.industry = data.industry || '';
        this.companySize = data.companySize || '';
        this.website = data.website || '';
        this.taxId = data.taxId || '';
        
        // Relationship Tracking
        this.status = data.status || 'active'; // active, inactive, prospect, blacklist
        this.type = data.type || 'prospect'; // prospect, customer, partner
        this.source = data.source || 'unknown'; // web, referral, trade_show, etc.
        this.priority = data.priority || 'normal'; // low, normal, high, vip
        
        // Financial Information
        this.creditLimit = data.creditLimit || 0;
        this.paymentTerms = data.paymentTerms || 'net_30';
        this.discountRate = data.discountRate || 0;
        
        // Communication Preferences
        this.preferredContact = data.preferredContact || 'email'; // email, phone, both
        this.timezone = data.timezone || '';
        this.language = data.language || 'en';
        
        // History and Analytics
        this.rfqs = data.rfqs || []; // Array of RFQ IDs
        this.quotes = data.quotes || []; // Array of Quote IDs
        this.orders = data.orders || []; // Array of Order IDs
        this.totalRFQs = data.totalRFQs || 0;
        this.totalQuotes = data.totalQuotes || 0;
        this.totalOrders = data.totalOrders || 0;
        this.totalValue = data.totalValue || 0;
        this.averageOrderValue = data.averageOrderValue || 0;
        this.winRate = data.winRate || 0;
        
        // Manufacturing Preferences
        this.preferredServices = data.preferredServices || [];
        this.preferredMaterials = data.preferredMaterials || [];
        this.typicalVolumes = data.typicalVolumes || '';
        this.qualityRequirements = data.qualityRequirements || '';
        
        // Notes and Tags
        this.notes = data.notes || [];
        this.tags = data.tags || [];
        
        // Metadata
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.lastContactDate = data.lastContactDate || null;
        this.lastRFQDate = data.lastRFQDate || null;
        this.lastOrderDate = data.lastOrderDate || null;
    }

    /**
     * Generate unique customer ID
     * @returns {string} Unique ID
     */
    generateId() {
        return 'customer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create customer from RFQ data
     * @param {Object} rfqCustomerData - Customer data from RFQ
     */
    fromRFQData(rfqCustomerData) {
        this.name = rfqCustomerData.name || '';
        this.email = rfqCustomerData.email || '';
        this.company = rfqCustomerData.company || '';
        this.phone = rfqCustomerData.phone || '';
        
        // Parse address if provided as string
        if (typeof rfqCustomerData.address === 'string') {
            this.address.street = rfqCustomerData.address;
        } else if (rfqCustomerData.address) {
            this.address = { ...this.address, ...rfqCustomerData.address };
        }
        
        // Set initial status
        this.type = 'prospect';
        this.source = 'web';
        this.lastContactDate = new Date().toISOString();
        
        // Determine initial priority based on company info
        this.determinePriority();
    }

    /**
     * Update customer from new RFQ data
     * @param {Object} rfqCustomerData - New customer data from RFQ
     */
    updateFromRFQ(rfqCustomerData) {
        // Update basic info if more complete
        if (rfqCustomerData.name && rfqCustomerData.name.length > this.name.length) {
            this.name = rfqCustomerData.name;
        }
        if (rfqCustomerData.company && rfqCustomerData.company.length > this.company.length) {
            this.company = rfqCustomerData.company;
        }
        if (rfqCustomerData.phone && !this.phone) {
            this.phone = rfqCustomerData.phone;
        }
        
        this.lastContactDate = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Determine customer priority based on available information
     */
    determinePriority() {
        let score = 0;
        
        // Company size indicators
        if (this.company.toLowerCase().includes('corporation') || 
            this.company.toLowerCase().includes('corp') ||
            this.company.toLowerCase().includes('inc')) {
            score += 2;
        }
        
        // Industry indicators
        const highValueIndustries = ['aerospace', 'automotive', 'medical', 'defense'];
        const industry = this.industry.toLowerCase();
        if (highValueIndustries.some(ind => industry.includes(ind))) {
            score += 3;
        }
        
        // Email domain analysis
        const emailDomain = this.email.split('@')[1];
        if (emailDomain && !emailDomain.includes('gmail') && 
            !emailDomain.includes('yahoo') && !emailDomain.includes('hotmail')) {
            score += 1; // Business email
        }
        
        // Set priority based on score
        if (score >= 4) this.priority = 'vip';
        else if (score >= 2) this.priority = 'high';
        else this.priority = 'normal';
    }

    /**
     * Link RFQ to customer
     * @param {string} rfqId - RFQ ID
     */
    linkRFQ(rfqId) {
        if (!this.rfqs.includes(rfqId)) {
            this.rfqs.push(rfqId);
            this.totalRFQs++;
            this.lastRFQDate = new Date().toISOString();
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Link quote to customer
     * @param {string} quoteId - Quote ID
     * @param {number} value - Quote value
     */
    linkQuote(quoteId, value = 0) {
        if (!this.quotes.includes(quoteId)) {
            this.quotes.push(quoteId);
            this.totalQuotes++;
            this.totalValue += value;
            this.calculateAverageOrderValue();
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Record order (won quote)
     * @param {string} orderId - Order ID
     * @param {number} value - Order value
     */
    recordOrder(orderId, value = 0) {
        if (!this.orders.includes(orderId)) {
            this.orders.push(orderId);
            this.totalOrders++;
            this.totalValue += value;
            this.lastOrderDate = new Date().toISOString();
            this.calculateAverageOrderValue();
            this.calculateWinRate();
            this.updatedAt = new Date().toISOString();
            
            // Upgrade to customer if still prospect
            if (this.type === 'prospect') {
                this.type = 'customer';
            }
        }
    }

    /**
     * Calculate average order value
     */
    calculateAverageOrderValue() {
        if (this.totalOrders > 0) {
            this.averageOrderValue = this.totalValue / this.totalOrders;
        }
    }

    /**
     * Calculate win rate (orders/quotes)
     */
    calculateWinRate() {
        if (this.totalQuotes > 0) {
            this.winRate = (this.totalOrders / this.totalQuotes) * 100;
        }
    }

    /**
     * Add note to customer
     * @param {string} content - Note content
     * @param {string} author - Note author
     * @param {string} type - Note type
     */
    addNote(content, author = 'Admin', type = 'general') {
        const note = {
            id: 'note_' + Date.now(),
            content: content,
            author: author,
            type: type, // general, sales, technical, support
            createdAt: new Date().toISOString(),
            isInternal: true
        };
        
        this.notes.push(note);
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Add tag to customer
     * @param {string} tag - Tag to add
     */
    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Remove tag from customer
     * @param {string} tag - Tag to remove
     */
    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        if (index > -1) {
            this.tags.splice(index, 1);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Update contact information
     * @param {Object} contactInfo - New contact information
     */
    updateContactInfo(contactInfo) {
        if (contactInfo.name) this.name = contactInfo.name;
        if (contactInfo.email) this.email = contactInfo.email;
        if (contactInfo.phone) this.phone = contactInfo.phone;
        if (contactInfo.title) this.title = contactInfo.title;
        if (contactInfo.company) this.company = contactInfo.company;
        
        this.lastContactDate = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Update address
     * @param {Object} addressInfo - New address information
     */
    updateAddress(addressInfo) {
        this.address = { ...this.address, ...addressInfo };
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Set customer status
     * @param {string} status - New status
     * @param {string} reason - Reason for status change
     */
    setStatus(status, reason = '') {
        this.status = status;
        this.updatedAt = new Date().toISOString();
        
        if (reason) {
            this.addNote(`Status changed to ${status}: ${reason}`, 'System', 'status');
        }
    }

    /**
     * Record communication
     * @param {string} type - Communication type (email, phone, meeting)
     * @param {string} direction - in/out
     * @param {string} summary - Communication summary
     */
    recordCommunication(type, direction, summary) {
        this.addNote(`${type} ${direction}: ${summary}`, 'Admin', 'communication');
        this.lastContactDate = new Date().toISOString();
    }

    /**
     * Get customer lifetime value
     * @returns {number} Total value of all orders
     */
    getLifetimeValue() {
        return this.totalValue;
    }

    /**
     * Get days since last contact
     * @returns {number} Days since last contact
     */
    getDaysSinceLastContact() {
        if (!this.lastContactDate) return null;
        
        const lastContact = new Date(this.lastContactDate);
        const now = new Date();
        return Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));
    }

    /**
     * Get customer age in days
     * @returns {number} Days since customer creation
     */
    getCustomerAge() {
        const created = new Date(this.createdAt);
        const now = new Date();
        return Math.floor((now - created) / (1000 * 60 * 60 * 24));
    }

    /**
     * Get status display info
     * @returns {Object} Status display information
     */
    getStatusInfo() {
        const statusMap = {
            'prospect': { label: 'Prospect', color: 'info', icon: 'fa-eye' },
            'customer': { label: 'Customer', color: 'success', icon: 'fa-user-check' },
            'partner': { label: 'Partner', color: 'primary', icon: 'fa-handshake' },
            'inactive': { label: 'Inactive', color: 'secondary', icon: 'fa-user-slash' },
            'blacklist': { label: 'Blacklisted', color: 'danger', icon: 'fa-ban' }
        };
        
        return statusMap[this.status] || statusMap['prospect'];
    }

    /**
     * Get priority display info
     * @returns {Object} Priority display information
     */
    getPriorityInfo() {
        const priorityMap = {
            'low': { label: 'Low', color: 'secondary', icon: 'fa-arrow-down' },
            'normal': { label: 'Normal', color: 'info', icon: 'fa-minus' },
            'high': { label: 'High', color: 'warning', icon: 'fa-arrow-up' },
            'vip': { label: 'VIP', color: 'danger', icon: 'fa-crown' }
        };
        
        return priorityMap[this.priority] || priorityMap['normal'];
    }

    /**
     * Get type display info
     * @returns {Object} Type display information
     */
    getTypeInfo() {
        const typeMap = {
            'prospect': { label: 'Prospect', color: 'info', icon: 'fa-eye' },
            'customer': { label: 'Customer', color: 'success', icon: 'fa-user-check' },
            'partner': { label: 'Partner', color: 'primary', icon: 'fa-handshake' }
        };
        
        return typeMap[this.type] || typeMap['prospect'];
    }

    /**
     * Get customer summary for display
     * @returns {Object} Summary information
     */
    getSummary() {
        return {
            name: this.name,
            company: this.company,
            email: this.email,
            type: this.getTypeInfo(),
            priority: this.getPriorityInfo(),
            totalRFQs: this.totalRFQs,
            totalOrders: this.totalOrders,
            totalValue: this.totalValue,
            winRate: this.winRate,
            daysSinceLastContact: this.getDaysSinceLastContact(),
            customerAge: this.getCustomerAge()
        };
    }

    /**
     * Convert to JSON for storage
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            company: this.company,
            phone: this.phone,
            title: this.title,
            address: this.address,
            industry: this.industry,
            companySize: this.companySize,
            website: this.website,
            taxId: this.taxId,
            status: this.status,
            type: this.type,
            source: this.source,
            priority: this.priority,
            creditLimit: this.creditLimit,
            paymentTerms: this.paymentTerms,
            discountRate: this.discountRate,
            preferredContact: this.preferredContact,
            timezone: this.timezone,
            language: this.language,
            rfqs: this.rfqs,
            quotes: this.quotes,
            orders: this.orders,
            totalRFQs: this.totalRFQs,
            totalQuotes: this.totalQuotes,
            totalOrders: this.totalOrders,
            totalValue: this.totalValue,
            averageOrderValue: this.averageOrderValue,
            winRate: this.winRate,
            preferredServices: this.preferredServices,
            preferredMaterials: this.preferredMaterials,
            typicalVolumes: this.typicalVolumes,
            qualityRequirements: this.qualityRequirements,
            notes: this.notes,
            tags: this.tags,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastContactDate: this.lastContactDate,
            lastRFQDate: this.lastRFQDate,
            lastOrderDate: this.lastOrderDate
        };
    }

    /**
     * Create Customer from JSON data
     * @param {Object} data - JSON data
     * @returns {Customer} Customer instance
     */
    static fromJSON(data) {
        return new Customer(data);
    }
}

// Export for use in other modules
window.Customer = Customer; 