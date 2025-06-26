/*=============== RFQ PANEL MAIN ===============*/

// Global panel system instance
let panelSystem;

// Initialize when DOM is loaded - DISABLED for new quote-centric system
// The new RFQPanelSystem in rfq-panel-system.js handles everything
// This file contains legacy code that conflicts with the new system

/*=============== ADDITIONAL PANEL FEATURES ===============*/

function initializePanelFeatures() {
    // Wait for elements to be created
    setTimeout(() => {
        // Save draft functionality
        const saveDraftBtn = document.getElementById('save-draft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', saveDraft);
        }
        
        // Submit RFQ functionality
        const submitBtn = document.getElementById('submit-rfq');
        if (submitBtn) {
            submitBtn.addEventListener('click', submitRFQ);
        }
    }, 200);
    
    // Auto-save is now handled by the new RFQ panel system
    // setInterval(autoSave, 30000); // Disabled - using RFQPanelSystem auto-save
}

/*=============== EXTENDED PARTS MANAGER ===============*/

class PartsManager {
    constructor(panelSystem) {
        this.panelSystem = panelSystem;
        this.currentView = 'grid';
        this.selectedParts = new Set();
        this.init();
    }

    init() {
        // Initialize after DOM elements are created
        setTimeout(() => {
            this.bindViewToggle();
            this.bindBulkActions();
        }, 300);
    }

