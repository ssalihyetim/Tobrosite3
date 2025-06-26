/**
 * Quote Model
 * Manages quote generation, pricing, line items, and quote lifecycle
 */

class Quote {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.quoteNumber = data.quoteNumber || this.generateQuoteNumber();
        
        // Related Records
        this.rfqId = data.rfqId || null;
        this.customerId = data.customerId || null;
        this.orderId = data.orderId || null; // If quote becomes order
        
        // Quote Details
        this.title = data.title || '';
        this.description = data.description || '';
        this.status = data.status || 'draft'; // draft, sent, viewed, accepted, rejected, expired
        this.version = data.version || 1;
        this.previousVersionId = data.previousVersionId || null;
        
        // Financial Information
        this.subtotal = data.subtotal || 0;
        this.taxRate = data.taxRate || 0;
        this.taxAmount = data.taxAmount || 0;
        this.shippingCost = data.shippingCost || 0;
        this.discount = data.discount || 0;
        this.discountType = data.discountType || 'percentage'; // percentage, fixed
        this.totalAmount = data.totalAmount || 0;
        this.margin = data.margin || 0;
        this.marginPercentage = data.marginPercentage || 0;
        
        // Line Items
        this.lineItems = data.lineItems || [];
        
        // Terms and Conditions
        this.paymentTerms = data.paymentTerms || 'net_30';
        this.deliveryTerms = data.deliveryTerms || '';
        this.validUntil = data.validUntil || this.calculateDefaultExpiry();
        this.leadTime = data.leadTime || '';
        this.warranty = data.warranty || '';
        this.specialTerms = data.specialTerms || '';
        
        // Communication
        this.notes = data.notes || [];
        this.internalNotes = data.internalNotes || [];
        this.revisionHistory = data.revisionHistory || [];
        
        // Tracking
        this.sentAt = data.sentAt || null;
        this.viewedAt = data.viewedAt || null;
        this.acceptedAt = data.acceptedAt || null;
        this.rejectedAt = data.rejectedAt || null;
        this.expiredAt = data.expiredAt || null;
        
        // Metadata
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.createdBy = data.createdBy || 'admin';
        
