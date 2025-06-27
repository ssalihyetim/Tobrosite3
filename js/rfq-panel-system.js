/**
 * RFQ Panel System - Quote-Centric Design
 * Manages RFQs > Parts > Specifications hierarchy
 */

class RFQPanelSystem {
    constructor() {
        this.currentView = 'rfq-list';
        this.currentRFQ = null;
        this.currentPart = null;
        
        // CAD viewer state management
        this.cadViewer = null;
        this._cadViewerInitializing = false;
        this._pendingFile = null;
        
        // Initialize data structure
        this.data = {
            rfqs: [],
            parts: []
        };
        
        // Initialize data manager
        this.dataManager = null;
        
        // Wait for DOM and all scripts to load before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeSystem());
        } else {
            // DOM already loaded, but wait a moment for scripts to initialize
            setTimeout(() => this.initializeSystem(), 100);
        }
    }
    
    async initFileStorage() {
        try {
            if (window.fileStorage) {
                await window.fileStorage.init();
                console.log('File storage initialized successfully');
            } else {
                console.warn('File storage not available, files will only persist for current session');
            }
        } catch (error) {
            console.error('Failed to initialize file storage:', error);
        }
    }
    
    async initializeSystem() {
        try {
            // Initialize data manager
            await this.initializeDataManager();
            
            // Initialize file storage first
            await this.initFileStorage();
            
            // Then initialize the main system
            await this.init();
            
        } catch (error) {
            console.error('Failed to initialize system:', error);
        }
    }

    async initializeDataManager() {
        console.log('RFQ Panel: Initializing data manager...');
        
        // Wait for Supabase components to be ready (up to 5 seconds)
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds with 100ms intervals
        
        while (attempts < maxAttempts) {
            if (window.SupabaseDataManager && window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.log('SupabaseDataManager available:', !!window.SupabaseDataManager);
        console.log('SUPABASE_CONFIG available:', !!window.SUPABASE_CONFIG);
        console.log('SUPABASE_CONFIG.url:', window.SUPABASE_CONFIG?.url);
        console.log('SUPABASE_CONFIG.anonKey exists:', !!window.SUPABASE_CONFIG?.anonKey);
        
        try {
            // Check if SupabaseDataManager is available and Supabase is configured
            if (window.SupabaseDataManager && window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
                this.dataManager = new window.SupabaseDataManager();
                const initSuccess = await this.dataManager.init();
                if (initSuccess) {
                    console.log('✅ RFQ Panel: SupabaseDataManager initialized successfully');
                } else {
                    console.log('⚠️ RFQ Panel: SupabaseDataManager failed to initialize, falling back to localStorage');
                }
            } else {
                // Fallback to localStorage for backwards compatibility
                console.log('❌ RFQ Panel: Supabase not available, using localStorage');
                this.dataManager = null;
            }
        } catch (error) {
            console.error('❌ Failed to initialize data manager:', error);
            this.dataManager = null;
        }
    }

    async init() {
        console.log('Initializing RFQ Panel System...');
        
        // Load saved data
        await this.loadFromStorage();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize views
        this.renderRFQList();
        this.showView('rfq-list');
        
        // Update storage status
        this.updateStorageStatus();
    }

    setupEventListeners() {
        // New RFQ button
        const newRFQBtn = document.getElementById('new-rfq-btn');
        if (newRFQBtn) {
            newRFQBtn.addEventListener('click', () => this.showNewRFQModal());
        }

        // Search and filter
        const searchInput = document.getElementById('rfq-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterRFQs(e.target.value));
        }

        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.filterRFQsByStatus(e.target.value));
        }

        // Add part button
        const addPartBtn = document.getElementById('add-part-btn');
        if (addPartBtn) {
            addPartBtn.addEventListener('click', () => this.addNewPart());
        }

        // Submit RFQ button
        const submitRFQBtn = document.getElementById('submit-rfq-btn');
        if (submitRFQBtn) {
            submitRFQBtn.addEventListener('click', () => this.submitCurrentRFQ());
        }

        // File upload handling
        this.setupFileUpload();

        // Form submission
        const partSpecsForm = document.getElementById('part-specs-form');
        if (partSpecsForm) {
            partSpecsForm.addEventListener('submit', (e) => this.savePartSpecifications(e));
        }

        // Auto-save
        this.setupAutoSave();
    }

    setupFileUpload() {
        // File upload will be set up when part details view is rendered
        // This prevents issues with elements not existing yet
    }

    setupAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveToStorage();
        }, 30000);

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveToStorage();
        });
    }

    // View Management
    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.content-view').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
        }
    }

    showRFQList() {
        this.renderRFQList();
        this.showView('rfq-list');
    }

    showPartsList(rfqId) {
        if (rfqId) {
            this.currentRFQ = this.data.rfqs.find(rfq => rfq.id === rfqId);
        }
        
        if (this.currentRFQ) {
            this.renderPartsList();
            this.showView('parts-list');
        }
    }

    showPartDetails(partId) {
        if (partId) {
            this.currentPart = this.data.parts.find(part => part.id === partId);
        }
        
        if (this.currentPart) {
            // Reset CAD viewer when switching parts to ensure clean state
            this.resetCADViewer();
            this.renderPartDetails();
            this.showView('part-details');
        }
    }

    // RFQ Management
    renderRFQList() {
        const tableBody = document.getElementById('rfq-table-body');
        const emptyState = document.getElementById('empty-rfq-state');
        
        if (!tableBody) return;

        if (this.data.rfqs.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        tableBody.innerHTML = this.data.rfqs.map(rfq => `
            <tr onclick="rfqPanel.showPartsList('${rfq.id}')" style="cursor: pointer;">
                <td><strong>${rfq.number}</strong></td>
                <td><span class="status-badge ${rfq.status}">${this.getStatusText(rfq.status)}</span></td>
                <td>
                    <div>${rfq.customer.company || rfq.customer.name}</div>
                    <small style="color: var(--text-light);">${rfq.shipping.address.split(',').slice(0, 2).join(',')}</small>
                </td>
                <td>${rfq.partsCount} parts</td>
                <td>$${rfq.estimatedValue.toLocaleString()}</td>
                <td>
                    <div>${this.formatDate(rfq.modified)}</div>
                    <small style="color: var(--text-light);">Created ${this.formatDate(rfq.created)}</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); rfqPanel.editRFQ('${rfq.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); rfqPanel.deleteRFQ('${rfq.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderPartsList() {
        if (!this.currentRFQ) return;

        // Update header
        const titleElement = document.getElementById('current-rfq-title');
        const statusElement = document.getElementById('current-rfq-status');
        
        if (titleElement) {
            titleElement.textContent = `${this.currentRFQ.number} - ${this.currentRFQ.project.name}`;
        }
        
        if (statusElement) {
            const currentParts = this.data.parts.filter(part => part.rfqId === this.currentRFQ.id);
            statusElement.innerHTML = `
                Status: <span class="status-badge ${this.currentRFQ.status}">${this.getStatusText(this.currentRFQ.status)}</span> • 
                ${currentParts.length} Parts • 
                Updated ${this.formatRelativeTime(this.currentRFQ.modified)}
            `;
        }

        // Render parts grid
        const partsGrid = document.getElementById('parts-grid');
        if (!partsGrid) return;

        const currentParts = this.data.parts.filter(part => part.rfqId === this.currentRFQ.id);

        if (currentParts.length === 0) {
            partsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cube"></i>
                    <h3>No Parts Added</h3>
                    <p>Add parts to this RFQ to get started</p>
                    <button class="btn btn-primary" onclick="rfqPanel.addNewPart()">
                        <i class="fas fa-plus"></i> Add First Part
                    </button>
                </div>
            `;
            return;
        }

        partsGrid.innerHTML = currentParts.map(part => `
            <div class="part-card" onclick="rfqPanel.showPartDetails('${part.id}')">
                <div class="part-card-header">
                    <div class="part-number">${part.number}</div>
                    <div class="part-status">
                        <i class="fas fa-${this.getPartStatusIcon(part.status)}"></i>
                        <span>${this.getPartStatusText(part.status)}</span>
                    </div>
                </div>
                <div class="part-info">
                    <div class="part-name">${part.name}</div>
                    <div class="part-details">
                        <span><strong>Qty:</strong> ${part.specifications.quantity}</span>
                        <span><strong>Material:</strong> ${this.getMaterialName(part.specifications.material)}</span>
                        <span><strong>Lead Time:</strong> ${this.formatDate(part.specifications.requiredDelivery)}</span>
                        <span><strong>Est. Value:</strong> $${part.estimatedValue.toLocaleString()}</span>
                    </div>
                </div>
                <div class="part-actions" onclick="event.stopPropagation();">
                    <button class="btn btn-sm btn-secondary" onclick="rfqPanel.duplicatePart('${part.id}')">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rfqPanel.deletePart('${part.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Update summary
        this.updateRFQSummary();
    }

    renderPartDetails() {
        if (!this.currentPart) return;

        // Update header
        const titleElement = document.getElementById('current-part-title');
        const infoElement = document.getElementById('current-part-info');
        
        if (titleElement) {
            titleElement.textContent = `${this.currentPart.number} - ${this.currentPart.name}`;
        }
        
        if (infoElement) {
            const specs = this.currentPart.specifications;
            infoElement.innerHTML = `
                ${this.getMaterialName(specs.material)} • 
                Qty: ${specs.quantity} • 
                Lead Time: ${this.formatDate(specs.requiredDelivery)}
            `;
        }

        // Populate form
        this.populateSpecificationsForm();
        
        // Render uploaded files
        this.renderUploadedFiles();
        
        // Clean up any existing file upload setup and set up fresh
        this.cleanupFileUpload();
        this.setupPartFileUpload();
        
        // Setup tolerance unit switching
        this.setupToleranceUnitSwitching();
    }

    populateSpecificationsForm() {
        const specs = this.currentPart.specifications;
        
        // Basic info
        this.setFormValue('part-name', this.currentPart.name);
        this.setFormValue('part-description', this.currentPart.description);
        
        // Quantity & Timeline
        this.setFormValue('part-quantity', specs.quantity);
        this.setFormValue('required-delivery', specs.requiredDelivery);
        this.setFormValue('priority-level', specs.priority);
        
        // Material
        this.setFormValue('material-type', specs.material);
        this.setFormValue('material-condition', specs.materialCondition);
        
        // Tolerances
        this.setFormValue('tolerance-unit', specs.toleranceUnit || 'inches');
        this.setFormValue('general-tolerance', specs.tolerance);
        this.setFormValue('critical-dimensions', specs.criticalDimensions || '');
        
        // Surface finish
        this.setFormValue('surface-finish', specs.surfaceFinish);
        this.setFormValue('coating-finish', specs.coating);
        
        // Quality requirements
        this.setCheckboxValue('as9100d-required', specs.as9100d);
        this.setCheckboxValue('material-certs', specs.materialCerts);
        this.setCheckboxValue('inspection-report', specs.inspectionReport);
        this.setCheckboxValue('first-article', specs.firstArticle);
        
        // Special instructions
        this.setFormValue('special-instructions', specs.specialInstructions || '');
    }

    setFormValue(id, value) {
        const element = document.getElementById(id);
        if (element && value !== undefined) {
            element.value = value;
        }
    }

    setCheckboxValue(id, checked) {
        const element = document.getElementById(id);
        if (element) {
            element.checked = !!checked;
        }
    }

    // File handling
    async handleFileUpload(files) {
        console.log('handleFileUpload called with files:', files);
        
        if (!this.currentPart) {
            console.error('No current part selected for file upload');
            this.showNotification('Please select a part first', 'error');
            return;
        }

        if (!files || files.length === 0) {
            console.warn('No files provided to handleFileUpload');
            return;
        }

        console.log(`Processing ${files.length} files for part ${this.currentPart.number}`);

        const uploadPromises = Array.from(files).map(async (file) => {
            console.log(`Adding file: ${file.name} (${file.size} bytes)`);
            
            const fileId = this.generateId();
            const fileData = {
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type,
                uploaded: new Date(),
                file: file,
                storedInDB: false
            };
            
            // Store file in IndexedDB for persistence across sessions
            try {
                if (window.fileStorage) {
                    await window.fileStorage.storeFile(fileId, file, {
                        partId: this.currentPart.id,
                        uploadDate: fileData.uploaded
                    });
                    fileData.storedInDB = true;
                    console.log(`File ${file.name} stored in IndexedDB`);
                }
            } catch (error) {
                console.warn(`Failed to store ${file.name} in IndexedDB:`, error);
                // File will still work for current session
            }
            
            return fileData;
        });

        try {
            const fileObjects = await Promise.all(uploadPromises);
            this.currentPart.files.push(...fileObjects);
            
            // Update fileIds array for database consistency
            if (this.currentPart.updateFileIds) {
                this.currentPart.updateFileIds();
            } else {
                // Fallback if Part model doesn't have updateFileIds method
                this.currentPart.fileIds = this.currentPart.files.map(file => file.id);
            }
            
            this.renderUploadedFiles();
            this.saveToStorage();
            this.updateStorageStatus();
            this.showNotification(`${files.length} file(s) uploaded successfully`);
        } catch (error) {
            console.error('Error uploading files:', error);
            this.showNotification('Error uploading some files', 'error');
        }
    }

    renderUploadedFiles() {
        const container = document.getElementById('part-uploaded-files');
        if (!container || !this.currentPart) return;

        const files = this.currentPart.files || [];
        console.log('Rendering uploaded files:', files.length, 'files found');
        
        if (files.length === 0) {
            container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 1rem;">No files uploaded yet</p>';
            return;
        }

        container.innerHTML = files.map(file => {
            const isFileAvailable = file.file && file.file instanceof File;
            const isStoredInDB = file.storedInDB;
            
            let statusIndicator;
            if (isFileAvailable) {
                statusIndicator = '<i class="fas fa-check-circle" style="color: var(--success-color); margin-left: 0.5rem;" title="File available for viewing"></i>';
            } else if (isStoredInDB) {
                statusIndicator = '<i class="fas fa-database" style="color: var(--primary-color); margin-left: 0.5rem;" title="File stored in database - click to restore"></i>';
            } else {
                statusIndicator = '<i class="fas fa-exclamation-triangle" style="color: var(--warning-color); margin-left: 0.5rem;" title="File needs re-upload to view"></i>';
            }
                
            return `
            <div class="uploaded-file-item" data-file-id="${file.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: 0.5rem; background: var(--bg-secondary);">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 32px; height: 32px; background: var(--primary-color); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="fas fa-${this.getFileIcon(file.name)}"></i>
                    </div>
                    <div>
                        <div style="font-weight: 600; color: var(--text-color); display: flex; align-items: center;">
                            ${file.name}
                            ${statusIndicator}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-light);">${this.formatFileSize(file.size)} • ${this.formatDate(file.uploaded)}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-secondary view-file-btn" data-file-id="${file.id}" title="${isFileAvailable ? 'View' : 'File needs re-upload'}" ${!isFileAvailable ? 'style="opacity: 0.6;"' : ''}>
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger remove-file-btn" data-file-id="${file.id}" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `}).join('');
        
        // Add event listeners to the buttons
        this.attachFileButtonListeners();
    }
    
    attachFileButtonListeners() {
        const container = document.getElementById('part-uploaded-files');
        if (!container) return;
        
        // View file buttons
        container.querySelectorAll('.view-file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileId = e.currentTarget.getAttribute('data-file-id');
                console.log('View button clicked for file:', fileId);
                this.viewFile(fileId);
            });
        });
        
        // Remove file buttons
        container.querySelectorAll('.remove-file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileId = e.currentTarget.getAttribute('data-file-id');
                console.log('Remove button clicked for file:', fileId);
                this.removeFile(fileId);
            });
        });
        
        console.log('File button listeners attached');
    }

    setupPartFileUpload() {
        console.log('Setting up file upload for part details view...');
        
        const fileInput = document.getElementById('part-file-input');
        const uploadArea = document.getElementById('part-file-upload');

        if (!fileInput || !uploadArea) {
            console.error('File input or upload area not found', { fileInput, uploadArea });
            return;
        }

        console.log('Found file input and upload area elements');

        // Use multiple flags to prevent duplicate setup
        if (uploadArea.dataset.setupComplete === 'true' || uploadArea._rfqSystemSetup) {
            console.log('File upload already set up for this view');
            return;
        }

        // Add a global flag to prevent competing systems
        if (window._fileUploadLock) {
            console.warn('File upload is locked by another system');
            return;
        }
        window._fileUploadLock = true;

        // Disable complex click handler - using simple button approach instead
        // The upload zone now has a "Browse Files" button that directly triggers the file input
        console.log('Using simple button approach for file upload instead of complex click handler');

        // File selection
        const changeHandler = (e) => {
            console.log('File input change event triggered', e.target.files);
            
            if (e.target.files && e.target.files.length > 0) {
                console.log(`Selected ${e.target.files.length} files:`, Array.from(e.target.files).map(f => f.name));
                this.handleFileUpload(e.target.files);
                // Clear the input so the same file can be selected again
                e.target.value = '';
            } else {
                console.warn('No files selected or files list is empty');
            }
        };
        fileInput.addEventListener('change', changeHandler);

        // Drag and drop
        const dragOverHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        };
        uploadArea.addEventListener('dragover', dragOverHandler);

        const dragLeaveHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        };
        uploadArea.addEventListener('dragleave', dragLeaveHandler);

        const dropHandler = (e) => {
            console.log('Files dropped on upload area');
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                console.log(`Dropped ${e.dataTransfer.files.length} files`);
                this.handleFileUpload(e.dataTransfer.files);
            }
        };
        uploadArea.addEventListener('drop', dropHandler);

        // Mark as set up with multiple flags
        uploadArea.dataset.setupComplete = 'true';
        uploadArea._rfqSystemSetup = true;
        
        // Store references for cleanup if needed (no click handler since using button)
        fileInput._changeHandler = changeHandler;
        uploadArea._dragOverHandler = dragOverHandler;
        uploadArea._dragLeaveHandler = dragLeaveHandler;
        uploadArea._dropHandler = dropHandler;

        console.log('File upload setup completed for part details view');
    }

    cleanupFileUpload() {
        const fileInput = document.getElementById('part-file-input');
        const uploadArea = document.getElementById('part-file-upload');

        if (uploadArea && (uploadArea.dataset.setupComplete === 'true' || uploadArea._rfqSystemSetup)) {
            console.log('Cleaning up existing file upload event listeners...');
            
            // Remove existing event listeners if they exist
            // No click handler to remove since using button approach
            if (uploadArea._dragOverHandler) {
                uploadArea.removeEventListener('dragover', uploadArea._dragOverHandler);
                delete uploadArea._dragOverHandler;
            }
            if (uploadArea._dragLeaveHandler) {
                uploadArea.removeEventListener('dragleave', uploadArea._dragLeaveHandler);
                delete uploadArea._dragLeaveHandler;
            }
            if (uploadArea._dropHandler) {
                uploadArea.removeEventListener('drop', uploadArea._dropHandler);
                delete uploadArea._dropHandler;
            }
            
            if (fileInput && fileInput._changeHandler) {
                fileInput.removeEventListener('change', fileInput._changeHandler);
                delete fileInput._changeHandler;
            }
            
            // Reset all flags
            uploadArea.dataset.setupComplete = 'false';
            uploadArea._rfqSystemSetup = false;
            window._fileUploadLock = false;
            
            console.log('File upload cleanup completed');
        }
    }

    // Utility functions
    getStatusText(status) {
        const statusMap = {
            'draft': 'Draft',
            'submitted': 'Submitted',
            'quoted': 'Quoted',
            'in-production': 'In Production',
            'completed': 'Completed'
        };
        return statusMap[status] || 'Unknown';
    }

    getPartStatusText(status) {
        const statusMap = {
            'pending': 'Pending',
            'configured': 'Configured',
            'quoted': 'Quoted',
            'approved': 'Approved'
        };
        return statusMap[status] || 'Unknown';
    }

    getPartStatusIcon(status) {
        const iconMap = {
            'pending': 'clock',
            'configured': 'check-circle',
            'quoted': 'dollar-sign',
            'approved': 'thumbs-up'
        };
        return iconMap[status] || 'question-circle';
    }

    getMaterialName(materialCode) {
        const materials = {
            // Aluminum Alloys
            'aluminum-6061': 'Al 6061-T6',
            'aluminum-7075': 'Al 7075-T651',
            'aluminum-2024': 'Al 2024-T3',
            'aluminum-5052': 'Al 5052-H32',
            'aluminum-6063': 'Al 6063-T6',
            'aluminum-7050': 'Al 7050-T7451',
            
            // Stainless Steel
            'stainless-316': '316 SS',
            'stainless-304': '304 SS',
            'stainless-17-4': '17-4 PH SS',
            'stainless-321': '321 SS',
            'stainless-410': '410 SS',
            'stainless-416': '416 SS',
            
            // Carbon Steel
            'carbon-1018': '1018 Carbon Steel',
            'carbon-1045': '1045 Carbon Steel',
            'carbon-4140': '4140 Carbon Steel',
            'carbon-4340': '4340 Carbon Steel',
            'carbon-1084': '1084 Carbon Steel',
            'carbon-a36': 'A36 Carbon Steel',
            
            // Engineering Plastics
            'plastic-delrin-acetal': 'Delrin (POM)',
            'plastic-peek': 'PEEK',
            'plastic-pei-ultem': 'PEI (Ultem)',
            'plastic-abs': 'ABS',
            'plastic-nylon-6': 'Nylon 6',
            'plastic-nylon-66': 'Nylon 6/6',
            'plastic-polycarbonate': 'PC',
            'plastic-ptfe-teflon': 'PTFE',
            'plastic-hdpe': 'HDPE',
            'plastic-uhmw-pe': 'UHMW-PE',
            'plastic-pps': 'PPS',
            
            // Specialty Alloys
            'titanium-grade2': 'Ti Grade 2',
            'titanium-grade5': 'Ti Grade 5',
            'inconel-718': 'Inconel 718',
            'inconel-625': 'Inconel 625',
            'hastelloy-c276': 'Hastelloy C276',
            'brass-360': 'Brass 360',
            'copper-101': 'Copper 101',
            'bronze-932': 'Bronze 932'
        };
        return materials[materialCode] || materialCode;
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'step': 'cube',
            'stp': 'cube',
            'iges': 'cube',
            'igs': 'cube',
            'stl': 'shapes',
            'pdf': 'file-pdf',
            'dwg': 'drafting-compass',
            'dxf': 'drafting-compass'
        };
        return iconMap[ext] || 'file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(date) {
        if (!date) return 'N/A';
        if (typeof date === 'string') date = new Date(date);
        return date.toLocaleDateString();
    }

    formatRelativeTime(date) {
        if (!date) return 'Unknown';
        if (typeof date === 'string') date = new Date(date);
        
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    generateId() {
        // Use the same UUID generation as generateUUID for consistency
        return this.generateUUID();
    }

    // Storage
    saveToStorage() {
        try {
            // Create a deep copy of the data excluding File objects which can't be serialized
            const dataToSave = JSON.parse(JSON.stringify(this.data, (key, value) => {
                // Skip the actual File object as it can't be serialized
                if (key === 'file' && value instanceof File) {
                    return null;
                }
                return value;
            }));
            
            localStorage.setItem('rfq-panel-data', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Failed to save to storage:', error);
        }
    }

    async loadFromStorage() {
        try {
            const savedData = localStorage.getItem('rfq-panel-data');
            
            if (savedData) {
                const parsed = JSON.parse(savedData);
                this.data.rfqs = parsed.rfqs || [];
                this.data.parts = parsed.parts || [];
                
                // Check which files are available in IndexedDB
                if (window.fileStorage) {
                    try {
                        const allStoredFiles = await window.fileStorage.getAllFiles();
                        const storedFileIds = new Set(allStoredFiles.map(f => f.id));
                        
                                        // Mark files as stored in DB if they exist there and ensure fileIds exists
                this.data.parts.forEach(part => {
                    if (part.files) {
                        part.files.forEach(file => {
                            file.storedInDB = storedFileIds.has(file.id);
                        });
                    }
                    
                    // Ensure fileIds property exists for backward compatibility
                    if (!part.fileIds) {
                        part.fileIds = part.files ? part.files.map(file => file.id) : [];
                    }
                });
                        
                        console.log(`Found ${allStoredFiles.length} files in IndexedDB`);
                    } catch (error) {
                        console.warn('Error checking IndexedDB files:', error);
                    }
                } else {
                    // Ensure fileIds property exists even without IndexedDB
                    this.data.parts.forEach(part => {
                        if (!part.fileIds) {
                            part.fileIds = part.files ? part.files.map(file => file.id) : [];
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load from storage:', error);
        }
    }

    // File Operations
    async viewFile(fileId) {
        console.log('=== viewFile method called ===');
        console.log('File ID:', fileId);
        console.log('Current part:', this.currentPart);
        
        if (!this.currentPart) {
            console.error('No current part found');
            return;
        }
        
        let file = this.currentPart.files.find(f => f.id === fileId);
        if (!file) {
            console.error('File not found:', fileId);
            this.showNotification('File not found', 'error');
            return;
        }

        console.log(`[INFO] Viewing ${file.name}`);
        
        // If file object is not available, try to restore from IndexedDB
        if (!file.file || !(file.file instanceof File)) {
            console.log('File object not available, trying to restore from IndexedDB...');
            try {
                if (window.fileStorage) {
                    const storedFileData = await window.fileStorage.getFile(fileId);
                    if (storedFileData && storedFileData.file) {
                        console.log('Successfully restored file from IndexedDB:', file.name);
                        file.file = storedFileData.file;
                        file.storedInDB = true;
                        
                        // Update the UI to show the file is now available
                        this.renderUploadedFiles();
                        this.showNotification(`File ${file.name} restored from storage`, 'success');
                    } else {
                        console.log('File not found in IndexedDB:', fileId);
                    }
                }
            } catch (error) {
                console.error('Error restoring file from IndexedDB:', error);
            }
        }
        
        // Show the CAD viewer container first
        const viewerContainer = document.getElementById('cad-viewer-container');
        if (!viewerContainer) {
            console.error('CAD viewer container not found');
            this.showNotification('3D viewer not available', 'error');
            return;
        }
        
        console.log('CAD viewer container found:', viewerContainer);
        viewerContainer.style.display = 'block';
        console.log('CAD viewer container shown, display style:', viewerContainer.style.display);
        
        // Check if the inner cad-viewer element exists
        const cadViewerElement = document.getElementById('cad-viewer');
        console.log('Inner CAD viewer element:', cadViewerElement);
        if (cadViewerElement) {
            console.log('CAD viewer element dimensions:', cadViewerElement.offsetWidth, 'x', cadViewerElement.offsetHeight);
        }
        
        // Initialize CAD viewer if not already done
        if (!this.cadViewer) {
            this.initializeCADViewer(file);
            return;
        }
        
        // CAD viewer already exists, load the file
        if (this.isCADFile(file.name)) {
            this.loadFileInViewer(file);
        } else {
            this.handleNonCADFile(file);
        }
    }
    
    initializeCADViewer(file) {
        // Prevent multiple simultaneous initializations
        if (this._cadViewerInitializing) {
            console.log('CAD viewer already initializing, queueing file...');
            this._pendingFile = file;
            return;
        }
        
        this._cadViewerInitializing = true;
        
        // Clear any existing viewer
        this.cadViewer = null;
        
        // Ensure container is ready
        const cadViewerElement = document.getElementById('cad-viewer');
        if (!cadViewerElement) {
            console.error('CAD viewer element not found');
            this.showNotification('CAD viewer element not found', 'error');
            this._cadViewerInitializing = false;
            return;
        }
        
        // Force proper container dimensions
        cadViewerElement.style.width = '100%';
        cadViewerElement.style.height = '400px';
        cadViewerElement.style.minHeight = '400px';
        
        // Initialize OCCT if needed
        const needsOCCT = this.isCADFile(file.name) && 
                         (file.name.toLowerCase().includes('.stp') || 
                          file.name.toLowerCase().includes('.step') || 
                          file.name.toLowerCase().includes('.iges') || 
                          file.name.toLowerCase().includes('.igs'));
        
        if (needsOCCT && typeof OCCTImporter !== 'undefined') {
            if (!window.occtImporter) {
                window.occtImporter = new OCCTImporter();
            }
            
            // Initialize OCCT first, then create viewer
            window.occtImporter.init()
                .then(() => {
                    this.createCADViewerInstance(file);
                })
                .catch(error => {
                    console.warn('OCCT importer failed, using basic viewer:', error);
                    this.createCADViewerInstance(file);
                });
        } else {
            // Create viewer directly
            this.createCADViewerInstance(file);
        }
    }
    
    createCADViewerInstance(file) {
        try {
            // Create the CAD viewer
            this.cadViewer = new CADViewer();
            
            // Small delay to ensure initialization completes
            setTimeout(() => {
                this.setupViewerControls();
                
                // Load the file
                if (this.isCADFile(file.name)) {
                    this.loadFileInViewer(file);
                } else {
                    this.handleNonCADFile(file);
                }
                
                // Mark initialization as complete
                this._cadViewerInitializing = false;
                
                // Process any pending file
                if (this._pendingFile) {
                    const pendingFile = this._pendingFile;
                    this._pendingFile = null;
                    setTimeout(() => this.viewFile(pendingFile.id), 100);
                }
            }, 100);
            
        } catch (error) {
            console.error('Error creating CAD viewer:', error);
            this.showNotification('Failed to create 3D viewer', 'error');
            this._cadViewerInitializing = false;
        }
    }
    

    
    loadFileInViewer(file) {
        this.showNotification(`Loading ${file.name}...`, 'info');
        
        try {
            // Check if CAD viewer is ready
            if (!this.cadViewer) {
                throw new Error('CAD viewer not initialized');
            }
            
            // Check if file object is available (only available in current session)
            if (!file.file || !(file.file instanceof File)) {
                console.warn('File object not available - file was uploaded in a previous session');
                this.showFileNotAvailableMessage(file);
                return;
            }
            
            if (!file.file.name) {
                throw new Error('File name is missing');
            }
            
            this.cadViewer.loadFile(file.file);
            this.showNotification(`Now viewing: ${file.name}`, 'success');
        } catch (error) {
            console.error('Error loading CAD file:', error);
            this.showNotification(`Failed to load ${file.name}`, 'error');
            
            // Reset viewer state on error
            this.cadViewer = null;
            this._cadViewerInitializing = false;
        }
    }
    
    showFileNotAvailableMessage(file) {
        const viewer = document.getElementById('cad-viewer');
        if (viewer) {
            viewer.innerHTML = `
                <div class="viewer-placeholder" style="text-align: center; padding: 2rem; color: var(--text-color-light);">
                    <i class="fas fa-upload" style="font-size: 3rem; margin-bottom: 1rem; color: var(--warning-color);"></i>
                    <h3 style="color: var(--title-color); margin-bottom: 1rem;">File Not Available</h3>
                    <p style="margin-bottom: 1rem;">${file.name} was uploaded in a previous session.</p>
                    <p style="margin-bottom: 1.5rem;">Please re-upload the file to view it in the 3D viewer.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('part-file-input').click()">
                        <i class="fas fa-upload"></i> Re-upload File
                    </button>
                </div>
            `;
        }
        this.showNotification('File needs to be re-uploaded to view', 'warning');
    }
    
    handleNonCADFile(file) {
        this.showNotification(`Viewing ${file.name}`, 'info');
        
        // Check if file object is available (only available in current session)
        if (!file.file || !(file.file instanceof File)) {
            this.showFileNotAvailableMessage(file);
            return;
        }
        
        if (file.file.type === 'application/pdf') {
            // Open PDF in new tab
            const url = URL.createObjectURL(file.file);
            window.open(url, '_blank');
        } else {
            // Show a placeholder for other file types
            const viewer = document.getElementById('cad-viewer');
            if (viewer) {
                viewer.innerHTML = `
                    <div class="viewer-placeholder">
                        <i class="fas fa-file-alt"></i>
                        <p>Preview not available for ${file.name}</p>
                        <small>File type: ${file.file.type || 'Unknown'}</small>
                    </div>
                `;
            }
        }
    }

    async removeFile(fileId) {
        if (!this.currentPart) return;
        
        const fileIndex = this.currentPart.files.findIndex(f => f.id === fileId);
        if (fileIndex === -1) {
            this.showNotification('File not found', 'error');
            return;
        }

        const file = this.currentPart.files[fileIndex];
        
        // Remove file from IndexedDB if it was stored there
        if (file.storedInDB && window.fileStorage) {
            try {
                await window.fileStorage.deleteFile(fileId);
                console.log(`File ${file.name} removed from IndexedDB`);
            } catch (error) {
                console.warn(`Failed to remove ${file.name} from IndexedDB:`, error);
            }
        }
        
        // Remove file from array
        this.currentPart.files.splice(fileIndex, 1);
        
        // Update fileIds array for database consistency
        if (this.currentPart.updateFileIds) {
            this.currentPart.updateFileIds();
        } else {
            // Fallback if Part model doesn't have updateFileIds method
            this.currentPart.fileIds = this.currentPart.files.map(file => file.id);
        }
        
        // Update UI
        this.renderUploadedFiles();
        this.saveToStorage();
        this.updateStorageStatus();
        
        this.showNotification(`${file.name} removed`, 'success');
        
        // Hide CAD viewer if no files left
        if (this.currentPart.files.length === 0) {
            this.resetCADViewer();
        }
    }

    resetCADViewer() {
        // Clean up existing viewer
        if (this.cadViewer && this.cadViewer.dispose) {
            this.cadViewer.dispose();
        }
        this.cadViewer = null;
        this._cadViewerInitializing = false;
        this._pendingFile = null;
        
        // Hide viewer container
        const viewerContainer = document.getElementById('cad-viewer-container');
        if (viewerContainer) {
            viewerContainer.style.display = 'none';
        }
        
        // Reset viewer content to placeholder
        const viewer = document.getElementById('cad-viewer');
        if (viewer) {
            viewer.innerHTML = `
                <div class="viewer-placeholder">
                    <i class="fas fa-cube"></i>
                    <p>CAD Viewer will appear here after file upload</p>
                </div>
            `;
        }
    }

    isCADFile(filename) {
        const cadExtensions = ['stl', 'obj', 'step', 'stp', 'iges', 'igs'];
        const extension = filename.split('.').pop().toLowerCase();
        return cadExtensions.includes(extension);
    }

    setupViewerControls() {
        // Prevent duplicate setup
        if (this._viewerControlsSetup) return;
        this._viewerControlsSetup = true;

        // Fit to View button
        const fitViewBtn = document.getElementById('fit-view');
        if (fitViewBtn) {
            fitViewBtn.addEventListener('click', () => {
                if (this.cadViewer && this.cadViewer.fitToView) {
                    this.cadViewer.fitToView();
                    this.showNotification('View reset to fit model', 'info');
                } else {
                    this.showNotification('3D viewer not ready', 'warning');
                }
            });
        }

        // Measurement tool button
        const measureBtn = document.getElementById('measure-tool');
        if (measureBtn) {
            measureBtn.addEventListener('click', () => {
                if (this.cadViewer && this.cadViewer.toggleMeasurementMode) {
                    this.cadViewer.toggleMeasurementMode();
                    measureBtn.classList.toggle('active');
                    this.showNotification('Measurement tool toggled', 'info');
                } else {
                    this.showNotification('Measurement tool not available', 'warning');
                }
            });
        }

        // Section tool button
        const sectionBtn = document.getElementById('section-tool');
        if (sectionBtn) {
            sectionBtn.addEventListener('click', () => {
                if (this.cadViewer && this.cadViewer.toggleSectionView) {
                    this.cadViewer.toggleSectionView();
                    this.showNotification('Section view toggled', 'info');
                } else {
                    this.showNotification('Section tool not available', 'warning');
                }
            });
        }

        // View mode selector
        const viewModeSelect = document.getElementById('view-mode');
        if (viewModeSelect) {
            viewModeSelect.addEventListener('change', (e) => {
                if (this.cadViewer && this.cadViewer.changeViewMode) {
                    this.cadViewer.changeViewMode(e.target.value);
                    this.showNotification(`View mode changed to ${e.target.value}`, 'info');
                } else {
                    this.showNotification('3D viewer not ready', 'warning');
                }
            });
        }

        console.log('Viewer controls set up');
    }

    showNotification(message, type = 'success') {
        // Simple notification - could be enhanced
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // You could implement a toast notification system here
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--${type === 'success' ? 'success' : 'danger'}-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Modal Management
    showNewRFQModal() {
        const modal = document.getElementById('new-rfq-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeNewRFQModal() {
        const modal = document.getElementById('new-rfq-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.clearNewRFQForm();
        }
    }

    clearNewRFQForm() {
        const form = document.getElementById('new-rfq-form');
        if (form) {
            form.reset();
        }
    }

    // RFQ Operations
    async createRFQ() {
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

        // Generate unique RFQ number
        const rfqNumber = await this.generateRFQNumber();

        const newRFQ = {
            id: this.generateId(),
            number: rfqNumber,
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

        this.data.rfqs.unshift(newRFQ);
        this.saveToStorage();
        this.renderRFQList();
        this.closeNewRFQModal();
        this.showNotification('RFQ created successfully');

        // Switch to parts list for new RFQ
        this.showPartsList(newRFQ.id);
    }

    createNewRFQ() {
        this.showNewRFQModal();
    }

    editRFQ(rfqId) {
        const rfq = this.data.rfqs.find(r => r.id === rfqId);
        if (!rfq) return;

        this.currentRFQ = rfq;

        // Pre-fill modal with existing data
        document.getElementById('customer-name').value = rfq.customer.name;
        document.getElementById('customer-email').value = rfq.customer.email;
        document.getElementById('company-name').value = rfq.customer.company;
        document.getElementById('project-name').value = rfq.project.name;
        document.getElementById('shipping-address').value = rfq.shipping.address;

        this.showNewRFQModal();
        this.editingRFQId = rfqId;
    }

    deleteRFQ(rfqId) {
        if (!confirm('Are you sure you want to delete this RFQ? This action cannot be undone.')) {
            return;
        }

        // Remove RFQ and associated parts
        this.data.rfqs = this.data.rfqs.filter(rfq => rfq.id !== rfqId);
        this.data.parts = this.data.parts.filter(part => part.rfqId !== rfqId);
        
        this.saveToStorage();
        this.renderRFQList();
        this.showNotification('RFQ deleted successfully');
    }

    async submitCurrentRFQ() {
        if (!this.currentRFQ) return;

        const currentParts = this.data.parts.filter(part => part.rfqId === this.currentRFQ.id);
        
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

        // Show submission confirmation
        const confirmSubmit = confirm(
            `Submit RFQ ${this.currentRFQ.number}?\n\n` +
            `✓ Your RFQ details and all CAD files will be sent directly to our team\n` +
            `✓ You'll receive a confirmation email immediately\n` +
            `✓ We'll review and respond within 24-48 hours\n\n` +
            `Click OK to submit, or Cancel to continue editing.`
        );
        
        if (!confirmSubmit) {
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('submit-rfq-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        try {
            // Prepare RFQ data for submission
            const submissionData = await this.prepareRFQSubmission(currentParts);
            
            // Try to save to Supabase first
            let supabaseSuccess = false;
            console.log('🔍 RFQ Submission: Checking Supabase data manager...');
            console.log('DataManager available:', !!this.dataManager);
            
            if (this.dataManager) {
                console.log('📤 Attempting to save RFQ to Supabase...');
                try {
                    const result = await this.saveRFQToSupabase(submissionData);
                    if (result.success) {
                        console.log('✅ RFQ successfully saved to Supabase database');
                        supabaseSuccess = true;
                    }
                } catch (supabaseError) {
                    console.error('❌ Supabase submission failed:', supabaseError);
                    // Continue to email notifications anyway
                }
            } else {
                console.log('⚠️ No data manager available, skipping Supabase save');
            }
            
            // Send email notification regardless (for admin awareness)
            let emailResult = null;
            try {
                emailResult = await this.sendRFQToAdmin(submissionData);
            } catch (emailError) {
                console.log('Email notification failed:', emailError.message);
                // If Supabase worked, this is OK. If not, we'll handle it below.
            }
            
            // Update local status
            this.currentRFQ.status = 'submitted';
            this.currentRFQ.modified = new Date();
            this.saveToStorage();
            this.renderPartsList();
            
            // Show appropriate success message
            if (supabaseSuccess) {
                if (emailResult && emailResult.method !== 'download') {
                    this.showNotification('RFQ submitted successfully! Saved to our system and notification sent.', 'success');
                } else {
                    this.showNotification('RFQ submitted successfully! Your request has been saved to our system.', 'success');
                }
            } else if (emailResult && emailResult.method === 'download') {
                this.showNotification('RFQ packaged for manual submission. Please email the downloaded file.', 'info');
            } else if (emailResult) {
                this.showNotification('RFQ submitted successfully! You will receive a confirmation email shortly.', 'success');
            } else {
                throw new Error('All submission methods failed');
            }
            
        } catch (error) {
            console.error('Submission failed:', error);
            
            // Try emergency fallback - direct download
            try {
                const emergencyData = await this.prepareRFQSubmission(currentParts);
                this.downloadRFQData(emergencyData);
                
                this.currentRFQ.status = 'submitted';
                this.currentRFQ.modified = new Date();
                this.saveToStorage();
                this.renderPartsList();
                
                this.showNotification('RFQ saved locally and packaged for manual submission. Please email the downloaded file.', 'warning');
            } catch (emergencyError) {
                console.error('Emergency fallback failed:', emergencyError);
                this.showNotification('Submission failed. Your RFQ data is saved locally. Please contact support.', 'error');
            }
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async prepareRFQSubmission(currentParts) {
        const submissionData = {
            rfq: {
                id: this.currentRFQ.id,
                number: this.currentRFQ.number,
                customer: this.currentRFQ.customer,
                project: this.currentRFQ.project,
                shipping: this.currentRFQ.shipping,
                created: this.currentRFQ.created,
                submittedAt: new Date().toISOString()
            },
            parts: [],
            files: [],
            summary: {
                totalParts: currentParts.length,
                estimatedValue: currentParts.reduce((sum, part) => sum + (part.estimatedValue || 0), 0),
                hasCADFiles: false,
                totalFileSize: 0
            }
        };

        // Process each part
        for (const part of currentParts) {
            const partData = {
                id: part.id,
                number: part.number,
                name: part.name,
                description: part.description,
                specifications: part.specifications,
                status: part.status,
                estimatedValue: part.estimatedValue,
                fileCount: part.files.length,
                fileNames: part.files.map(f => f.name)
            };
            submissionData.parts.push(partData);

            // Process files for this part
            for (const fileRef of part.files) {
                try {
                    const storedFile = await window.fileStorage.getFile(fileRef.id);
                    if (storedFile && storedFile.file) {
                        const fileData = {
                            id: fileRef.id,
                            name: storedFile.metadata.name,
                            size: storedFile.metadata.size,
                            type: storedFile.metadata.type,
                            partId: part.id,
                            partNumber: part.number,
                            // Convert file to base64 for transmission
                            data: await this.fileToBase64(storedFile.file)
                        };
                        submissionData.files.push(fileData);
                        submissionData.summary.totalFileSize += storedFile.metadata.size;
                        
                        if (this.isCADFile(storedFile.metadata.name)) {
                            submissionData.summary.hasCADFiles = true;
                        }
                    } else {
                        console.warn(`File ${fileRef.id} not found in storage - skipping`);
                        // Add to missing files list but continue processing
                        if (!submissionData.missingFiles) {
                            submissionData.missingFiles = [];
                        }
                        submissionData.missingFiles.push({
                            id: fileRef.id,
                            name: fileRef.name || 'Unknown file',
                            partId: part.id
                        });
                    }
                } catch (error) {
                    console.warn(`Could not retrieve file ${fileRef.id}:`, error);
                    // Add to error list but continue processing
                    if (!submissionData.fileErrors) {
                        submissionData.fileErrors = [];
                    }
                    submissionData.fileErrors.push({
                        id: fileRef.id,
                        error: error.message,
                        partId: part.id
                    });
                }
            }
        }

        return submissionData;
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:mime;base64, prefix
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Save RFQ to Supabase database
     */
    async saveRFQToSupabase(submissionData) {
        if (!this.dataManager) {
            throw new Error('Supabase data manager not available');
        }

        try {
            console.log('📊 Saving RFQ to Supabase database...');
            console.log('Submission data:', submissionData);
            console.log('RFQ number from submission:', submissionData.rfq.number);
            console.log('RFQ number type:', typeof submissionData.rfq.number);

            // Sanitize all IDs to ensure they're valid UUIDs
            submissionData = this.sanitizeDataForDatabase(submissionData);

            // 1. Check if customer exists, if not create new one
            let customerId;
            let existingCustomer = null;
            
            try {
                // First, try to find existing customer by email
                existingCustomer = await this.dataManager.getCustomerByEmail(submissionData.rfq.customer.email);
            } catch (error) {
                console.log('Error checking for existing customer:', error);
            }
            
            if (existingCustomer) {
                // Use existing customer ID
                customerId = existingCustomer.id;
                console.log('Using existing customer:', customerId);
            } else {
                // Create new customer
                customerId = this.generateCustomerId(submissionData.rfq.customer);
                const customerData = {
                    id: customerId,
                    name: submissionData.rfq.customer.name,
                    email: submissionData.rfq.customer.email,
                    company: submissionData.rfq.customer.company,
                    phone: submissionData.rfq.customer.phone,
                    address: submissionData.rfq.shipping?.address || null
                };

                await this.dataManager.saveCustomer(customerData);
                console.log('Created new customer:', customerId);
            }

            // 2. Save RFQ
            const rfqUUID = submissionData.rfq.id.startsWith('RFQ-') ? this.generateUUID() : submissionData.rfq.id;
            
            // Always generate a new RFQ number for submission to avoid conflicts
            let rfqNumber;
            try {
                rfqNumber = await this.generateRFQNumber();
                console.log('Generated new RFQ number for submission:', rfqNumber);
            } catch (error) {
                console.warn('Failed to generate RFQ number from database, using fallback:', error);
                // Fallback: Generate a unique RFQ number with timestamp
                const timestamp = Date.now().toString().slice(-6);
                const year = new Date().getFullYear().toString().slice(-2);
                const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
                rfqNumber = `RFQ-${year}${month}-${timestamp}`;
            }
            
            // Final failsafe: ensure RFQ number is never null/undefined
            if (!rfqNumber || rfqNumber.trim() === '') {
                const emergencyTimestamp = Date.now().toString().slice(-8);
                rfqNumber = `RFQ-EMERGENCY-${emergencyTimestamp}`;
                console.warn('Emergency RFQ number generated:', rfqNumber);
            }

            const rfqData = {
                id: rfqUUID,
                rfq_number: rfqNumber,
                customer_id: customerId,
                customer_info: submissionData.rfq.customer, // Store customer info as backup
                title: submissionData.rfq.project?.name || 'RFQ Submission',
                description: submissionData.rfq.project?.description || 'Submitted via RFQ Panel',
                requirements: submissionData.rfq.project?.requirements || '',
                status: 'new',
                priority: 'normal',
                total_parts: submissionData.summary.totalParts || 0,
                total_quantity: submissionData.parts.reduce((sum, part) => sum + (part.specifications?.quantity || 1), 0),
                estimated_value: submissionData.summary.estimatedValue || 0,
                source: 'web_form',
                notes: [{
                    date: new Date().toISOString(),
                    user: 'System',
                    note: `Submitted via RFQ Panel. Total parts: ${submissionData.summary.totalParts}`
                }],
                timeline: [{
                    date: new Date().toISOString(),
                    action: 'RFQ Created',
                    user: 'Customer',
                    note: 'Initial submission via web form'
                }],
                submitted_at: submissionData.rfq.submittedAt || new Date().toISOString()
            };

            console.log('Final RFQ data being sent to Supabase:');
            console.log('- rfq_number:', rfqData.rfq_number);
            console.log('- rfq_number type:', typeof rfqData.rfq_number);
            console.log('- Complete RFQ data:', rfqData);

            // Try to save RFQ, handle unique constraint violations
            try {
                await this.dataManager.saveRFQ(rfqData);
            } catch (error) {
                if (error.code === '23505' && error.message.includes('rfq_number')) {
                    // RFQ number conflict, generate a new one with additional randomness
                    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
                    rfqData.rfq_number = `${rfqNumber}-${randomSuffix}`;
                    await this.dataManager.saveRFQ(rfqData);
                    console.log(`RFQ number conflict resolved, using: ${rfqData.rfq_number}`);
                } else {
                    throw error; // Re-throw if it's a different error
                }
            }

            // 3. Save parts and create part ID mapping
            const partIdMapping = {};
            const partsToSave = [];
            
            for (const part of submissionData.parts) {
                const partUUID = part.id.startsWith('PART-') ? this.generateUUID() : part.id;
                partIdMapping[part.id] = partUUID;
                
                const partData = {
                    id: partUUID,
                    name: part.name,
                    description: part.description,
                    rfq_id: rfqUUID,
                    part_number: part.number,
                    quantity: part.specifications?.quantity || 1,
                    material: part.specifications?.material || '',
                    finish: part.specifications?.surfaceFinish || '',
                    specifications: part.specifications,
                    fileIds: part.fileIds || [],
                    status: part.status,
                    estimated_value: part.estimatedValue
                };
                partsToSave.push(partData);
            }

            if (partsToSave.length > 0) {
                console.log('About to save parts to database:');
                console.log('rfqUUID:', rfqUUID);
                console.log('Parts data:', partsToSave);
                
                try {
                    await this.dataManager.saveParts(partsToSave, rfqUUID);
                    console.log('✅ Parts successfully saved to database');
                } catch (partsError) {
                    console.error('❌ Failed to save parts:', partsError);
                    throw partsError;
                }
            }
            
            // 4. Upload files and save file metadata
            if (submissionData.files && submissionData.files.length > 0) {
                for (const file of submissionData.files) {
                    try {
                        // Fix MIME type for CAD files
                        const correctedMimeType = this.getCorrectMimeType(file.name, file.type);
                        
                        // The file.data is a base64 string, so we need to convert it back to a blob
                        const blob = await (await fetch(`data:${correctedMimeType};base64,${file.data}`)).blob();
                        const fileToUpload = new File([blob], file.name, { type: correctedMimeType });

                        const partId = partIdMapping[file.partId];

                        console.log(`Uploading file: ${file.name} with MIME type: ${correctedMimeType}`);

                        // Try to upload file to Supabase storage
                        try {
                            await this.dataManager.uploadFile(
                                fileToUpload,
                                rfqUUID,
                                file.id,
                                partId
                            );
                            console.log(`✅ Successfully uploaded file: ${file.name}`);
                        } catch (uploadError) {
                            console.warn(`⚠️ File upload failed for ${file.name}, saving metadata only:`, uploadError);
                            
                            // Save file metadata even if upload fails
                            const metadata = {
                                id: file.id,
                                rfq_id: rfqUUID,
                                part_id: partId,
                                filename: file.name,
                                file_path: `failed_upload/${file.name}`,
                                file_size: file.size || 0,
                                content_type: correctedMimeType,
                                uploaded_at: new Date().toISOString(),
                                upload_status: 'failed',
                                error_message: uploadError.message
                            };
                            
                            try {
                                await this.dataManager.saveFileMetadata(metadata);
                                console.log(`✅ File metadata saved for ${file.name}`);
                            } catch (metadataError) {
                                console.error(`❌ Failed to save metadata for ${file.name}:`, metadataError);
                            }
                        }
                    } catch (fileError) {
                        console.error(`Failed to upload file ${file.name}:`, fileError);
                        // Continue with other files even if one fails
                    }
                }
            }
            
            return { success: true };

        } catch (error) {
            console.error('An error occurred during RFQ submission to Supabase:', error);
            // Re-throw to be caught by the caller
            throw new Error(`Failed to save RFQ to database: ${error.message}`);
        }
    }

    /**
     * Get correct MIME type for CAD files and other file types
     */
    getCorrectMimeType(filename, originalType) {
        const extension = filename.split('.').pop().toLowerCase();
        
        // CAD file MIME types that Supabase rfq-files bucket accepts
        const mimeTypes = {
            'stp': 'application/step',          // Supabase bucket allows this
            'step': 'application/step',         // Supabase bucket allows this
            'igs': 'application/iges',          // Supabase bucket allows this
            'iges': 'application/iges',         // Supabase bucket allows this
            'stl': 'model/stl',                 // Supabase bucket allows this
            'pdf': 'application/pdf',           // Supabase bucket allows this
            'png': 'image/png',                 // Supabase bucket allows this
            'jpg': 'image/jpeg',                // Supabase bucket allows this
            'jpeg': 'image/jpeg',               // Supabase bucket allows this
            'gif': 'image/gif',                 // Supabase bucket allows this
            'txt': 'text/plain',                // Supabase bucket allows this
            'zip': 'application/zip',           // Supabase bucket allows this
            // Remove unsupported types to avoid confusion
        };
        
        // Return specific MIME type if we know it, otherwise use original or fallback
        if (mimeTypes[extension]) {
            console.log(`MIME type corrected for ${filename}: ${originalType} → ${mimeTypes[extension]}`);
            return mimeTypes[extension];
        }
        
        // If original type is application/octet-stream, use a fallback that's allowed by Supabase
        if (originalType === 'application/octet-stream') {
            // Default to application/step for unknown CAD files
            console.log(`Fallback MIME type for ${filename}: application/octet-stream → application/step`);
            return 'application/step';
        }
        
        return originalType;
    }

    /**
     * Generate UUID v4
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Check if a string is a valid UUID format
     */
    isValidUUID(str) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    /**
     * Ensure all IDs in the data are valid UUIDs, converting old-style IDs if needed
     */
    sanitizeDataForDatabase(data) {
        const idMapping = new Map();
        
        // Helper function to ensure valid UUID
        const ensureValidUUID = (id, prefix = '') => {
            if (!id || this.isValidUUID(id)) {
                return id;
            }
            
            // If we've already mapped this ID, use the mapped version
            if (idMapping.has(id)) {
                return idMapping.get(id);
            }
            
            // Generate new UUID for old-style ID
            const newUUID = this.generateUUID();
            idMapping.set(id, newUUID);
            console.log(`Converted old-style ID "${id}" to UUID "${newUUID}"`);
            return newUUID;
        };
        
        // Sanitize RFQ ID
        if (data.rfq && data.rfq.id) {
            data.rfq.id = ensureValidUUID(data.rfq.id, 'rfq');
        }
        
        // Sanitize part IDs and file IDs
        if (data.parts) {
            data.parts.forEach(part => {
                if (part.id) {
                    part.id = ensureValidUUID(part.id, 'part');
                }
                if (part.rfqId) {
                    part.rfqId = ensureValidUUID(part.rfqId, 'rfq');
                }
                if (part.fileIds) {
                    part.fileIds = part.fileIds.map(fileId => ensureValidUUID(fileId, 'file'));
                }
            });
        }
        
        // Sanitize file IDs and partId references
        if (data.files) {
            data.files.forEach(file => {
                if (file.id) {
                    file.id = ensureValidUUID(file.id, 'file');
                }
                if (file.partId) {
                    file.partId = ensureValidUUID(file.partId, 'part');
                }
            });
        }
        
        return data;
    }

    /**
     * Generate consistent customer ID based on email (using UUID format)
     */
    generateCustomerId(customer) {
        // Check if customer already exists by email first
        const email = customer.email.toLowerCase().trim();
        
        // Create a deterministic UUID based on email
        // This ensures the same customer always gets the same ID
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            hash = ((hash << 5) - hash) + email.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Convert hash to hex and pad
        const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
        
        // Create a UUID-like format based on the hash (proper UUID format: 8-4-4-4-12)
        const timestamp = Date.now().toString(16).slice(-4); // Only use 4 chars for proper UUID format
        return `${hashHex.slice(0, 8)}-${hashHex.slice(0, 4)}-4${hashHex.slice(1, 4)}-a${hashHex.slice(0, 3)}-${hashHex}${timestamp}`;
    }

    async sendRFQToAdmin(submissionData) {
        // Option 1: EmailJS Service (Recommended for quick setup)
        try {
            if (window.emailjs) {
                await this.sendViaEmailJS(submissionData);
                return { method: 'email', success: true };
            }
        } catch (error) {
            console.log('EmailJS failed, trying fallback:', error.message);
        }
        
        // Option 2: Custom Backend API (for production)
        try {
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                const result = await this.sendViaAPI(submissionData);
                return { method: 'api', success: true, result };
            }
        } catch (error) {
            console.log('API submission failed, trying fallback:', error.message);
        }
        
        // Option 3: Fallback - Download for manual processing
        try {
            this.downloadRFQData(submissionData);
            return { method: 'download', success: true };
        } catch (error) {
            console.error('All submission methods failed:', error);
            throw new Error('All submission methods failed');
        }
    }

    async sendViaEmailJS(submissionData) {
        // Check if EmailJS is properly configured
        const config = window.emailjsConfig;
        
        // If not configured, throw error to trigger fallback
        if (!config || !config.isConfigured) {
            throw new Error('EmailJS not configured - using fallback method');
        }
        
        const serviceId = config.serviceId;
        const publicKey = config.publicKey;
        
        // Initialize EmailJS if not already done
        if (typeof emailjs !== 'undefined' && publicKey !== 'YOUR_PUBLIC_KEY') {
            emailjs.init(publicKey);
        }
        
        // Prepare email template data
        const emailData = {
            to_email: config.emails.admin,
            from_name: submissionData.rfq.customer.name,
            from_email: submissionData.rfq.customer.email,
            company: submissionData.rfq.customer.company || 'Not specified',
            rfq_number: submissionData.rfq.number,
            project_name: submissionData.rfq.project.name,
            total_parts: submissionData.summary.totalParts,
            estimated_value: `$${submissionData.summary.estimatedValue.toFixed(2)}`,
            has_cad_files: submissionData.summary.hasCADFiles ? 'Yes' : 'No',
            total_file_size: this.formatFileSize(submissionData.summary.totalFileSize),
            
            // Create detailed parts list
            parts_summary: submissionData.parts.map(part => 
                `Part ${part.number}: ${part.name}\n` +
                `- Quantity: ${part.specifications.quantity}\n` +
                `- Material: ${part.specifications.material || 'Not specified'}\n` +
                `- Files: ${part.fileNames.join(', ') || 'None'}\n`
            ).join('\n'),
            
            // Complete RFQ data as JSON for admin processing
            rfq_data: JSON.stringify(submissionData, null, 2),
            
            // File and error information
            files_note: submissionData.files.length > 0 ? 
                `${submissionData.files.length} files attached.` :
                'No files attached.',
            
            missing_files: submissionData.missingFiles ? 
                submissionData.missingFiles.map(f => f.name).join(', ') : 'None',
            
            file_errors: submissionData.fileErrors ? 
                submissionData.fileErrors.map(e => `${e.id}: ${e.error}`).join('; ') : 'None',
            
            submission_date: new Date().toLocaleDateString(),
            submission_time: new Date().toLocaleTimeString(),
            shipping_address: submissionData.rfq.shipping.address || 'Not provided'
        };

        try {
            // Send main notification email
            const adminResult = await emailjs.send(serviceId, config.templateIds.admin, emailData);
            console.log('Admin notification sent:', adminResult);
            
            // Send confirmation email to customer
            const confirmationData = {
                to_email: submissionData.rfq.customer.email,
                customer_name: submissionData.rfq.customer.name,
                rfq_number: submissionData.rfq.number,
                project_name: submissionData.rfq.project.name,
                total_parts: submissionData.summary.totalParts,
                submission_date: new Date().toLocaleDateString(),
                expected_response: '2-3 business days',
                admin_contact: config.emails.admin
            };
            
            const customerResult = await emailjs.send(serviceId, config.templateIds.customer, confirmationData);
            console.log('Customer confirmation sent:', customerResult);
            
        } catch (error) {
            console.error('EmailJS send failed:', error);
            throw error; // Re-throw to trigger fallback
        }
    }

    async sendViaAPI(submissionData) {
        // Placeholder for future backend API implementation
        // For now, this would send to your server endpoint
        const response = await fetch('/api/rfq/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(submissionData)
        });
        
        if (!response.ok) {
            throw new Error(`API submission failed: ${response.status}`);
        }
        
        return await response.json();
    }

    async handleFileSubmission(submissionData) {
        // For files under 10MB total, attach to email
        if (submissionData.summary.totalFileSize < 10 * 1024 * 1024) {
            const fileEmailData = {
                to_email: 'admin@tobroweb3.com',
                rfq_number: submissionData.rfq.number,
                customer_name: submissionData.rfq.customer.name,
                files_data: JSON.stringify(submissionData.files)
            };
            
            await emailjs.send('YOUR_SERVICE_ID', 'rfq_files_template', fileEmailData);
        } else {
            // For larger files, use file hosting service or provide download package
            await this.createFilePackage(submissionData);
        }
    }

    async createFilePackage(submissionData) {
        // Create a downloadable package for the admin
        const packageData = {
            rfq: submissionData.rfq,
            parts: submissionData.parts,
            files: submissionData.files,
            generatedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link and auto-download
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `RFQ-${submissionData.rfq.number}-package.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        // Notify admin that package is ready
        const packageEmailData = {
            to_email: 'admin@tobroweb3.com',
            rfq_number: submissionData.rfq.number,
            customer_name: submissionData.rfq.customer.name,
            package_note: 'Large file package generated. Customer will be instructed to send files via secure file transfer.'
        };
        
        await emailjs.send('YOUR_SERVICE_ID', 'rfq_package_template', packageEmailData);
        
        // Show instructions to customer for large files
        this.showLargeFileInstructions(submissionData.rfq.number);
    }

    showLargeFileInstructions(rfqNumber) {
        const instructionsModal = document.createElement('div');
        instructionsModal.className = 'modal';
        instructionsModal.style.display = 'flex';
        instructionsModal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-info-circle"></i> Large Files Instructions</h3>
                </div>
                <div class="modal-body">
                    <p>Your RFQ <strong>${rfqNumber}</strong> has been submitted successfully!</p>
                    <p>Due to large file sizes, please send your CAD files via:</p>
                    <ul style="text-align: left; margin: 1rem 0;">
                        <li>Email: files@tobroweb3.com</li>
                        <li>WeTransfer, Dropbox, or Google Drive</li>
                        <li>Reference RFQ number: <strong>${rfqNumber}</strong></li>
                    </ul>
                    <p>We'll contact you within 24 hours to confirm receipt and discuss your project.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-check"></i> Understood
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(instructionsModal);
    }

    downloadRFQData(submissionData) {
        // Enhanced fallback method - download comprehensive RFQ package
        const packageData = {
            ...submissionData,
            downloadInfo: {
                generatedAt: new Date().toISOString(),
                instructions: 'Email this file to sales@tobrotech.com with subject: RFQ Submission - ' + submissionData.rfq.number,
                version: '2.0'
            }
        };
        
        const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `RFQ-${submissionData.rfq.number}-${Date.now()}.json`;
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        // Show enhanced instructions modal
        this.showDownloadInstructions(submissionData.rfq.number);
    }

    showDownloadInstructions(rfqNumber) {
        const instructionsModal = document.createElement('div');
        instructionsModal.className = 'modal';
        instructionsModal.style.display = 'flex';
        instructionsModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> RFQ Package Downloaded</h3>
                </div>
                <div class="modal-body">
                    <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h4 style="color: #1976d2; margin-top: 0;">📁 Next Steps</h4>
                        <p><strong>RFQ Number:</strong> ${rfqNumber}</p>
                        <p>Your RFQ has been packaged and downloaded. To complete your submission:</p>
                        <ol style="margin: 15px 0;">
                            <li><strong>Locate the downloaded file</strong> on your computer</li>
                            <li><strong>Email it to:</strong> <a href="mailto:sales@tobrotech.com?subject=RFQ Submission - ${rfqNumber}">sales@tobrotech.com</a></li>
                            <li><strong>Subject:</strong> RFQ Submission - ${rfqNumber}</li>
                            <li><strong>Include a brief message</strong> about your project requirements</li>
                        </ol>
                    </div>
                    <div style="background: #f5f5f5; border-radius: 8px; padding: 15px;">
                        <h4 style="margin-top: 0;">📞 Need Help?</h4>
                        <p>If you have questions or need assistance:</p>
                        <ul>
                            <li><strong>Email:</strong> sales@tobrotech.com</li>
                            <li><strong>Phone:</strong> (555) 123-4567</li>
                            <li><strong>Response Time:</strong> Within 24-48 hours</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove(); window.open('mailto:sales@tobrotech.com?subject=RFQ Submission - ${rfqNumber}', '_blank');">
                        <i class="fas fa-envelope"></i> Open Email
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">
                        <i class="fas fa-check"></i> Got it!
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(instructionsModal);
    }

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
            fileIds: [],
            specifications: {
                quantity: 1,
                material: '',
                materialCondition: '',
                toleranceUnit: 'inches',
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

        this.data.parts.push(newPart);
        this.currentRFQ.partsCount = this.data.parts.filter(p => p.rfqId === this.currentRFQ.id).length;
        this.saveToStorage();
        this.renderPartsList();
        this.showPartDetails(newPart.id);
    }

    duplicatePart(partId) {
        const originalPart = this.data.parts.find(p => p.id === partId);
        if (!originalPart) return;

        const newPart = JSON.parse(JSON.stringify(originalPart));
        newPart.id = this.generateId();
        newPart.number = this.generatePartNumber();
        newPart.name = `${originalPart.name} (Copy)`;
        
        // Files need special handling - they are not serialized
        newPart.files = []; 
        newPart.fileIds = [];

        this.data.parts.push(newPart);
        this.saveToStorage();
        this.renderPartsList();
        this.showNotification('Part duplicated successfully');
    }

    deletePart(partId) {
        if (!confirm('Are you sure you want to delete this part?')) {
            return;
        }

        this.data.parts = this.data.parts.filter(part => part.id !== partId);
        if (this.currentRFQ) {
            this.currentRFQ.partsCount = this.data.parts.filter(p => p.rfqId === this.currentRFQ.id).length;
        }
        this.saveToStorage();
        this.renderPartsList();
        this.showNotification('Part deleted successfully');
    }

    // Summary and utility methods
    updateRFQSummary() {
        const totalPartsElem = document.getElementById('total-parts-count');
        const estimatedValueElem = document.getElementById('estimated-value');
        const maxLeadTimeElem = document.getElementById('max-lead-time');
        const deliveryAddressElem = document.getElementById('delivery-address');

        if (!this.currentRFQ) return;

        const currentParts = this.data.parts.filter(part => part.rfqId === this.currentRFQ.id);
        const totalParts = currentParts.length;
        const totalValue = currentParts.reduce((sum, part) => sum + (part.estimatedValue || 0), 0);

        if (totalPartsElem) totalPartsElem.textContent = totalParts;
        if (estimatedValueElem) estimatedValueElem.textContent = `$${totalValue.toFixed(2)}`;
        if (maxLeadTimeElem) maxLeadTimeElem.textContent = this.currentRFQ.shipping?.priority || 'TBD';
        if (deliveryAddressElem) deliveryAddressElem.textContent = this.currentRFQ.shipping?.address || 'Not specified';
    }

    async generateRFQNumber() {
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        
        let sequences = [];
        if (this.dataManager) {
            sequences = await this.dataManager.getRFQSequencesForMonth();
        }
        
        // Also check local data as fallback
        const localSequences = this.data.rfqs
            .filter(rfq => rfq.number && rfq.number.startsWith(`RFQ-${year}${month}-`))
            .map(rfq => {
                const parts = rfq.number.split('-');
                return parts.length === 3 ? parseInt(parts[2], 10) : 0;
            });
            
        sequences = sequences.concat(localSequences);

        const maxSequence = sequences.length > 0 ? Math.max(...sequences) : 0;
        const sequence = (maxSequence + 1).toString().padStart(3, '0');
        return `RFQ-${year}${month}-${sequence}`;
    }

    generatePartNumber() {
        const totalParts = this.data.parts.length;
        return `P${(totalParts + 1).toString().padStart(3, '0')}`;
    }

    savePartSpecifications(event) {
        if (event) event.preventDefault();
        
        if (!this.currentPart) {
            this.showNotification('No part selected', 'error');
            return;
        }

        // Get all form values
        const formData = {
            name: document.getElementById('part-name')?.value || this.currentPart.name,
            description: document.getElementById('part-description')?.value || '',
            quantity: parseInt(document.getElementById('part-quantity')?.value) || 1,
            requiredDelivery: document.getElementById('required-delivery')?.value || '',
            priority: document.getElementById('priority-level')?.value || 'standard',
            material: document.getElementById('material-type')?.value || '',
            materialCondition: document.getElementById('material-condition')?.value || '',
            toleranceUnit: document.getElementById('tolerance-unit')?.value || 'inches',
            tolerance: document.getElementById('general-tolerance')?.value || 'standard',
            criticalDimensions: document.getElementById('critical-dimensions')?.value || '',
            surfaceFinish: document.getElementById('surface-finish')?.value || 'standard',
            coating: document.getElementById('coating-finish')?.value || '',
            as9100d: document.getElementById('as9100d-required')?.checked || false,
            materialCerts: document.getElementById('material-certs')?.checked || false,
            inspectionReport: document.getElementById('inspection-report')?.checked || false,
            firstArticle: document.getElementById('first-article')?.checked || false,
            specialInstructions: document.getElementById('special-instructions')?.value || ''
        };

        // Update current part
        this.currentPart.name = formData.name;
        this.currentPart.description = formData.description;
        this.currentPart.specifications = {
            ...this.currentPart.specifications,
            ...formData
        };

        // Update status based on completion
        const isConfigured = formData.material && formData.tolerance && formData.surfaceFinish;
        this.currentPart.status = isConfigured ? 'configured' : 'pending';

        this.saveToStorage();
        this.showNotification('Part specifications saved successfully', 'success');
        
        // Update the parts list view if we're still in part details
        this.renderPartDetails();
    }

    // Filter and search methods
    filterRFQs(searchTerm) {
        // This would filter the RFQ list based on search term
        console.log('Filtering RFQs by:', searchTerm);
        // Implement filtering logic here
        this.renderRFQList();
    }

    filterRFQsByStatus(status) {
        // This would filter the RFQ list based on status
        console.log('Filtering RFQs by status:', status);
        // Implement status filtering logic here
        this.renderRFQList();
    }
    
    async updateStorageStatus() {
        try {
            if (!window.fileStorage) return;
            
            const storageInfo = await window.fileStorage.getStorageInfo();
            const statusElement = document.getElementById('storage-status');
            const usedElement = document.getElementById('storage-used');
            const totalElement = document.getElementById('storage-total');
            
            if (statusElement && usedElement && totalElement) {
                usedElement.textContent = window.fileStorage.formatStorageSize(storageInfo.used);
                totalElement.textContent = window.fileStorage.formatStorageSize(storageInfo.total);
                
                // Show storage status if there's any usage
                if (storageInfo.used > 0) {
                    statusElement.style.display = 'block';
                } else {
                    statusElement.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error updating storage status:', error);
        }
    }

    // Tolerance unit switching functionality
    setupToleranceUnitSwitching() {
        const toleranceUnitSelect = document.getElementById('tolerance-unit');
        const generalToleranceSelect = document.getElementById('general-tolerance');
        
        if (toleranceUnitSelect && generalToleranceSelect) {
            toleranceUnitSelect.addEventListener('change', (e) => {
                this.switchToleranceUnit(e.target.value);
            });
            
            // Initialize with default state (inches)
            this.switchToleranceUnit('inches');
        }
    }

    switchToleranceUnit(unit) {
        const generalToleranceSelect = document.getElementById('general-tolerance');
        const inchesGroup = document.getElementById('tolerance-inches');
        const mmGroup = document.getElementById('tolerance-mm');
        
        if (!generalToleranceSelect || !inchesGroup || !mmGroup) return;

        // Clear current selection
        generalToleranceSelect.value = '';

        if (unit === 'inches') {
            // Show inches, hide mm
            inchesGroup.style.display = '';
            mmGroup.style.display = 'none';
            
            // Enable/disable options
            Array.from(inchesGroup.children).forEach(option => option.disabled = false);
            Array.from(mmGroup.children).forEach(option => option.disabled = true);
        } else if (unit === 'mm') {
            // Show mm, hide inches
            inchesGroup.style.display = 'none';
            mmGroup.style.display = '';
            
            // Enable/disable options
            Array.from(inchesGroup.children).forEach(option => option.disabled = true);
            Array.from(mmGroup.children).forEach(option => option.disabled = false);
        }
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rfqPanel = new RFQPanelSystem();
}); 