    bindViewToggle() {
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.renderParts();
            });
        });
    }

    bindBulkActions() {
        const selectAllBtn = document.getElementById('select-all-parts');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllParts();
            });
        }
        
        const bulkConfigBtn = document.getElementById('bulk-configure');
        if (bulkConfigBtn) {
            bulkConfigBtn.addEventListener('click', () => {
                this.showBulkConfiguration();
            });
        }
    }

    renderParts() {
        const container = document.getElementById('parts-container');
        const emptyState = document.getElementById('empty-parts-state');

        if (!container || !emptyState) return;

        if (this.panelSystem.uploadedFiles.length === 0) {
            emptyState.style.display = 'block';
            container.innerHTML = '';
            container.appendChild(emptyState);
            return;
        }

        emptyState.style.display = 'none';
        
        if (this.currentView === 'grid') {
            container.innerHTML = this.generateGridView();
        } else {
            container.innerHTML = this.generateListView();
        }

        this.bindPartInteractions();
    }

    generateGridView() {
        return `
            <div class="parts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                ${this.panelSystem.uploadedFiles.map(file => this.createPartCard(file)).join('')}
            </div>
        `;
    }

    generateListView() {
        return `
            <div class="parts-list">
                <div class="list-header" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); margin-bottom: 1rem; font-weight: 600;">
                    <div>Part</div>
                    <div>Type</div>
                    <div>Size</div>
                    <div>Status</div>
                    <div>Actions</div>
                </div>
                ${this.panelSystem.uploadedFiles.map(file => this.createPartRow(file)).join('')}
            </div>
        `;
    }

    createPartCard(fileObj) {
        const isSelected = this.selectedParts.has(fileObj.id);
        const spec = this.panelSystem.partSpecifications[fileObj.id];
        const isConfigured = spec && spec.material !== '';
        const iconClass = this.panelSystem.getFileIcon(fileObj.type);
        
        return `
            <div class="part-card ${isSelected ? 'selected' : ''}" data-part-id="${fileObj.id}" 
                 style="background: var(--bg-primary); border: 2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}; border-radius: var(--border-radius-lg); padding: 1.5rem; cursor: pointer; transition: var(--transition);">
                <div class="part-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div class="part-selector">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="partsManager.togglePartSelection('${fileObj.id}')"
                               style="width: 18px; height: 18px;">
                    </div>
                    <div class="part-status ${isConfigured ? 'configured' : 'pending'}" 
                         style="color: ${isConfigured ? 'var(--success-color)' : 'var(--warning-color)'};">
                        <i class="fas ${isConfigured ? 'fa-check-circle' : 'fa-clock'}"></i>
                    </div>
                </div>
                
                <div class="part-preview" style="text-align: center; margin-bottom: 1rem;">
                    <div class="part-icon" style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem; color: white; font-size: 1.5rem;">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="part-type-badge" style="background: var(--bg-secondary); color: var(--text-color); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem; font-weight: 600;">${fileObj.type}</div>
                </div>
                
                <div class="part-info" style="text-align: center; margin-bottom: 1rem;">
                    <h3 class="part-name" title="${fileObj.name}" style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-color);">
                        ${this.panelSystem.truncateFileName(fileObj.name, 25)}
                    </h3>
                    <div class="part-meta" style="font-size: 0.9rem; color: var(--text-light);">
                        <span class="part-size">${fileObj.size}</span>
                        ${isConfigured ? `<br><span class="part-material" style="color: var(--success-color); font-weight: 500;">${spec.material}</span>` : ''}
                    </div>
                </div>
                
                <div class="part-actions" style="display: flex; gap: 0.5rem;">
                    <button class="part-action primary" onclick="partsManager.viewPart('${fileObj.id}')" 
                            style="flex: 1; padding: 0.5rem; border: none; background: var(--primary-color); color: white; border-radius: var(--border-radius); cursor: pointer; font-size: 0.9rem;">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="part-action secondary" onclick="partsManager.configurePart('${fileObj.id}')"
                            style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-color); border-radius: var(--border-radius); cursor: pointer; font-size: 0.9rem;">
                        <i class="fas fa-cog"></i> Configure
                    </button>
                </div>
            </div>
        `;
    }

    createPartRow(fileObj) {
        const isSelected = this.selectedParts.has(fileObj.id);
        const spec = this.panelSystem.partSpecifications[fileObj.id];
        const isConfigured = spec && spec.material !== '';
        const iconClass = this.panelSystem.getFileIcon(fileObj.type);
        
        return `
            <div class="part-row ${isSelected ? 'selected' : ''}" data-part-id="${fileObj.id}" 
                 style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 1rem; padding: 1rem; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: 0.5rem; align-items: center;">
                <div class="part-cell" style="display: flex; align-items: center; gap: 0.75rem;">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="partsManager.togglePartSelection('${fileObj.id}')"
                           style="width: 16px; height: 16px;">
                    <div class="part-icon" style="width: 32px; height: 32px; background: var(--primary-color); border-radius: var(--border-radius); display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="${iconClass}"></i>
                    </div>
                    <span class="part-name">${this.panelSystem.truncateFileName(fileObj.name, 30)}</span>
                </div>
                <div>
                    <span class="type-badge" style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: var(--border-radius); font-size: 0.8rem; font-weight: 500;">${fileObj.type}</span>
                </div>
                <div>
                    <span class="file-size">${fileObj.size}</span>
                </div>
                <div>
                    <span class="status-badge ${isConfigured ? 'configured' : 'pending'}" 
                          style="display: flex; align-items: center; gap: 0.5rem; color: ${isConfigured ? 'var(--success-color)' : 'var(--warning-color)'};">
                        <i class="fas ${isConfigured ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${isConfigured ? 'Configured' : 'Pending'}
                    </span>
                </div>
                <div>
                    <div class="action-buttons" style="display: flex; gap: 0.5rem;">
                        <button class="btn-icon" onclick="partsManager.viewPart('${fileObj.id}')" title="View"
                                style="padding: 0.5rem; border: none; background: var(--bg-secondary); border-radius: var(--border-radius); cursor: pointer;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="partsManager.configurePart('${fileObj.id}')" title="Configure"
                                style="padding: 0.5rem; border: none; background: var(--bg-secondary); border-radius: var(--border-radius); cursor: pointer;">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindPartInteractions() {
        // Add click handlers for part selection
        document.querySelectorAll('.part-card, .part-row').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('input')) {
                    const partId = card.dataset.partId;
                    this.togglePartSelection(partId);
                }
            });
        });
    }

    togglePartSelection(partId) {
        if (this.selectedParts.has(partId)) {
            this.selectedParts.delete(partId);
        } else {
            this.selectedParts.add(partId);
        }
        this.updateSelectionUI();
    }

    selectAllParts() {
        const allPartIds = this.panelSystem.uploadedFiles.map(f => f.id);
        
        if (this.selectedParts.size === allPartIds.length) {
            // Deselect all
            this.selectedParts.clear();
        } else {
            // Select all
            allPartIds.forEach(id => this.selectedParts.add(id));
        }
        
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        // Update checkboxes
        document.querySelectorAll('[data-part-id]').forEach(element => {
            const partId = element.dataset.partId;
            const checkbox = element.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = this.selectedParts.has(partId);
            }
            element.classList.toggle('selected', this.selectedParts.has(partId));
        });

        // Update select all button
        const selectAllBtn = document.getElementById('select-all-parts');
        if (!selectAllBtn) return;
        
        const totalParts = this.panelSystem.uploadedFiles.length;
        const selectedCount = this.selectedParts.size;
        
        if (selectedCount === 0) {
            selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Select All';
        } else if (selectedCount === totalParts) {
            selectAllBtn.innerHTML = '<i class="fas fa-times"></i> Deselect All';
        } else {
            selectAllBtn.innerHTML = `<i class="fas fa-check-double"></i> Select All (${selectedCount}/${totalParts})`;
        }
    }

    viewPart(partId) {
        const fileObj = this.panelSystem.uploadedFiles.find(f => f.id == partId);
        if (!fileObj) return;

        if (['STEP', 'IGES', 'STL', 'SolidWorks', 'Parasolid', 'OBJ', '3MF', 'PLY'].includes(fileObj.type)) {
            this.show3DViewer(fileObj);
        } else {
            this.showFilePreview(fileObj);
        }
    }

    show3DViewer(fileObj) {
        // Create modal for 3D viewer
        const modal = this.createViewerModal(fileObj);
        document.body.appendChild(modal);
        
        // Show a placeholder for now
        this.panelSystem.showNotification(`3D viewer for ${fileObj.name} would open here`, 'info');
    }

    createViewerModal(fileObj) {
        const modal = document.createElement('div');
        modal.className = 'viewer-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()" 
                 style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;"></div>
            <div class="modal-content" 
                 style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: var(--border-radius-lg); box-shadow: var(--shadow-lg); z-index: 10000; max-width: 90vw; max-height: 90vh;">
                <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;"><i class="fas fa-cube"></i> ${fileObj.name}</h3>
                    <button class="modal-close" onclick="this.closest('.viewer-modal').remove()" 
                            style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-light);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <div class="viewer-container" style="width: 600px; height: 400px; background: var(--bg-secondary); border-radius: var(--border-radius); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
                        <div style="text-align: center; color: var(--text-light);">
                            <i class="fas fa-cube" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                            <p>3D Viewer would be integrated here</p>
                        </div>
                    </div>
                    <div class="viewer-info" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="info-item">
                            <label style="font-weight: 600; color: var(--text-color);">File Type:</label>
                            <span>${fileObj.type}</span>
                        </div>
                        <div class="info-item">
                            <label style="font-weight: 600; color: var(--text-color);">File Size:</label>
                            <span>${fileObj.size}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    configurePart(partId) {
        // Switch to specifications panel and highlight this part
        this.panelSystem.switchPanel('specifications');
        
        // Show notification for now
        setTimeout(() => {
            this.panelSystem.showNotification(`Configure specifications for part ${partId}`, 'info');
        }, 300);
    }

    showBulkConfiguration() {
        if (this.selectedParts.size === 0) {
            this.panelSystem.showNotification('Please select parts to configure', 'error');
            return;
        }

        this.panelSystem.showNotification(`Bulk configuration for ${this.selectedParts.size} parts would open here`, 'info');
    }
}

/*=============== SAVE SYSTEM ===============*/

function initializeSaveSystem() {
    // Check for existing draft on load
    loadDraft();
}

function saveDraft() {
    if (!panelSystem) return;
    
    const draftData = {
        customerData: panelSystem.customerData,
        uploadedFiles: panelSystem.uploadedFiles.map(file => ({
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.type
            // Note: actual File objects can't be serialized
        })),
        partSpecifications: panelSystem.partSpecifications,
        uploadType: panelSystem.uploadType,
        quoteId: panelSystem.quoteId,
        timestamp: Date.now()
    };

    localStorage.setItem('rfq_draft', JSON.stringify(draftData));
    panelSystem.showNotification('Draft saved successfully', 'success');
}

function loadDraft() {
    const draftData = localStorage.getItem('rfq_draft');
    if (!draftData || !panelSystem) return;

    try {
        const data = JSON.parse(draftData);
        
        // Restore customer data
        panelSystem.customerData = data.customerData || {};
        Object.keys(panelSystem.customerData).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = panelSystem.customerData[fieldId];
                } else {
                    field.value = panelSystem.customerData[fieldId];
                }
            }
        });

        // Restore other data
        panelSystem.partSpecifications = data.partSpecifications || {};
        panelSystem.uploadType = data.uploadType || 'cad';
        panelSystem.quoteId = data.quoteId || panelSystem.generateQuoteId();
        
        panelSystem.updateQuoteId();
        panelSystem.updateCompletionStatus();
        
        if (data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
            panelSystem.showNotification('Draft restored from previous session', 'info');
        }
    } catch (error) {
        console.error('Error loading draft:', error);
    }
}

function autoSave() {
    // Updated for new RFQ panel system
    if (window.rfqPanel && (window.rfqPanel.rfqs.length > 0 || window.rfqPanel.parts.length > 0)) {
        window.rfqPanel.saveToStorage();
        console.log('Auto-saved RFQ data');
    }
}

function submitRFQ() {
    if (!panelSystem) return;
    
    // Validate required fields
    const requiredFields = ['customer-name', 'customer-email'];
    const missingFields = requiredFields.filter(field => 
        !panelSystem.customerData[field] || panelSystem.customerData[field].trim() === ''
    );

    if (missingFields.length > 0) {
        panelSystem.showNotification('Please complete all required fields', 'error');
        panelSystem.switchPanel('customer-info');
        return;
    }

    if (panelSystem.uploadedFiles.length === 0) {
        panelSystem.showNotification('Please upload at least one file', 'error');
        panelSystem.switchPanel('file-upload');
        return;
    }

    // Show submission confirmation
    if (confirm('Submit your RFQ? You will receive a confirmation email shortly.')) {
        // Here you would typically send the data to your server
        panelSystem.showNotification('RFQ submitted successfully! Quote ID: ' + panelSystem.quoteId, 'success');
        
        // Clear draft
        localStorage.removeItem('rfq_draft');
        
        // Update status
        const statusEl = document.getElementById('quote-status');
        if (statusEl) {
            statusEl.textContent = 'Submitted';
            statusEl.style.color = 'var(--success-color)';
        }
    }
}

/*=============== KEYBOARD SHORTCUTS ===============*/

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S to save draft
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveDraft();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.viewer-modal, .bulk-config-modal');
            modals.forEach(modal => modal.remove());
        }
    });
}

/*=============== EXTENDED PANEL SYSTEM METHODS ===============*/

// Extend the main panel system with additional methods
RFQPanelSystem.prototype.generatePartsManager = function() {
    if (!this.partsManager) {
        this.partsManager = new PartsManager(this);
    }
    this.partsManager.renderParts();
};

// Initialize parts manager when needed
let partsManager;
window.addEventListener('load', () => {
    if (panelSystem) {
        partsManager = new PartsManager(panelSystem);
    }
});

/**
 * RFQ Panel Main - Extended functionality for quote-centric system
 * Additional methods for RFQ management, part operations, and modal handling
 */

// Extend the RFQPanelSystem class with additional methods
Object.assign(RFQPanelSystem.prototype, {
    
    // Modal Management
    showNewRFQModal() {
        const modal = document.getElementById('new-rfq-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },

    closeNewRFQModal() {
        const modal = document.getElementById('new-rfq-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.clearNewRFQForm();
        }
    },

    clearNewRFQForm() {
        const form = document.getElementById('new-rfq-form');
        if (form) {
            form.reset();
        }
    },

    // RFQ Operations
    createRFQ() {
        const form = document.getElementById('new-rfq-form');
        if (!form) return;

        const formData = new FormData(form);
        const customerName = formData.get('customer-name') || document.getElementById('customer-name').value;
        const customerEmail = formData.get('customer-email') || document.getElementById('customer-email').value;
        const companyName = formData.get('company-name') || document.getElementById('company-name').value;
        const projectName = formData.get('project-name') || document.getElementById('project-name').value;
        const shippingAddress = formData.get('shipping-address') || document.getElementById('shipping-address').value;

        if (!customerName || !customerEmail) {
            this.showNotification('Please fill in required fields', 'error');
            return;
        }

        const newRFQ = {
            id: this.generateRFQId(),
            number: this.generateRFQNumber(),
            status: 'draft',
            customer: {
                name: customerName,
                email: customerEmail,
                company: companyName || '',
                phone: ''
            },
            project: {
                name: projectName || 'New Project',
                description: ''
            },
            shipping: {
                address: shippingAddress || '',
                priority: 'standard'
            },
            created: new Date(),
            modified: new Date(),
            partsCount: 0,
            estimatedValue: 0
        };

        this.rfqs.unshift(newRFQ);
        this.saveToStorage();
        this.renderRFQList();
        this.closeNewRFQModal();
        this.showNotification('RFQ created successfully');

        // Switch to parts list for new RFQ
        this.showPartsList(newRFQ.id);
    },

    createNewRFQ() {
        this.showNewRFQModal();
    },

    editRFQ(rfqId) {
        const rfq = this.rfqs.find(r => r.id === rfqId);
        if (!rfq) return;

        // Pre-fill modal with existing data
        document.getElementById('customer-name').value = rfq.customer.name;
        document.getElementById('customer-email').value = rfq.customer.email;
        document.getElementById('company-name').value = rfq.customer.company;
        document.getElementById('project-name').value = rfq.project.name;
        document.getElementById('shipping-address').value = rfq.shipping.address;

        this.showNewRFQModal();
        this.editingRFQId = rfqId;
    },

    deleteRFQ(rfqId) {
        if (!confirm('Are you sure you want to delete this RFQ? This action cannot be undone.')) {
            return;
        }

        // Remove RFQ and associated parts
        this.rfqs = this.rfqs.filter(rfq => rfq.id !== rfqId);
        this.parts = this.parts.filter(part => part.rfqId !== rfqId);
        
        this.saveToStorage();
        this.renderRFQList();
        this.showNotification('RFQ deleted successfully');
    },

    submitCurrentRFQ() {
        if (!this.currentRFQ) return;

        const currentParts = this.parts.filter(part => part.rfqId === this.currentRFQ.id);
        
        if (currentParts.length === 0) {
            this.showNotification('Please add at least one part before submitting', 'error');
            return;
        }

        // Check if all parts have specifications
        const unconfiguredParts = currentParts.filter(part => part.status === 'pending');
        if (unconfiguredParts.length > 0) {
            if (!confirm(`${unconfiguredParts.length} part(s) are not fully configured. Submit anyway?`)) {
                return;
            }
        }

        this.currentRFQ.status = 'submitted';
        this.currentRFQ.modified = new Date();
        this.saveToStorage();
        this.renderPartsList();
        this.showNotification('RFQ submitted successfully');
    },

    // Part Operations
    addNewPart() {
        if (!this.currentRFQ) return;

        const newPart = {
            id: this.generateId(),
            rfqId: this.currentRFQ.id,
            number: this.generatePartNumber(),
            name: 'New Part',
            description: '',
            files: [],
            specifications: {
                quantity: 1,
                material: '',
                materialCondition: '',
                tolerance: 'standard',
                surfaceFinish: 'standard',
                coating: '',
                requiredDelivery: '',
                priority: 'standard',
                as9100d: false,
                materialCerts: false,
                inspectionReport: false,
                firstArticle: false,
                specialInstructions: '',
                criticalDimensions: ''
            },
            status: 'pending',
            estimatedValue: 0
        };

        this.parts.push(newPart);
        this.currentRFQ.partsCount = this.parts.filter(p => p.rfqId === this.currentRFQ.id).length;
        this.saveToStorage();
        this.renderPartsList();
        this.showPartDetails(newPart.id);
    },

    duplicatePart(partId) {
        const originalPart = this.parts.find(p => p.id === partId);
        if (!originalPart) return;

        const duplicatedPart = {
            ...originalPart,
            id: this.generateId(),
            number: this.generatePartNumber(),
            name: originalPart.name + ' (Copy)',
            files: [], // Don't copy files
            specifications: { ...originalPart.specifications }
        };

        this.parts.push(duplicatedPart);
        this.currentRFQ.partsCount = this.parts.filter(p => p.rfqId === this.currentRFQ.id).length;
        this.saveToStorage();
        this.renderPartsList();
        this.showNotification('Part duplicated successfully');
    },

    deletePart(partId) {
        if (!confirm('Are you sure you want to delete this part?')) {
            return;
        }

        this.parts = this.parts.filter(part => part.id !== partId);
        if (this.currentRFQ) {
            this.currentRFQ.partsCount = this.parts.filter(p => p.rfqId === this.currentRFQ.id).length;
        }
        this.saveToStorage();
        this.renderPartsList();
        this.showNotification('Part deleted successfully');
    },

    // Form Operations
    savePartSpecifications(event) {
        event.preventDefault();
        
        if (!this.currentPart) return;

        // Update part basic info
        this.currentPart.name = document.getElementById('part-name').value || this.currentPart.name;
        this.currentPart.description = document.getElementById('part-description').value || '';

        // Update specifications
        const specs = this.currentPart.specifications;
        specs.quantity = parseInt(document.getElementById('part-quantity').value) || 1;
        specs.requiredDelivery = document.getElementById('required-delivery').value;
        specs.priority = document.getElementById('priority-level').value;
        specs.material = document.getElementById('material-type').value;
        specs.materialCondition = document.getElementById('material-condition').value;
        specs.tolerance = document.getElementById('general-tolerance').value;
        specs.criticalDimensions = document.getElementById('critical-dimensions').value;
        specs.surfaceFinish = document.getElementById('surface-finish').value;
        specs.coating = document.getElementById('coating-finish').value;
        specs.as9100d = document.getElementById('as9100d-required').checked;
        specs.materialCerts = document.getElementById('material-certs').checked;
        specs.inspectionReport = document.getElementById('inspection-report').checked;
        specs.firstArticle = document.getElementById('first-article').checked;
        specs.specialInstructions = document.getElementById('special-instructions').value;

        // Update status
        this.currentPart.status = 'configured';
        
        // Estimate value (simplified calculation)
        this.currentPart.estimatedValue = this.estimatePartValue(this.currentPart);

        this.saveToStorage();
        this.updateRFQSummary();
        this.showNotification('Part specifications saved successfully');
        
        // Go back to parts list
        this.showPartsList();
    },

    estimatePartValue(part) {
        // Simplified estimation based on material and quantity
        const materialMultipliers = {
            'aluminum-6061': 25,
            'aluminum-7075': 35,
            'aluminum-2024': 30,
            'stainless-316': 45,
            'stainless-304': 40,
            'stainless-17-4': 55,
            'titanium-grade2': 150,
            'inconel-718': 200,
            'brass-360': 35
        };

        const toleranceMultipliers = {
            'standard': 1.0,
            'tight': 1.5,
            'precision': 2.0,
            'super-precision': 3.0
        };

        const baseCost = materialMultipliers[part.specifications.material] || 30;
        const toleranceMultiplier = toleranceMultipliers[part.specifications.tolerance] || 1.0;
        const quantity = part.specifications.quantity || 1;

        return Math.round(baseCost * toleranceMultiplier * quantity);
    },

    updateRFQSummary() {
        if (!this.currentRFQ) return;

        const currentParts = this.parts.filter(part => part.rfqId === this.currentRFQ.id);
        
        // Update counts and values
        this.currentRFQ.partsCount = currentParts.length;
        this.currentRFQ.estimatedValue = currentParts.reduce((sum, part) => sum + part.estimatedValue, 0);
        
        // Update UI elements
        const totalPartsElement = document.getElementById('total-parts-count');
        const estimatedValueElement = document.getElementById('estimated-value');
        const maxLeadTimeElement = document.getElementById('max-lead-time');
        const deliveryAddressElement = document.getElementById('delivery-address');
        
        if (totalPartsElement) totalPartsElement.textContent = currentParts.length;
        if (estimatedValueElement) estimatedValueElement.textContent = `$${this.currentRFQ.estimatedValue.toLocaleString()}`;
        if (deliveryAddressElement) deliveryAddressElement.textContent = this.currentRFQ.shipping.address || 'Not specified';
        
        // Calculate max lead time
        if (maxLeadTimeElement) {
            const leadTimes = currentParts
                .map(part => part.specifications.requiredDelivery)
                .filter(date => date);
            
            if (leadTimes.length > 0) {
                const maxDate = new Date(Math.max(...leadTimes.map(date => new Date(date))));
                maxLeadTimeElement.textContent = this.formatDate(maxDate);
            } else {
                maxLeadTimeElement.textContent = 'TBD';
            }
        }
    },

    // File Operations
    viewFile(fileId) {
        if (!this.currentPart) return;
        
        const file = this.currentPart.files.find(f => f.id === fileId);
        if (!file) return;

        // For now, just show file info - could be enhanced with actual viewer
        this.showNotification(`Viewing ${file.name}`, 'info');
        
        // If it's a CAD file, try to load it in the viewer
        if (this.isCADFile(file.name)) {
            this.loadCADFile(file);
        }
    },

    removeFile(fileId) {
        if (!this.currentPart) return;
        
        this.currentPart.files = this.currentPart.files.filter(f => f.id !== fileId);
        this.saveToStorage();
        this.renderUploadedFiles();
        this.showNotification('File removed successfully');
    },

    isCADFile(filename) {
        const cadExtensions = ['step', 'stp', 'iges', 'igs', 'stl'];
        const ext = filename.split('.').pop().toLowerCase();
        return cadExtensions.includes(ext);
    },

    loadCADFile(file) {
        const viewer = document.getElementById('cad-viewer');
        if (viewer) {
            viewer.style.display = 'block';
            // Implement actual CAD loading here using Three.js or similar
        }
    },

    // Search and Filter
    filterRFQs(searchTerm) {
        const rows = document.querySelectorAll('#rfq-table-body tr');
        const term = searchTerm.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    },

    filterRFQsByStatus(status) {
        const rows = document.querySelectorAll('#rfq-table-body tr');
        
        rows.forEach(row => {
            if (!status) {
                row.style.display = '';
                return;
            }
            
            const statusBadge = row.querySelector('.status-badge');
            if (statusBadge && statusBadge.classList.contains(status)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    },

    // ID Generators
    generateRFQId() {
        return 'RFQ-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    },

    generateRFQNumber() {
        const existingNumbers = this.rfqs.map(rfq => {
            const match = rfq.number.match(/RFQ-(\d+)/);
            return match ? parseInt(match[1]) : 0;
        });
        
        const nextNumber = Math.max(0, ...existingNumbers) + 1;
        return `RFQ-${nextNumber.toString().padStart(3, '0')}`;
    },

    generatePartNumber() {
        const currentParts = this.parts.filter(part => part.rfqId === this.currentRFQ?.id);
        const nextNumber = currentParts.length + 1;
        return `PART-${nextNumber.toString().padStart(3, '0')}`;
    }
});

// Additional keyboard shortcuts and enhanced UX
document.addEventListener('DOMContentLoaded', () => {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (window.rfqPanel) {
                window.rfqPanel.saveToStorage();
                window.rfqPanel.showNotification('Data saved', 'success');
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            if (window.rfqPanel) {
                window.rfqPanel.closeNewRFQModal();
            }
        }
    });
    
    // Enhanced form validation
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !this.checkValidity()) {
                this.style.borderColor = 'var(--danger-color)';
            } else {
                this.style.borderColor = '';
            }
        });
    });
    
    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RFQPanelSystem;
} 