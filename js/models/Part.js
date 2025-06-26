/**
 * Part Model
 * Manages individual parts within RFQs, including specifications, files, and cost tracking
 */

class Part {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        
        // Basic Information
        this.name = data.name || '';
        this.partNumber = data.partNumber || '';
        this.description = data.description || '';
        this.quantity = data.quantity || 1;
        
        // Manufacturing Information
        this.material = data.material || '';
        this.finish = data.finish || '';
        this.specifications = data.specifications || {};
        this.tolerances = data.tolerances || '';
        this.dimensions = data.dimensions || {};
        
        // Files and Documentation
        this.files = data.files || []; // Array of file objects
        this.drawings = data.drawings || []; // Technical drawings
        this.models = data.models || []; // 3D models
        this.images = data.images || []; // Reference images
        
        // Manufacturing Details
        this.services = data.services || []; // Required services (milling, turning, etc.)
        this.operations = data.operations || []; // Manufacturing operations
        this.complexity = data.complexity || 'medium'; // low, medium, high, extreme
        this.setupTime = data.setupTime || 0; // Setup time in minutes
        this.machiningTime = data.machiningTime || 0; // Machining time in minutes
        
        // Cost Information
        this.materialCost = data.materialCost || 0;
        this.laborCost = data.laborCost || 0;
        this.toolingCost = data.toolingCost || 0;
        this.finishingCost = data.finishingCost || 0;
        this.totalCost = data.totalCost || 0;
        this.unitCost = data.unitCost || 0;
        
        // Quality and Requirements
        this.qualityLevel = data.qualityLevel || 'standard'; // standard, precision, aerospace
        this.inspectionRequirements = data.inspectionRequirements || [];
        this.certificationRequired = data.certificationRequired || false;
        this.specialRequirements = data.specialRequirements || '';
        
        // Lead Time and Delivery
        this.estimatedLeadTime = data.estimatedLeadTime || '';
        this.priority = data.priority || 'normal';
        this.deliveryDate = data.deliveryDate || null;
        
        // Status and Tracking
        this.status = data.status || 'pending'; // pending, quoted, approved, in_production, completed
        this.rfqId = data.rfqId || null;
        this.quoteIds = data.quoteIds || []; // Can be quoted multiple times
        
        // Notes and History
        this.notes = data.notes || [];
        this.revisions = data.revisions || [];
        
