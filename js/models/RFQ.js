/**
 * RFQ (Request for Quote) Model
 * Comprehensive data model for managing RFQ lifecycle from submission to completion
 */

class RFQ {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.rfqNumber = data.rfqNumber || this.generateRFQNumber();
        
        // Customer Information
        this.customerId = data.customerId || null;
        this.customerInfo = data.customerInfo || {
            name: '',
            email: '',
            company: '',
            phone: '',
            address: ''
        };
        
        // RFQ Details
        this.title = data.title || '';
        this.description = data.description || '';
        this.requirements = data.requirements || '';
        
        // Status and Priority
        this.status = data.status || 'new'; // new, reviewing, quoted, won, lost
        this.priority = data.priority || 'normal'; // low, normal, high, urgent
        
        // Timing
        this.requestedDelivery = data.requestedDelivery || null;
        this.quoteDueDate = data.quoteDueDate || null;
        
        // Parts and Files
        this.parts = data.parts || [];
        this.files = data.files || [];
        this.totalParts = data.totalParts || 0;
        this.totalQuantity = data.totalQuantity || 0;
        
        // Manufacturing Details
        this.services = data.services || [];
        this.materials = data.materials || [];
        this.surfaceFinishes = data.surfaceFinishes || [];
        this.tolerances = data.tolerances || '';
        this.specialRequirements = data.specialRequirements || '';
        
        // Business Information
        this.estimatedValue = data.estimatedValue || 0;
        this.actualValue = data.actualValue || 0;
        this.margin = data.margin || 0;
        
        // Tracking
        this.source = data.source || 'web_form'; // web_form, email, phone, referral
        this.assignedTo = data.assignedTo || 'unassigned';
        this.tags = data.tags || [];
        this.notes = data.notes || [];
        
        // Timeline and History
        this.timeline = data.timeline || [];
        this.quotes = data.quotes || []; // Array of quote IDs
        
        // Metadata
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.submittedAt = data.submittedAt || null;
        this.reviewedAt = data.reviewedAt || null;
        this.quotedAt = data.quotedAt || null;
        this.closedAt = data.closedAt || null;
        
        // Email integration data
        this.emailData = data.emailData || null;
        