        // Auto-calculate totals if line items exist
        if (this.lineItems.length > 0) {
            this.calculateTotals();
        }
    }

    /**
     * Generate unique quote ID
     * @returns {string} Unique ID
     */
    generateId() {
        return 'quote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate quote number (user-friendly)
     * @returns {string} Quote number
     */
    generateQuoteNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const time = String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0');
        
        return `Q-${year}${month}${day}-${time}`;
    }

    /**
     * Calculate default expiry date (typically 30 days)
     * @returns {string} ISO date string
     */
    calculateDefaultExpiry() {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        return expiry.toISOString();
    }

    /**
     * Create quote from RFQ
     * @param {RFQ} rfq - RFQ instance
     * @param {Customer} customer - Customer instance
     */
    fromRFQ(rfq, customer) {
        this.rfqId = rfq.id;
        this.customerId = customer.id;
        this.title = `Quote for ${rfq.title || rfq.rfqNumber}`;
        this.description = rfq.description;
        
        // Create line items from RFQ parts
        this.lineItems = rfq.parts.map(part => this.createLineItemFromPart(part));
        
        // Set terms based on customer preferences
        this.paymentTerms = customer.paymentTerms || 'net_30';
        this.leadTime = this.estimateLeadTime(rfq);
        
        // Calculate totals
        this.calculateTotals();
        
        // Add creation note
        this.addInternalNote(`Quote created from RFQ ${rfq.rfqNumber}`, 'System');
    }

    /**
     * Create line item from RFQ part
     * @param {Object} part - Part from RFQ
     * @returns {Object} Line item
     */
    createLineItemFromPart(part) {
        const unitCost = this.estimatePartCost(part);
        const markup = 50; // Default 50% markup
        const unitPrice = unitCost * (1 + markup / 100);
        
        return {
            id: 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            partId: part.id,
            description: part.name || 'CNC Machined Part',
            specifications: part.description || '',
            quantity: part.quantity || 1,
            unitCost: unitCost,
            unitPrice: Math.round(unitPrice * 100) / 100,
            totalPrice: Math.round(unitPrice * part.quantity * 100) / 100,
            material: part.material || '',
            finish: part.finish || '',
            leadTime: this.estimatePartLeadTime(part),
            notes: ''
        };
    }

    /**
     * Estimate part cost based on complexity
     * @param {Object} part - Part data
     * @returns {number} Estimated cost
     */
    estimatePartCost(part) {
        let baseCost = 25; // Base cost per part
        
        // Material multipliers
        const material = (part.material || '').toLowerCase();
        if (material.includes('titanium')) baseCost *= 4;
        else if (material.includes('stainless')) baseCost *= 2;
        else if (material.includes('aluminum')) baseCost *= 1.5;
        else if (material.includes('steel')) baseCost *= 1.3;
        
        // Finish multipliers
        const finish = (part.finish || '').toLowerCase();
        if (finish.includes('anodizing')) baseCost *= 1.3;
        else if (finish.includes('plating')) baseCost *= 1.4;
        else if (finish.includes('powder')) baseCost *= 1.2;
        
        // Quantity discounts
        const qty = part.quantity || 1;
        if (qty >= 100) baseCost *= 0.7;
        else if (qty >= 50) baseCost *= 0.8;
        else if (qty >= 10) baseCost *= 0.9;
        
        return Math.round(baseCost * 100) / 100;
    }

    /**
     * Estimate lead time for RFQ
     * @param {RFQ} rfq - RFQ instance
     * @returns {string} Lead time estimate
     */
    estimateLeadTime(rfq) {
        const partCount = rfq.parts.length;
        const totalQuantity = rfq.totalQuantity;
        
        let weeks = 2; // Base lead time
        
        if (partCount > 10) weeks += 1;
        if (totalQuantity > 100) weeks += 1;
        if (rfq.specialRequirements.length > 100) weeks += 1;
        
        return `${weeks}-${weeks + 1} weeks`;
    }

    /**
     * Estimate lead time for individual part
     * @param {Object} part - Part data
     * @returns {string} Part lead time
     */
    estimatePartLeadTime(part) {
        const qty = part.quantity || 1;
        
        if (qty >= 100) return '3-4 weeks';
        if (qty >= 50) return '2-3 weeks';
        if (qty >= 10) return '1-2 weeks';
        return '1 week';
    }

    /**
     * Add line item to quote
     * @param {Object} lineItem - Line item data
     */
    addLineItem(lineItem) {
        const item = {
            id: lineItem.id || 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            description: lineItem.description || '',
            specifications: lineItem.specifications || '',
            quantity: lineItem.quantity || 1,
            unitCost: lineItem.unitCost || 0,
            unitPrice: lineItem.unitPrice || 0,
            totalPrice: lineItem.unitPrice * lineItem.quantity,
            material: lineItem.material || '',
            finish: lineItem.finish || '',
            leadTime: lineItem.leadTime || '',
            notes: lineItem.notes || ''
        };
        
        this.lineItems.push(item);
        this.calculateTotals();
        this.updatedAt = new Date().toISOString();
        
        this.addInternalNote(`Line item added: ${item.description}`, 'Admin');
    }

    /**
     * Update line item
     * @param {string} lineItemId - Line item ID
     * @param {Object} updates - Updates to apply
     */
    updateLineItem(lineItemId, updates) {
        const index = this.lineItems.findIndex(item => item.id === lineItemId);
        if (index !== -1) {
            const item = this.lineItems[index];
            Object.assign(item, updates);
            
            // Recalculate total price for this item
            item.totalPrice = item.unitPrice * item.quantity;
            
            this.calculateTotals();
            this.updatedAt = new Date().toISOString();
            
            this.addInternalNote(`Line item updated: ${item.description}`, 'Admin');
        }
    }

    /**
     * Remove line item
     * @param {string} lineItemId - Line item ID
     */
    removeLineItem(lineItemId) {
        const index = this.lineItems.findIndex(item => item.id === lineItemId);
        if (index !== -1) {
            const item = this.lineItems[index];
            this.lineItems.splice(index, 1);
            this.calculateTotals();
            this.updatedAt = new Date().toISOString();
            
            this.addInternalNote(`Line item removed: ${item.description}`, 'Admin');
        }
    }

    /**
     * Calculate quote totals
     */
    calculateTotals() {
        // Calculate subtotal
        this.subtotal = this.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
        
        // Calculate discount
        let discountAmount = 0;
        if (this.discount > 0) {
            if (this.discountType === 'percentage') {
                discountAmount = this.subtotal * (this.discount / 100);
            } else {
                discountAmount = this.discount;
            }
        }
        
        // Calculate tax
        const taxableAmount = this.subtotal - discountAmount;
        this.taxAmount = taxableAmount * (this.taxRate / 100);
        
        // Calculate total
        this.totalAmount = taxableAmount + this.taxAmount + this.shippingCost;
        
        // Calculate margin
        const totalCost = this.lineItems.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
        this.margin = this.totalAmount - totalCost - this.shippingCost;
        this.marginPercentage = totalCost > 0 ? (this.margin / totalCost) * 100 : 0;
        
        // Round values
        this.subtotal = Math.round(this.subtotal * 100) / 100;
        this.taxAmount = Math.round(this.taxAmount * 100) / 100;
        this.totalAmount = Math.round(this.totalAmount * 100) / 100;
        this.margin = Math.round(this.margin * 100) / 100;
        this.marginPercentage = Math.round(this.marginPercentage * 100) / 100;
    }

    /**
     * Apply discount to quote
     * @param {number} discount - Discount amount/percentage
     * @param {string} type - 'percentage' or 'fixed'
     * @param {string} reason - Reason for discount
     */
    applyDiscount(discount, type = 'percentage', reason = '') {
        this.discount = discount;
        this.discountType = type;
        this.calculateTotals();
        this.updatedAt = new Date().toISOString();
        
        const discountText = type === 'percentage' ? `${discount}%` : `$${discount}`;
        this.addInternalNote(`Discount applied: ${discountText}. Reason: ${reason}`, 'Admin');
    }

    /**
     * Update quote status
     * @param {string} newStatus - New status
     * @param {string} note - Optional note
     */
    updateStatus(newStatus, note = '') {
        const oldStatus = this.status;
        this.status = newStatus;
        this.updatedAt = new Date().toISOString();
        
        // Set status-specific timestamps
        switch (newStatus) {
            case 'sent':
                this.sentAt = new Date().toISOString();
                break;
            case 'viewed':
                this.viewedAt = new Date().toISOString();
                break;
            case 'accepted':
                this.acceptedAt = new Date().toISOString();
                break;
            case 'rejected':
                this.rejectedAt = new Date().toISOString();
                break;
            case 'expired':
                this.expiredAt = new Date().toISOString();
                break;
        }
        
        this.addInternalNote(
            `Status changed from ${oldStatus} to ${newStatus}${note ? ': ' + note : ''}`, 
            'Admin'
        );
    }

    /**
     * Create new version of quote
     * @param {string} reason - Reason for revision
     * @returns {Quote} New quote version
     */
    createRevision(reason = '') {
        const newQuote = new Quote(this.toJSON());
        newQuote.id = newQuote.generateId();
        newQuote.version = this.version + 1;
        newQuote.previousVersionId = this.id;
        newQuote.status = 'draft';
        newQuote.createdAt = new Date().toISOString();
        newQuote.updatedAt = new Date().toISOString();
        
        // Clear status timestamps
        newQuote.sentAt = null;
        newQuote.viewedAt = null;
        newQuote.acceptedAt = null;
        newQuote.rejectedAt = null;
        
        // Add revision record
        this.revisionHistory.push({
            id: 'revision_' + Date.now(),
            fromVersion: this.version,
            toVersion: newQuote.version,
            reason: reason,
            createdAt: new Date().toISOString(),
            createdBy: 'Admin'
        });
        
        newQuote.addInternalNote(`Quote revision created (v${newQuote.version}): ${reason}`, 'Admin');
        
        return newQuote;
    }

    /**
     * Add note to quote
     * @param {string} content - Note content
     * @param {string} author - Note author
     * @param {boolean} isInternal - Whether note is internal
     */
    addNote(content, author = 'Admin', isInternal = false) {
        const note = {
            id: 'note_' + Date.now(),
            content: content,
            author: author,
            createdAt: new Date().toISOString(),
            isInternal: isInternal
        };
        
        if (isInternal) {
            this.internalNotes.push(note);
        } else {
            this.notes.push(note);
        }
        
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Add internal note to quote
     * @param {string} content - Note content
     * @param {string} author - Note author
     */
    addInternalNote(content, author = 'Admin') {
        this.addNote(content, author, true);
    }

    /**
     * Check if quote is expired
     * @returns {boolean} True if expired
     */
    isExpired() {
        if (!this.validUntil) return false;
        return new Date() > new Date(this.validUntil);
    }

    /**
     * Get days until expiry
     * @returns {number} Days until expiry (negative if expired)
     */
    getDaysUntilExpiry() {
        if (!this.validUntil) return null;
        
        const expiry = new Date(this.validUntil);
        const now = new Date();
        return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }

    /**
     * Get status display info
     * @returns {Object} Status display information
     */
    getStatusInfo() {
        const statusMap = {
            'draft': { label: 'Draft', color: 'secondary', icon: 'fa-edit' },
            'sent': { label: 'Sent', color: 'primary', icon: 'fa-paper-plane' },
            'viewed': { label: 'Viewed', color: 'info', icon: 'fa-eye' },
            'accepted': { label: 'Accepted', color: 'success', icon: 'fa-check' },
            'rejected': { label: 'Rejected', color: 'danger', icon: 'fa-times' },
            'expired': { label: 'Expired', color: 'warning', icon: 'fa-clock' }
        };
        
        return statusMap[this.status] || statusMap['draft'];
    }

    /**
     * Export quote for PDF generation
     * @returns {Object} Quote data for PDF
     */
    exportForPDF() {
        return {
            quoteNumber: this.quoteNumber,
            title: this.title,
            description: this.description,
            version: this.version,
            createdAt: this.createdAt,
            validUntil: this.validUntil,
            lineItems: this.lineItems,
            subtotal: this.subtotal,
            discount: this.discount,
            discountType: this.discountType,
            taxRate: this.taxRate,
            taxAmount: this.taxAmount,
            shippingCost: this.shippingCost,
            totalAmount: this.totalAmount,
            paymentTerms: this.paymentTerms,
            deliveryTerms: this.deliveryTerms,
            leadTime: this.leadTime,
            warranty: this.warranty,
            specialTerms: this.specialTerms,
            notes: this.notes.filter(note => !note.isInternal)
        };
    }

    /**
     * Convert to JSON for storage
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            quoteNumber: this.quoteNumber,
            rfqId: this.rfqId,
            customerId: this.customerId,
            orderId: this.orderId,
            title: this.title,
            description: this.description,
            status: this.status,
            version: this.version,
            previousVersionId: this.previousVersionId,
            subtotal: this.subtotal,
            taxRate: this.taxRate,
            taxAmount: this.taxAmount,
            shippingCost: this.shippingCost,
            discount: this.discount,
            discountType: this.discountType,
            totalAmount: this.totalAmount,
            margin: this.margin,
            marginPercentage: this.marginPercentage,
            lineItems: this.lineItems,
            paymentTerms: this.paymentTerms,
            deliveryTerms: this.deliveryTerms,
            validUntil: this.validUntil,
            leadTime: this.leadTime,
            warranty: this.warranty,
            specialTerms: this.specialTerms,
            notes: this.notes,
            internalNotes: this.internalNotes,
            revisionHistory: this.revisionHistory,
            sentAt: this.sentAt,
            viewedAt: this.viewedAt,
            acceptedAt: this.acceptedAt,
            rejectedAt: this.rejectedAt,
            expiredAt: this.expiredAt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy
        };
    }

    /**
     * Create Quote from JSON data
     * @param {Object} data - JSON data
     * @returns {Quote} Quote instance
     */
    static fromJSON(data) {
        return new Quote(data);
    }
}

// Export for use in other modules
window.Quote = Quote; 