        // Metadata
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        
        // Calculate derived values
        this.calculateComplexity();
        this.calculateTotalCost();
    }

    /**
     * Generate unique part ID
     * @returns {string} Unique ID
     */
    generateId() {
        return 'part_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create part from RFQ part data
     * @param {Object} rfqPartData - Part data from RFQ
     * @param {string} rfqId - Parent RFQ ID
     */
    fromRFQData(rfqPartData, rfqId) {
        this.name = rfqPartData.name || rfqPartData.partName || '';
        this.description = rfqPartData.description || '';
        this.quantity = parseInt(rfqPartData.quantity) || 1;
        this.material = rfqPartData.material || '';
        this.finish = rfqPartData.finish || rfqPartData.surfaceFinish || '';
        this.specifications = rfqPartData.specifications || {};
        this.tolerances = rfqPartData.tolerances || '';
        this.specialRequirements = rfqPartData.specialRequirements || '';
        this.rfqId = rfqId;
        
        // Process file references
        if (rfqPartData.fileIds && Array.isArray(rfqPartData.fileIds)) {
            this.files = rfqPartData.fileIds.map(fileId => ({
                id: fileId,
                type: 'reference',
                linkedAt: new Date().toISOString()
            }));
        }
        
        // Auto-detect services based on material and requirements
        this.detectRequiredServices();
        
        // Calculate initial complexity and costs
        this.calculateComplexity();
        this.estimateCosts();
        this.estimateLeadTime();
    }

    /**
     * Detect required services based on material and specifications
     */
    detectRequiredServices() {
        const services = [];
        
        // Default to CNC milling for most parts
        services.push('cnc-milling');
        
        // Add turning if cylindrical features mentioned
        if (this.description.toLowerCase().includes('round') ||
            this.description.toLowerCase().includes('cylinder') ||
            this.description.toLowerCase().includes('shaft')) {
            services.push('cnc-turning');
        }
        
        // Add 5-axis if complex geometry mentioned
        if (this.description.toLowerCase().includes('complex') ||
            this.description.toLowerCase().includes('curved') ||
            this.description.toLowerCase().includes('undercut')) {
            services.push('5-axis-machining');
        }
        
        // Add finishing services based on finish requirements
        const finish = this.finish.toLowerCase();
        if (finish.includes('anodiz')) services.push('anodizing');
        if (finish.includes('plat')) services.push('plating');
        if (finish.includes('powder')) services.push('powder-coating');
        if (finish.includes('passiv')) services.push('passivation');
        
        this.services = services;
    }

    /**
     * Calculate part complexity based on various factors
     */
    calculateComplexity() {
        let score = 0;
        
        // Material complexity
        const material = this.material.toLowerCase();
        if (material.includes('titanium')) score += 4;
        else if (material.includes('inconel') || material.includes('hastelloy')) score += 4;
        else if (material.includes('stainless')) score += 2;
        else if (material.includes('aluminum')) score += 1;
        
        // Tolerance requirements
        if (this.tolerances.includes('±0.0001')) score += 4;
        else if (this.tolerances.includes('±0.001')) score += 3;
        else if (this.tolerances.includes('±0.005')) score += 2;
        else if (this.tolerances.includes('±0.01')) score += 1;
        
        // Service complexity
        if (this.services.includes('5-axis-machining')) score += 3;
        if (this.services.includes('wire-edm')) score += 2;
        if (this.services.length > 3) score += 2;
        
        // Special requirements
        if (this.specialRequirements.length > 50) score += 2;
        if (this.certificationRequired) score += 2;
        
        // Quality level
        if (this.qualityLevel === 'aerospace') score += 3;
        else if (this.qualityLevel === 'precision') score += 2;
        
        // Set complexity based on score
        if (score >= 10) this.complexity = 'extreme';
        else if (score >= 6) this.complexity = 'high';
        else if (score >= 3) this.complexity = 'medium';
        else this.complexity = 'low';
    }

    /**
     * Estimate costs based on complexity and specifications
     */
    estimateCosts() {
        // Base material cost estimation
        this.materialCost = this.estimateMaterialCost();
        
        // Labor cost estimation
        this.laborCost = this.estimateLaborCost();
        
        // Tooling cost estimation
        this.toolingCost = this.estimateToolingCost();
        
        // Finishing cost estimation
        this.finishingCost = this.estimateFinishingCost();
        
        // Calculate total cost
        this.calculateTotalCost();
    }

    /**
     * Estimate material cost
     * @returns {number} Estimated material cost
     */
    estimateMaterialCost() {
        const material = this.material.toLowerCase();
        let costPerPound = 5; // Default aluminum cost
        
        // Material cost multipliers
        if (material.includes('titanium')) costPerPound = 40;
        else if (material.includes('inconel')) costPerPound = 25;
        else if (material.includes('stainless')) costPerPound = 8;
        else if (material.includes('steel')) costPerPound = 3;
        else if (material.includes('brass')) costPerPound = 6;
        else if (material.includes('copper')) costPerPound = 7;
        
        // Estimate weight (very rough approximation)
        let estimatedWeight = 1; // 1 lb default
        
        // Adjust for quantity
        const totalWeight = estimatedWeight * this.quantity;
        
        return Math.round(costPerPound * totalWeight * 100) / 100;
    }

    /**
     * Estimate labor cost
     * @returns {number} Estimated labor cost
     */
    estimateLaborCost() {
        const hourlyRate = 75; // Shop rate per hour
        let hours = 1; // Base hour
        
        // Complexity multipliers
        switch (this.complexity) {
            case 'extreme': hours *= 8; break;
            case 'high': hours *= 4; break;
            case 'medium': hours *= 2; break;
            case 'low': hours *= 1; break;
        }
        
        // Service multipliers
        if (this.services.includes('5-axis-machining')) hours *= 1.5;
        if (this.services.includes('wire-edm')) hours *= 2;
        
        // Quantity efficiencies
        if (this.quantity >= 100) hours *= 0.6;
        else if (this.quantity >= 50) hours *= 0.7;
        else if (this.quantity >= 10) hours *= 0.8;
        
        const totalHours = hours * this.quantity;
        return Math.round(hourlyRate * totalHours * 100) / 100;
    }

    /**
     * Estimate tooling cost
     * @returns {number} Estimated tooling cost
     */
    estimateToolingCost() {
        let toolingCost = 50; // Base tooling cost
        
        // Complexity adjustments
        switch (this.complexity) {
            case 'extreme': toolingCost *= 4; break;
            case 'high': toolingCost *= 2.5; break;
            case 'medium': toolingCost *= 1.5; break;
            case 'low': toolingCost *= 1; break;
        }
        
        // Material adjustments (harder materials need better tools)
        const material = this.material.toLowerCase();
        if (material.includes('titanium') || material.includes('inconel')) {
            toolingCost *= 2;
        }
        
        // Spread tooling cost across quantity
        return Math.round((toolingCost / Math.max(this.quantity, 1)) * 100) / 100;
    }

    /**
     * Estimate finishing cost
     * @returns {number} Estimated finishing cost
     */
    estimateFinishingCost() {
        if (!this.finish || this.finish === 'as-machined') return 0;
        
        let finishCost = 25; // Base finishing cost per part
        
        const finish = this.finish.toLowerCase();
        if (finish.includes('anodiz')) finishCost = 15;
        else if (finish.includes('plat')) finishCost = 35;
        else if (finish.includes('powder')) finishCost = 20;
        else if (finish.includes('passiv')) finishCost = 10;
        else if (finish.includes('polish')) finishCost = 40;
        
        return Math.round(finishCost * this.quantity * 100) / 100;
    }

    /**
     * Calculate total cost
     */
    calculateTotalCost() {
        this.totalCost = this.materialCost + this.laborCost + this.toolingCost + this.finishingCost;
        this.unitCost = this.quantity > 0 ? this.totalCost / this.quantity : 0;
        
        // Round values
        this.totalCost = Math.round(this.totalCost * 100) / 100;
        this.unitCost = Math.round(this.unitCost * 100) / 100;
    }

    /**
     * Estimate lead time based on complexity and quantity
     */
    estimateLeadTime() {
        let days = 5; // Base lead time
        
        // Complexity adjustments
        switch (this.complexity) {
            case 'extreme': days = 21; break;
            case 'high': days = 14; break;
            case 'medium': days = 10; break;
            case 'low': days = 7; break;
        }
        
        // Quantity adjustments
        if (this.quantity >= 100) days += 7;
        else if (this.quantity >= 50) days += 3;
        else if (this.quantity >= 10) days += 1;
        
        // Finishing adjustments
        if (this.finish && this.finish !== 'as-machined') {
            days += 3;
        }
        
        // Special requirements
        if (this.certificationRequired) days += 5;
        if (this.qualityLevel === 'aerospace') days += 3;
        
        this.estimatedLeadTime = `${days}-${days + 3} days`;
    }

    /**
     * Link file to part
     * @param {Object} file - File object
     * @param {string} type - File type (model, drawing, image, spec)
     */
    linkFile(file, type = 'reference') {
        const fileLink = {
            id: file.id,
            name: file.name,
            type: type,
            size: file.size,
            mimeType: file.type,
            linkedAt: new Date().toISOString()
        };
        
        // Add to appropriate array based on type
        switch (type) {
            case 'drawing':
                this.drawings.push(fileLink);
                break;
            case 'model':
                this.models.push(fileLink);
                break;
            case 'image':
                this.images.push(fileLink);
                break;
            default:
                this.files.push(fileLink);
        }
        
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Add note to part
     * @param {string} content - Note content
     * @param {string} author - Note author
     * @param {string} type - Note type
     */
    addNote(content, author = 'Admin', type = 'general') {
        const note = {
            id: 'note_' + Date.now(),
            content: content,
            author: author,
            type: type, // general, technical, production, quality
            createdAt: new Date().toISOString()
        };
        
        this.notes.push(note);
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Update part specifications
     * @param {Object} specs - New specifications
     */
    updateSpecifications(specs) {
        this.specifications = { ...this.specifications, ...specs };
        this.updatedAt = new Date().toISOString();
        
        // Recalculate complexity and costs based on new specs
        this.calculateComplexity();
        this.estimateCosts();
        this.estimateLeadTime();
    }

    /**
     * Update part status
     * @param {string} newStatus - New status
     * @param {string} note - Optional note
     */
    updateStatus(newStatus, note = '') {
        const oldStatus = this.status;
        this.status = newStatus;
        this.updatedAt = new Date().toISOString();
        
        this.addNote(
            `Status changed from ${oldStatus} to ${newStatus}${note ? ': ' + note : ''}`,
            'System',
            'status'
        );
    }

    /**
     * Create part revision
     * @param {Object} changes - Changes to make
     * @param {string} reason - Reason for revision
     * @returns {Part} New part version
     */
    createRevision(changes, reason = '') {
        const revision = {
            id: 'revision_' + Date.now(),
            previousVersion: this.toJSON(),
            changes: changes,
            reason: reason,
            createdAt: new Date().toISOString(),
            createdBy: 'Admin'
        };
        
        this.revisions.push(revision);
        
        // Apply changes
        Object.assign(this, changes);
        this.updatedAt = new Date().toISOString();
        
        // Recalculate derived values
        this.calculateComplexity();
        this.estimateCosts();
        this.estimateLeadTime();
        
        this.addNote(`Part revised: ${reason}`, 'Admin', 'revision');
        
        return this;
    }

    /**
     * Get complexity display info
     * @returns {Object} Complexity display information
     */
    getComplexityInfo() {
        const complexityMap = {
            'low': { label: 'Low', color: 'success', icon: 'fa-smile' },
            'medium': { label: 'Medium', color: 'info', icon: 'fa-meh' },
            'high': { label: 'High', color: 'warning', icon: 'fa-frown' },
            'extreme': { label: 'Extreme', color: 'danger', icon: 'fa-exclamation-triangle' }
        };
        
        return complexityMap[this.complexity] || complexityMap['medium'];
    }

    /**
     * Get status display info
     * @returns {Object} Status display information
     */
    getStatusInfo() {
        const statusMap = {
            'pending': { label: 'Pending', color: 'secondary', icon: 'fa-clock' },
            'quoted': { label: 'Quoted', color: 'primary', icon: 'fa-calculator' },
            'approved': { label: 'Approved', color: 'success', icon: 'fa-check' },
            'in_production': { label: 'In Production', color: 'warning', icon: 'fa-cogs' },
            'completed': { label: 'Completed', color: 'success', icon: 'fa-check-circle' },
            'on_hold': { label: 'On Hold', color: 'warning', icon: 'fa-pause' },
            'cancelled': { label: 'Cancelled', color: 'danger', icon: 'fa-times' }
        };
        
        return statusMap[this.status] || statusMap['pending'];
    }

    /**
     * Get part summary for display
     * @returns {Object} Summary information
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            quantity: this.quantity,
            material: this.material,
            finish: this.finish,
            complexity: this.getComplexityInfo(),
            status: this.getStatusInfo(),
            totalCost: this.totalCost,
            unitCost: this.unitCost,
            estimatedLeadTime: this.estimatedLeadTime,
            services: this.services
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
            partNumber: this.partNumber,
            description: this.description,
            quantity: this.quantity,
            material: this.material,
            finish: this.finish,
            specifications: this.specifications,
            tolerances: this.tolerances,
            dimensions: this.dimensions,
            files: this.files,
            drawings: this.drawings,
            models: this.models,
            images: this.images,
            services: this.services,
            operations: this.operations,
            complexity: this.complexity,
            setupTime: this.setupTime,
            machiningTime: this.machiningTime,
            materialCost: this.materialCost,
            laborCost: this.laborCost,
            toolingCost: this.toolingCost,
            finishingCost: this.finishingCost,
            totalCost: this.totalCost,
            unitCost: this.unitCost,
            qualityLevel: this.qualityLevel,
            inspectionRequirements: this.inspectionRequirements,
            certificationRequired: this.certificationRequired,
            specialRequirements: this.specialRequirements,
            estimatedLeadTime: this.estimatedLeadTime,
            priority: this.priority,
            deliveryDate: this.deliveryDate,
            status: this.status,
            rfqId: this.rfqId,
            quoteIds: this.quoteIds,
            notes: this.notes,
            revisions: this.revisions,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create Part from JSON data
     * @param {Object} data - JSON data
     * @returns {Part} Part instance
     */
    static fromJSON(data) {
        return new Part(data);
    }
}

// Export for use in other modules
window.Part = Part; 