        // Initialize timeline if empty
        if (this.timeline.length === 0) {
            this.addTimelineEntry('RFQ created', 'System');
        }
    }

    /**
     * Generate unique RFQ ID
     * @returns {string} Unique ID
     */
    generateId() {
        return 'rfq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate RFQ number (user-friendly)
     * @returns {string} RFQ number
     */
    generateRFQNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const time = String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0');
        
        return `RFQ-${year}${month}${day}-${time}`;
    }

    /**
     * Import data from email submission
     * @param {Object} importData - Data from email attachment
     */
    fromImportData(importData) {
        try {
            // Handle different import data formats
            let rfqData = importData;
            if (importData.rfq) {
                // New format from RFQ submission system
                rfqData = importData.rfq;
            }
            
            // Basic info
            this.title = rfqData.project?.name || importData.title || importData.projectName || 'Imported RFQ';
            this.description = rfqData.project?.description || importData.description || importData.projectDescription || '';
            this.requirements = importData.requirements || importData.additionalRequirements || '';
            
            // Use RFQ number from submission if available
            if (rfqData.number) {
                this.rfqNumber = rfqData.number;
            }
            
            // Use RFQ ID from submission if available
            if (rfqData.id) {
                this.id = rfqData.id;
            }
            
            // Customer info - handle both formats
            let customerData = null;
            if (importData.customerInfo) {
                // Legacy format
                customerData = importData.customerInfo;
            } else if (rfqData.customer) {
                // New format from RFQ submission system
                customerData = rfqData.customer;
            }
            
            if (customerData) {
                this.customerInfo = {
                    name: customerData.name || '',
                    email: customerData.email || '',
                    company: customerData.company || '',
                    phone: customerData.phone || '',
                    address: customerData.address || rfqData.shipping?.address || ''
                };
            }
            
            // Timing
            this.requestedDelivery = importData.requestedDelivery || null;
            this.quoteDueDate = importData.quoteDueDate || this.calculateDefaultDueDate();
            
            // Parts - handle both formats
            if (importData.parts && Array.isArray(importData.parts)) {
                this.parts = importData.parts.map(part => ({
                    id: part.id || this.generatePartId(),
                    name: part.name || part.partName || 'Unnamed Part',
                    quantity: parseInt(part.specifications?.quantity || part.quantity) || 1,
                    material: part.specifications?.material || part.material || '',
                    finish: part.specifications?.surfaceFinish || part.finish || '',
                    description: part.description || '',
                    specifications: part.specifications || {},
                    fileIds: part.fileIds || [],
                    estimatedValue: part.estimatedValue || 0,
                    status: part.status || 'new'
                }));
                
                this.totalParts = this.parts.length;
                this.totalQuantity = this.parts.reduce((sum, part) => sum + part.quantity, 0);
                this.estimatedValue = this.parts.reduce((sum, part) => sum + (part.estimatedValue || 0), 0);
            }
            
            // Files - handle both formats
            if (importData.files && Array.isArray(importData.files)) {
                this.files = importData.files.map(file => ({
                    id: file.id || this.generateFileId(),
                    name: file.name || 'Unknown File',
                    type: file.type || 'application/octet-stream',
                    size: file.size || 0,
                    data: file.data || null, // Base64 data
                    uploadedAt: new Date().toISOString(),
                    partIds: file.partIds || [file.partId].filter(Boolean) || []
                }));
            }
            
            // Manufacturing details
            this.services = importData.services || [];
            this.materials = importData.materials || [];
            this.surfaceFinishes = importData.surfaceFinishes || [];
            this.tolerances = importData.tolerances || '';
            this.specialRequirements = importData.specialRequirements || '';
            
            // Set submission timestamp
            this.submittedAt = rfqData.submittedAt || importData.submittedAt || new Date().toISOString();
            
            // Set created timestamp if available
            if (rfqData.created) {
                this.createdAt = rfqData.created;
            }
            
            // Store original email data
            this.emailData = {
                originalData: importData,
                importedAt: new Date().toISOString(),
                emailId: importData.emailId || null
            };
            
            // Add timeline entry
            this.addTimelineEntry('RFQ imported from email', 'System');
            
            // Set initial priority based on content
            this.calculateInitialPriority();
            
            console.log(`RFQ imported: ${this.rfqNumber}`);
            
        } catch (error) {
            console.error('Error importing RFQ data:', error);
            throw new Error('Failed to import RFQ data');
        }
    }

    /**
     * Calculate default quote due date (typically 48-72 hours)
     * @returns {string} ISO date string
     */
    calculateDefaultDueDate() {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3); // 3 days default
        return dueDate.toISOString();
    }

    /**
     * Calculate initial priority based on content analysis
     */
    calculateInitialPriority() {
        let score = 0;
        
        // Large quantity or high value
        if (this.totalQuantity > 100) score += 1;
        if (this.parts.length > 10) score += 1;
        
        // Rush delivery
        if (this.requestedDelivery) {
            const deliveryDate = new Date(this.requestedDelivery);
            const daysUntilDelivery = (deliveryDate - new Date()) / (1000 * 60 * 60 * 24);
            if (daysUntilDelivery < 14) score += 2; // Less than 2 weeks
            if (daysUntilDelivery < 7) score += 2; // Less than 1 week
        }
        
        // Complex requirements
        if (this.specialRequirements.length > 100) score += 1;
        if (this.tolerances.includes('±0.001') || this.tolerances.includes('±0.0001')) score += 1;
        
        // Multiple services
        if (this.services.length > 2) score += 1;
        
        // Set priority based on score
        if (score >= 5) this.priority = 'urgent';
        else if (score >= 3) this.priority = 'high';
        else if (score >= 1) this.priority = 'normal';
        else this.priority = 'low';
    }

    /**
     * Generate unique part ID
     * @returns {string} Part ID
     */
    generatePartId() {
        return 'part_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    /**
     * Generate unique file ID
     * @returns {string} File ID
     */
    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    /**
     * Add entry to timeline
     * @param {string} action - Action description
     * @param {string} user - User who performed action
     * @param {string} note - Optional note
     */
    addTimelineEntry(action, user = 'System', note = '') {
        this.timeline.push({
            id: 'timeline_' + Date.now(),
            date: new Date().toISOString(),
            action: action,
            user: user,
            note: note
        });
        
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Add note to RFQ
     * @param {string} content - Note content
     * @param {string} author - Note author
     * @param {string} type - Note type (general, technical, business)
     */
    addNote(content, author = 'Admin', type = 'general') {
        const note = {
            id: 'note_' + Date.now(),
            content: content,
            author: author,
            type: type,
            createdAt: new Date().toISOString(),
            isInternal: true
        };
        
        this.notes.push(note);
        this.addTimelineEntry(`Note added: ${type}`, author);
    }

    /**
     * Update RFQ status
     * @param {string} newStatus - New status
     * @param {string} note - Optional note
     * @param {string} user - User making change
     */
    updateStatus(newStatus, note = '', user = 'Admin') {
        const oldStatus = this.status;
        this.status = newStatus;
        this.updatedAt = new Date().toISOString();
        
        // Set status-specific timestamps
        switch (newStatus) {
            case 'reviewing':
                this.reviewedAt = new Date().toISOString();
                break;
            case 'quoted':
                this.quotedAt = new Date().toISOString();
                break;
            case 'won':
            case 'lost':
                this.closedAt = new Date().toISOString();
                break;
        }
        
        this.addTimelineEntry(
            `Status changed from ${oldStatus} to ${newStatus}`, 
            user, 
            note
        );
    }

    /**
     * Assign RFQ to user
     * @param {string} userId - User ID
     * @param {string} assignedBy - Who assigned it
     */
    assignTo(userId, assignedBy = 'Admin') {
        const oldAssignee = this.assignedTo;
        this.assignedTo = userId;
        this.updatedAt = new Date().toISOString();
        
        this.addTimelineEntry(
            `Assigned from ${oldAssignee} to ${userId}`,
            assignedBy
        );
    }

    /**
     * Add tag to RFQ
     * @param {string} tag - Tag to add
     */
    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Remove tag from RFQ
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
     * Link quote to RFQ
     * @param {string} quoteId - Quote ID
     */
    linkQuote(quoteId) {
        if (!this.quotes.includes(quoteId)) {
            this.quotes.push(quoteId);
            this.addTimelineEntry(`Quote ${quoteId} linked`, 'System');
        }
    }

    /**
     * Calculate estimated value based on parts and complexity
     * @returns {number} Estimated value
     */
    calculateEstimatedValue() {
        let estimate = 0;
        
        // Base calculation per part
        this.parts.forEach(part => {
            let partEstimate = 50; // Base cost per part
            
            // Adjust for quantity
            partEstimate *= part.quantity;
            
            // Material multipliers
            if (part.material.toLowerCase().includes('titanium')) partEstimate *= 3;
            else if (part.material.toLowerCase().includes('stainless')) partEstimate *= 1.5;
            else if (part.material.toLowerCase().includes('aluminum')) partEstimate *= 1.2;
            
            // Finish multipliers
            if (part.finish.toLowerCase().includes('anodizing')) partEstimate *= 1.3;
            else if (part.finish.toLowerCase().includes('plating')) partEstimate *= 1.4;
            
            estimate += partEstimate;
        });
        
        // Service multipliers
        this.services.forEach(service => {
            if (service.includes('5-axis')) estimate *= 1.5;
            if (service.includes('turning')) estimate *= 1.2;
        });
        
        // Complexity multiplier
        if (this.specialRequirements.length > 50) estimate *= 1.3;
        if (this.tolerances.includes('±0.001')) estimate *= 1.4;
        
        this.estimatedValue = Math.round(estimate);
        return this.estimatedValue;
    }

    /**
     * Get RFQ age in days
     * @returns {number} Days since creation
     */
    getAgeInDays() {
        const created = new Date(this.createdAt);
        const now = new Date();
        return Math.floor((now - created) / (1000 * 60 * 60 * 24));
    }

    /**
     * Get days until quote due
     * @returns {number} Days until due (negative if overdue)
     */
    getDaysUntilDue() {
        if (!this.quoteDueDate) return null;
        
        const due = new Date(this.quoteDueDate);
        const now = new Date();
        return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    }

    /**
     * Check if RFQ is overdue
     * @returns {boolean} True if overdue
     */
    isOverdue() {
        const daysUntilDue = this.getDaysUntilDue();
        return daysUntilDue !== null && daysUntilDue < 0;
    }

    /**
     * Get status display info
     * @returns {Object} Status display information
     */
    getStatusInfo() {
        const statusMap = {
            'new': { label: 'New', color: 'info', icon: 'fa-plus' },
            'reviewing': { label: 'Reviewing', color: 'warning', icon: 'fa-eye' },
            'quoted': { label: 'Quoted', color: 'primary', icon: 'fa-calculator' },
            'won': { label: 'Won', color: 'success', icon: 'fa-trophy' },
            'lost': { label: 'Lost', color: 'danger', icon: 'fa-times' }
        };
        
        return statusMap[this.status] || statusMap['new'];
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
            'urgent': { label: 'Urgent', color: 'danger', icon: 'fa-exclamation' }
        };
        
        return priorityMap[this.priority] || priorityMap['normal'];
    }

    /**
     * Convert to JSON for storage
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            rfqNumber: this.rfqNumber,
            customerId: this.customerId,
            customerInfo: this.customerInfo,
            title: this.title,
            description: this.description,
            requirements: this.requirements,
            status: this.status,
            priority: this.priority,
            requestedDelivery: this.requestedDelivery,
            quoteDueDate: this.quoteDueDate,
            parts: this.parts,
            files: this.files,
            totalParts: this.totalParts,
            totalQuantity: this.totalQuantity,
            services: this.services,
            materials: this.materials,
            surfaceFinishes: this.surfaceFinishes,
            tolerances: this.tolerances,
            specialRequirements: this.specialRequirements,
            estimatedValue: this.estimatedValue,
            actualValue: this.actualValue,
            margin: this.margin,
            source: this.source,
            assignedTo: this.assignedTo,
            tags: this.tags,
            notes: this.notes,
            timeline: this.timeline,
            quotes: this.quotes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            submittedAt: this.submittedAt,
            reviewedAt: this.reviewedAt,
            quotedAt: this.quotedAt,
            closedAt: this.closedAt,
            emailData: this.emailData
        };
    }

    /**
     * Create RFQ from JSON data
     * @param {Object} data - JSON data
     * @returns {RFQ} RFQ instance
     */
    static fromJSON(data) {
        return new RFQ(data);
    }
}

// Export for use in other modules
window.RFQ = RFQ; 