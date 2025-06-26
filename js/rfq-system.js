/*=============== RFQ SYSTEM ===============*/

class RFQSystem {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.uploadedFiles = [];
        this.formData = {};
        this.uploadType = 'cad'; // 'cad', 'drawings', or 'mixed'
        this.partSpecifications = {}; // Store specifications for each part
        this.currentlyViewingFile = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStepDisplay();
    }

    bindEvents() {
        // Step navigation
        document.getElementById('rfq-next').addEventListener('click', () => this.nextStep());
        document.getElementById('rfq-prev').addEventListener('click', () => this.prevStep());
        document.getElementById('rfq-submit').addEventListener('click', () => this.submitRFQ());

        // Upload type selection
        this.bindUploadTypeSelector();

        // File upload
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('file-upload-area');

        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag and drop
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        // Form inputs
        this.bindFormInputs();
        this.bindSpecificationActions();
    }

    bindFormInputs() {
        // Material selection
        document.getElementById('material-select').addEventListener('change', (e) => {
            this.formData.material = e.target.value;
        });

        // Quantity
        document.getElementById('quantity').addEventListener('input', (e) => {
            this.formData.quantity = parseInt(e.target.value);
        });

        // Tolerance
        document.getElementById('tolerance').addEventListener('change', (e) => {
            this.formData.tolerance = e.target.value;
        });

        // Surface finish
        document.getElementById('surface-finish').addEventListener('change', (e) => {
            this.formData.surfaceFinish = e.target.value;
        });

        // Delivery date
        document.getElementById('delivery-date').addEventListener('change', (e) => {
            this.formData.deliveryDate = e.target.value;
        });

        // Special requirements
        document.getElementById('special-requirements').addEventListener('input', (e) => {
            this.formData.specialRequirements = e.target.value;
        });

        // Contact information
        document.getElementById('contact-name').addEventListener('input', (e) => {
            this.formData.contactName = e.target.value;
        });

        document.getElementById('contact-email').addEventListener('input', (e) => {
            this.formData.contactEmail = e.target.value;
        });

        document.getElementById('contact-phone').addEventListener('input', (e) => {
            this.formData.contactPhone = e.target.value;
        });

        document.getElementById('company-name').addEventListener('input', (e) => {
            this.formData.companyName = e.target.value;
        });

        document.getElementById('project-type').addEventListener('change', (e) => {
            this.formData.projectType = e.target.value;
        });

        // Checkboxes
        document.getElementById('as9100d-required').addEventListener('change', (e) => {
            this.formData.as9100dRequired = e.target.checked;
        });

        document.getElementById('inspection-report').addEventListener('change', (e) => {
            this.formData.inspectionReport = e.target.checked;
        });

        document.getElementById('material-certs').addEventListener('change', (e) => {
            this.formData.materialCerts = e.target.checked;
        });
    }

    bindUploadTypeSelector() {
        const uploadOptions = document.querySelectorAll('.upload-option');
        uploadOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Update active state
                uploadOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Update upload type
                this.uploadType = option.dataset.type;
                this.updateUploadInterface();
            });
        });
    }

    updateUploadInterface() {
        const uploadTitle = document.getElementById('upload-title');
        const uploadDescription = document.getElementById('upload-description');
        const currentFormats = document.getElementById('current-formats');
        const fileInput = document.getElementById('file-input');

        switch (this.uploadType) {
            case 'cad':
                uploadTitle.textContent = 'Upload Your CAD Files';
                uploadDescription.textContent = '3D models for precision CNC machining';
                currentFormats.innerHTML = `
                    <span class="format-tag">STEP</span>
                    <span class="format-tag">IGES</span>
                    <span class="format-tag">STL</span>
                    <span class="format-tag">SolidWorks</span>
                    <span class="format-tag">DWG</span>
                `;
                fileInput.accept = '.step,.stp,.iges,.igs,.stl,.dwg,.solidworks,.x_t,.x_b,.obj,.3mf,.ply';
                break;
            case 'drawings':
                uploadTitle.textContent = 'Upload Technical Drawings';
                uploadDescription.textContent = '2D drawings with dimensions, tolerances & specifications';
                currentFormats.innerHTML = `
                    <span class="format-tag">PDF</span>
                    <span class="format-tag">DWG</span>
                    <span class="format-tag">DXF</span>
                    <span class="format-tag">JPG/PNG</span>
                `;
                fileInput.accept = '.pdf,.dxf,.dwg,.jpg,.jpeg,.png,.tiff,.bmp';
                break;
            case 'mixed':
                uploadTitle.textContent = 'Upload CAD Files & Drawings';
                uploadDescription.textContent = 'Mix of 3D models and technical drawings';
                currentFormats.innerHTML = `
                    <span class="format-tag">All CAD Formats</span>
                    <span class="format-tag">All Drawing Formats</span>
                `;
                fileInput.accept = '.step,.stp,.iges,.igs,.stl,.dwg,.solidworks,.x_t,.x_b,.pdf,.dxf,.jpg,.jpeg,.png';
                break;
        }
    }

    bindSpecificationActions() {
        // Bulk action buttons
        document.getElementById('apply-to-all-material').addEventListener('click', () => {
            this.applyToAllParts('material');
        });
        
        document.getElementById('apply-to-all-tolerance').addEventListener('click', () => {
            this.applyToAllParts('tolerance');
        });
        
        document.getElementById('apply-to-all-finish').addEventListener('click', () => {
            this.applyToAllParts('surfaceFinish');
        });
    }

    applyToAllParts(property) {
        // Get value from first part or show modal to select value
        const firstPart = Object.keys(this.partSpecifications)[0];
        if (!firstPart || !this.partSpecifications[firstPart][property]) {
            this.showError(`Please set ${property} for at least one part first`);
            return;
        }
        
        const value = this.partSpecifications[firstPart][property];
        
        // Apply to all parts
        Object.keys(this.partSpecifications).forEach(partId => {
            this.partSpecifications[partId][property] = value;
            const element = document.getElementById(`${property}-${partId}`);
            if (element) {
                element.value = value;
            }
        });
        
        this.showSuccess(`Applied ${property} to all parts`);
    }

    generatePartSpecifications() {
        const container = document.getElementById('parts-specifications');
        if (!container) return;

        container.innerHTML = '';

        this.uploadedFiles.forEach((file, index) => {
            // Initialize part specification if it doesn't exist
            if (!this.partSpecifications[file.id]) {
                this.partSpecifications[file.id] = {
                    material: '',
                    quantity: 1,
                    tolerance: 'standard',
                    surfaceFinish: 'standard',
                    notes: ''
                };
            }

            const partCard = this.createPartSpecificationCard(file, index);
            container.appendChild(partCard);
        });
    }

    createPartSpecificationCard(fileObj, index) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'part-spec-card';
        cardDiv.setAttribute('data-file-id', fileObj.id);

        const isCADFile = ['STEP', 'IGES', 'STL', 'SolidWorks', 'Parasolid', 'OBJ', '3MF', 'PLY'].includes(fileObj.type);
        const iconClass = this.getFileIcon(fileObj.type);

        cardDiv.innerHTML = `
            <div class="part-spec-header">
                <div class="part-spec-info">
                    <div class="part-spec-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="part-spec-details">
                        <h4>${this.truncateFileName(fileObj.name, 30)}</h4>
                        <div class="part-spec-meta">
                            ${fileObj.type} • ${fileObj.size} ${isCADFile ? '• 3D Model' : '• Drawing/Document'}
                        </div>
                    </div>
                </div>
                <button class="part-spec-toggle" onclick="rfqSystem.togglePartSpec('${fileObj.id}')">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="part-spec-content" id="spec-content-${fileObj.id}">
                <div class="spec-section">
                    <h5><i class="fas fa-atom"></i> Material & Quantity</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="material-${fileObj.id}">Material</label>
                            <select id="material-${fileObj.id}" class="form-control" onchange="rfqSystem.updatePartSpec('${fileObj.id}', 'material', this.value)">
                                <option value="">Select Material</option>
                                <option value="aluminum-6061">Aluminum 6061</option>
                                <option value="aluminum-7075">Aluminum 7075</option>
                                <option value="stainless-304">Stainless Steel 304</option>
                                <option value="stainless-316">Stainless Steel 316</option>
                                <option value="titanium-6al4v">Titanium 6Al-4V</option>
                                <option value="inconel-625">Inconel 625</option>
                                <option value="brass">Brass</option>
                                <option value="copper">Copper</option>
                                <option value="other">Other (specify in notes)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="quantity-${fileObj.id}">Quantity</label>
                            <input type="number" id="quantity-${fileObj.id}" class="form-control" min="1" value="1" 
                                onchange="rfqSystem.updatePartSpec('${fileObj.id}', 'quantity', parseInt(this.value))">
                        </div>
                    </div>
                </div>

                <div class="spec-section">
                    <h5><i class="fas fa-ruler"></i> Precision & Finish</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tolerance-${fileObj.id}">Tolerance Requirements</label>
                            <select id="tolerance-${fileObj.id}" class="form-control" onchange="rfqSystem.updatePartSpec('${fileObj.id}', 'tolerance', this.value)">
                                <option value="standard">Standard (±0.005")</option>
                                <option value="precision">Precision (±0.002")</option>
                                <option value="high-precision">High Precision (±0.0005")</option>
                                <option value="ultra-precision">Ultra Precision (±0.0001")</option>
                                <option value="custom">Custom (specify in notes)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="surface-finish-${fileObj.id}">Surface Finish</label>
                            <select id="surface-finish-${fileObj.id}" class="form-control" onchange="rfqSystem.updatePartSpec('${fileObj.id}', 'surfaceFinish', this.value)">
                                <option value="standard">Standard (125 µin Ra)</option>
                                <option value="smooth">Smooth (63 µin Ra)</option>
                                <option value="precision">Precision (32 µin Ra)</option>
                                <option value="mirror">Mirror (16 µin Ra)</option>
                                <option value="custom">Custom (specify)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="spec-section">
                    <h5><i class="fas fa-sticky-note"></i> Part-Specific Notes</h5>
                    <div class="form-group">
                        <textarea id="notes-${fileObj.id}" class="form-control" rows="3" 
                            placeholder="Any special requirements for this specific part..."
                            onchange="rfqSystem.updatePartSpec('${fileObj.id}', 'notes', this.value)"></textarea>
                    </div>
                </div>

                ${!isCADFile ? `
                <div class="spec-section">
                    <h5><i class="fas fa-info-circle"></i> Drawing Information</h5>
                    <p class="drawing-note">
                        <i class="fas fa-lightbulb"></i>
                        This is a technical drawing. Please ensure all dimensions, tolerances, and specifications are clearly visible in the uploaded file.
                        Our engineering team will review and may contact you for clarification if needed.
                    </p>
                </div>
                ` : ''}
            </div>
        `;

        return cardDiv;
    }

    togglePartSpec(fileId) {
        const content = document.getElementById(`spec-content-${fileId}`);
        const toggle = content.parentElement.querySelector('.part-spec-toggle i');
        
        content.classList.toggle('collapsed');
        if (content.classList.contains('collapsed')) {
            toggle.className = 'fas fa-chevron-right';
        } else {
            toggle.className = 'fas fa-chevron-down';
        }
    }

    updatePartSpec(fileId, property, value) {
        if (!this.partSpecifications[fileId]) {
            this.partSpecifications[fileId] = {};
        }
        this.partSpecifications[fileId][property] = value;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('file-upload-area').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('file-upload-area').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('file-upload-area').classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        this.handleFiles(files);
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (this.isValidFileType(file)) {
                this.uploadedFiles.push({
                    file: file,
                    id: Date.now() + Math.random(),
                    name: file.name,
                    size: this.formatFileSize(file.size),
                    type: this.getFileType(file.name),
                    uploaded: false
                });
            } else {
                this.showError(`File type not supported: ${file.name}`);
            }
        });

        this.updateFileList();
        
        if (this.uploadedFiles.length > 0) {
            this.showUploadedFiles();
        }
    }

    isValidFileType(file) {
        const cadExtensions = [
            '.step', '.stp', '.iges', '.igs', '.stl', 
            '.dwg', '.solidworks', '.x_t', '.x_b',
            '.obj', '.3mf', '.ply'
        ];
        
        const drawingExtensions = [
            '.pdf', '.dxf', '.dwg', '.jpg', '.jpeg', '.png', '.tiff', '.bmp'
        ];
        
        const fileName = file.name.toLowerCase();
        
        if (this.uploadType === 'cad') {
            return cadExtensions.some(ext => fileName.endsWith(ext));
        } else if (this.uploadType === 'drawings') {
            return drawingExtensions.some(ext => fileName.endsWith(ext));
        } else { // mixed
            return [...cadExtensions, ...drawingExtensions].some(ext => fileName.endsWith(ext));
        }
    }

    getFileType(fileName) {
        const ext = fileName.toLowerCase().split('.').pop();
        const typeMap = {
            'step': 'STEP',
            'stp': 'STEP',
            'iges': 'IGES',
            'igs': 'IGES',
            'stl': 'STL',
            'dwg': 'DWG',
            'dxf': 'DXF',
            'solidworks': 'SolidWorks',
            'x_t': 'Parasolid',
            'x_b': 'Parasolid',
            'obj': 'OBJ',
            '3mf': '3MF',
            'ply': 'PLY',
            'pdf': 'PDF',
            'jpg': 'Image',
            'jpeg': 'Image',
            'png': 'Image',
            'tiff': 'Image',
            'bmp': 'Image'
        };
        return typeMap[ext] || 'Unknown';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateFileList() {
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';

        // Add bulk operations header if multiple files
        if (this.uploadedFiles.length > 1) {
            const bulkHeader = this.createBulkOperationsHeader();
            fileList.appendChild(bulkHeader);
        }

        this.uploadedFiles.forEach(fileObj => {
            const fileElement = this.createFileElement(fileObj);
            fileList.appendChild(fileElement);
        });

        // Update file counter
        this.updateFileCounter();
        
        // Update gallery if we're on step 2
        if (this.currentStep === 2) {
            this.createFileGallery();
        }
    }

    createBulkOperationsHeader() {
        const headerDiv = document.createElement('div');
        headerDiv.className = 'bulk-operations';
        headerDiv.innerHTML = `
            <div class="bulk-header">
                <div class="file-summary">
                    <span class="file-count">${this.uploadedFiles.length} files</span>
                    <span class="total-size">${this.getTotalFileSize()}</span>
                </div>
                <div class="bulk-actions">
                    <button class="btn-secondary" onclick="rfqSystem.selectAllFiles()" title="Select All">
                        <i class="fas fa-check-square"></i> Select All
                    </button>
                    <button class="btn-secondary" onclick="rfqSystem.processAllFiles()" title="Process All">
                        <i class="fas fa-play"></i> Process All
                    </button>
                    <button class="btn-danger" onclick="rfqSystem.removeAllFiles()" title="Remove All">
                        <i class="fas fa-trash"></i> Clear All
                    </button>
                </div>
            </div>
        `;
        return headerDiv;
    }

    getTotalFileSize() {
        const totalBytes = this.uploadedFiles.reduce((sum, file) => sum + file.file.size, 0);
        return this.formatFileSize(totalBytes);
    }

    updateFileCounter() {
        // Update upload area text when files are present
        const uploadText = document.querySelector('#file-upload-area .upload-text');
        if (uploadText && this.uploadedFiles.length > 0) {
            uploadText.innerHTML = `
                <i class="fas fa-check-circle text-success"></i>
                <span>${this.uploadedFiles.length} file${this.uploadedFiles.length !== 1 ? 's' : ''} uploaded</span>
                <small>Drop more files or click to add additional files</small>
            `;
        }
    }

    selectAllFiles() {
        // Toggle selection for all files
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.toggle('selected');
        });
    }

    async processAllFiles() {
        // Process all files that haven't been processed yet
        const unprocessedFiles = this.uploadedFiles.filter(f => !f.uploaded);
        
        if (unprocessedFiles.length === 0) {
            this.showSuccess('All files are already processed!');
            return;
        }

        for (let i = 0; i < unprocessedFiles.length; i++) {
            const file = unprocessedFiles[i];
            try {
                // Simulate processing
                await new Promise(resolve => setTimeout(resolve, 500));
                file.uploaded = true;
                this.updateFileList();
                
                // Show progress
                const progress = Math.round(((i + 1) / unprocessedFiles.length) * 100);
                this.showProcessingProgress(progress, file.name);
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
            }
        }

        this.showSuccess(`Successfully processed ${unprocessedFiles.length} files!`);
    }

    showProcessingProgress(percentage, fileName) {
        // Create or update progress notification
        let progressElement = document.querySelector('.processing-progress');
        if (!progressElement) {
            progressElement = document.createElement('div');
            progressElement.className = 'processing-progress notification info';
            document.body.appendChild(progressElement);
        }

        progressElement.innerHTML = `
            <div class="progress-content">
                <div class="progress-text">
                    <i class="fas fa-cog fa-spin"></i>
                    Processing: ${fileName}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-percentage">${percentage}%</div>
            </div>
        `;

        if (percentage >= 100) {
            setTimeout(() => {
                if (progressElement) {
                    progressElement.remove();
                }
            }, 2000);
        }
    }

    removeAllFiles() {
        if (this.uploadedFiles.length === 0) return;
        
        if (confirm(`Are you sure you want to remove all ${this.uploadedFiles.length} files?`)) {
            this.uploadedFiles = [];
            this.updateFileList();
            this.hideUploadedFiles();
            
            // Reset upload area text
            const uploadText = document.querySelector('#file-upload-area .upload-text');
            if (uploadText) {
                uploadText.innerHTML = `
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Drop CAD files here or click to browse</span>
                    <small>STEP, IGES, STL, DWG, SolidWorks files supported</small>
                `;
            }
            
            this.showSuccess('All files removed successfully');
        }
    }

    bindGalleryKeyboardNavigation() {
        // Add keyboard navigation for gallery
        document.addEventListener('keydown', (e) => {
            if (this.currentStep !== 2 || this.uploadedFiles.length <= 1) return;
            
            const currentIndex = this.uploadedFiles.findIndex(f => f.id == this.currentlyViewingFile); // Use loose equality
            
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                this.viewFile(this.uploadedFiles[currentIndex - 1].id);
            } else if (e.key === 'ArrowRight' && currentIndex < this.uploadedFiles.length - 1) {
                e.preventDefault();
                this.viewFile(this.uploadedFiles[currentIndex + 1].id);
            }
        });
    }

    createFileElement(fileObj) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.setAttribute('data-file-id', fileObj.id);
        
        // Get appropriate icon based on file type
        const iconClass = this.getFileIcon(fileObj.type);
        
        fileDiv.innerHTML = `
            <div class="file-info">
                <div class="file-icon ${fileObj.type.toLowerCase()}">
                    <i class="${iconClass}"></i>
                    <span class="file-type-badge">${fileObj.type}</span>
                </div>
                <div class="file-details">
                    <h5 title="${fileObj.name}">${this.truncateFileName(fileObj.name, 25)}</h5>
                    <div class="file-meta">
                        <span class="file-size">${fileObj.size}</span>
                        <span class="file-status ${fileObj.uploaded ? 'processed' : 'pending'}">
                            <i class="fas ${fileObj.uploaded ? 'fa-check-circle' : 'fa-clock'}"></i>
                            ${fileObj.uploaded ? 'Processed' : 'Pending'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="file-actions">
                <button class="file-action view-btn" onclick="rfqSystem.viewFile('${fileObj.id}')" title="View in 3D">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="file-action download-btn" onclick="rfqSystem.downloadFile('${fileObj.id}')" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                <button class="file-action danger remove-btn" onclick="rfqSystem.removeFile('${fileObj.id}')" title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        return fileDiv;
    }

    getFileIcon(fileType) {
        const iconMap = {
            'STEP': 'fas fa-cube',
            'IGES': 'fas fa-shapes',
            'STL': 'fas fa-print',
            'DWG': 'fas fa-drafting-compass',
            'SolidWorks': 'fas fa-cog',
            'Parasolid': 'fas fa-vector-square',
            'OBJ': 'fas fa-object-group',
            '3MF': 'fas fa-layer-group',
            'PLY': 'fas fa-mountain'
        };
        return iconMap[fileType] || 'fas fa-file';
    }

    truncateFileName(fileName, maxLength) {
        if (fileName.length <= maxLength) return fileName;
        const extension = fileName.split('.').pop();
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...';
        return truncatedName + '.' + extension;
    }

    downloadFile(fileId) {
        const fileObj = this.uploadedFiles.find(f => f.id == fileId);
        if (fileObj) {
            // Create download link
            const url = URL.createObjectURL(fileObj.file);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileObj.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    viewFile(fileId) {
        const fileObj = this.uploadedFiles.find(f => f.id == fileId);
        if (fileObj) {
            // Initialize CAD viewer if not already done
            if (!window.CADViewer) {
                window.CADViewer = new CADViewer();
            }
            
            // Mark file as currently viewing - ensure consistent type
            this.currentlyViewingFile = fileObj.id; // Use the actual ID from the found object
            this.updateFileGallery();
            
            // Show loading notification
            if (window.CADViewer.showNotification) {
                window.CADViewer.showNotification(`Loading ${fileObj.name}...`, 'info');
            }
            
            // Load the file
            setTimeout(() => {
                window.CADViewer.loadFile(fileObj.file);
                // Mark as processed after loading
                fileObj.uploaded = true;
                this.updateFileList();
                this.updateFileGallery();
                
                // Show success notification
                if (window.CADViewer.showNotification) {
                    window.CADViewer.showNotification(`Now viewing: ${fileObj.name}`, 'success');
                }
            }, 100);
            
            // If not already on step 2, move there
            if (this.currentStep === 1) {
                this.nextStep();
            } else if (this.currentStep === 2) {
                // We're already on step 2, make sure gallery is visible
                this.createFileGallery();
            }
        }
    }

    updateFileGallery() {
        // Create or update file gallery in step 2
        const galleryContainer = document.querySelector('#step-2 .file-gallery');
        if (!galleryContainer) {
            this.createFileGallery();
            return;
        }

        // Update gallery items
        const galleryItems = galleryContainer.querySelectorAll('.gallery-item');
        galleryItems.forEach(item => {
            const fileId = item.dataset.fileId;
            if (fileId == this.currentlyViewingFile) { // Use loose equality to handle string/number comparison
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update current part name and index
        const currentPartNameElement = document.getElementById('current-part-name');
        if (currentPartNameElement) {
            currentPartNameElement.textContent = this.getCurrentPartName();
        }

        const currentPartIndexElement = document.getElementById('current-part-index');
        if (currentPartIndexElement) {
            currentPartIndexElement.textContent = this.getCurrentPartIndex();
        }

        // Update gallery header count
        const galleryHeader = galleryContainer.querySelector('.gallery-header h4');
        if (galleryHeader) {
            galleryHeader.innerHTML = `<i class="fas fa-images"></i> Your Uploaded Parts (${this.uploadedFiles.length})`;
        }
    }

    createFileGallery() {
        const step2Container = document.getElementById('step-2');
        const viewerContainer = step2Container.querySelector('.cad-viewer-container');
        
        if (!viewerContainer || this.uploadedFiles.length === 0) {
            return;
        }

        // Remove existing gallery if present
        const existingGallery = step2Container.querySelector('.file-gallery');
        if (existingGallery) {
            existingGallery.remove();
        }

        // Create gallery container
        const galleryHTML = `
            <div class="file-gallery" style="display: block;">
                <div class="gallery-header">
                    <h4><i class="fas fa-images"></i> Your Uploaded Parts (${this.uploadedFiles.length})</h4>
                    <div class="gallery-controls">
                        <span class="gallery-instruction">Click a part to view in 3D</span>
                        <button class="btn-secondary" onclick="rfqSystem.toggleGallery()" title="Toggle Gallery">
                            <i class="fas fa-eye-slash"></i>
                        </button>
                    </div>
                </div>
                <div class="gallery-items">
                    ${this.uploadedFiles.map(file => this.createGalleryItem(file)).join('')}
                </div>
                <div class="gallery-info">
                    <div class="gallery-current-info">
                        <p><strong>Current Part:</strong> <span id="current-part-name">${this.getCurrentPartName()}</span></p>
                        <p class="gallery-navigation-hint">
                            <i class="fas fa-keyboard"></i> Use ← → arrow keys to navigate between parts
                        </p>
                    </div>
                    <div class="gallery-counter">
                        <span id="current-part-index">${this.getCurrentPartIndex()}</span> of ${this.uploadedFiles.length}
                    </div>
                </div>
            </div>
        `;

        // Insert gallery before viewer
        viewerContainer.insertAdjacentHTML('beforebegin', galleryHTML);
    }

    getCurrentPartName() {
        if (!this.currentlyViewingFile || this.uploadedFiles.length === 0) {
            return 'None selected';
        }
        const currentFile = this.uploadedFiles.find(f => f.id == this.currentlyViewingFile); // Use loose equality
        return currentFile ? currentFile.name : 'None selected';
    }

    getCurrentPartIndex() {
        if (!this.currentlyViewingFile || this.uploadedFiles.length === 0) {
            return 0;
        }
        const currentIndex = this.uploadedFiles.findIndex(f => f.id == this.currentlyViewingFile); // Use loose equality
        return currentIndex >= 0 ? currentIndex + 1 : 1;
    }

    createGalleryItem(fileObj) {
        const isActive = fileObj.id == this.currentlyViewingFile; // Use loose equality
        return `
            <div class="gallery-item ${isActive ? 'active' : ''}" data-file-id="${fileObj.id}" onclick="rfqSystem.viewFile('${fileObj.id}')">
                <div class="gallery-thumbnail">
                    <i class="${this.getFileIcon(fileObj.type)}"></i>
                    <span class="file-type">${fileObj.type}</span>
                </div>
                <div class="gallery-info">
                    <div class="gallery-name" title="${fileObj.name}">${this.truncateFileName(fileObj.name, 15)}</div>
                    <div class="gallery-size">${fileObj.size}</div>
                </div>
                <div class="gallery-status">
                    <i class="fas ${fileObj.uploaded ? 'fa-check-circle text-success' : 'fa-clock text-warning'}"></i>
                </div>
            </div>
        `;
    }

    viewAllFiles() {
        // Show all files in a grid/comparison view
        if (!window.CADViewer) {
            window.CADViewer = new CADViewer();
        }

        // For now, load the first file and show notification about multiple files
        if (this.uploadedFiles.length > 1) {
            const message = `Viewing first file. Total: ${this.uploadedFiles.length} files uploaded. Click on gallery items to switch between files.`;
            if (window.CADViewer.showNotification) {
                window.CADViewer.showNotification(message, 'info');
            }
        }

        if (this.uploadedFiles.length > 0) {
            this.viewFile(this.uploadedFiles[0].id);
        }
    }

    toggleGallery() {
        const gallery = document.querySelector('.file-gallery');
        if (gallery) {
            gallery.classList.toggle('collapsed');
            const toggleBtn = gallery.querySelector('.gallery-controls .btn-secondary:last-child i');
            if (gallery.classList.contains('collapsed')) {
                toggleBtn.className = 'fas fa-eye';
            } else {
                toggleBtn.className = 'fas fa-eye-slash';
            }
        }
    }

    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(f => f.id != fileId);
        this.updateFileList();
        
        if (this.uploadedFiles.length === 0) {
            this.hideUploadedFiles();
        }
    }

    showUploadedFiles() {
        document.getElementById('uploaded-files').style.display = 'block';
    }

    hideUploadedFiles() {
        document.getElementById('uploaded-files').style.display = 'none';
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateStepDisplay();
                this.updateStepContent();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
            this.updateStepContent();
        }
    }

    updateStepDisplay() {
        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Update navigation buttons
        const prevBtn = document.getElementById('rfq-prev');
        const nextBtn = document.getElementById('rfq-next');
        const submitBtn = document.getElementById('rfq-submit');

        prevBtn.style.display = this.currentStep === 1 ? 'none' : 'block';
        
        if (this.currentStep === this.totalSteps) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            submitBtn.style.display = 'none';
        }
    }

    updateStepContent() {
        // Hide all steps
        document.querySelectorAll('.rfq-step').forEach(step => {
            step.style.display = 'none';
        });

        // Show current step
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.style.display = 'block';
            currentStepElement.classList.add('fade-in');
        }

        // Special handling for CAD viewer step
        if (this.currentStep === 2) {
            if (this.uploadedFiles.length > 0) {
                this.initializeCADViewer();
                this.bindGalleryKeyboardNavigation();
            }
        }

        // Special handling for specifications step
        if (this.currentStep === 3) {
            this.generatePartSpecifications();
        }
    }

    initializeCADViewer() {
        // Initialize the CAD viewer if files are uploaded
        if (!window.CADViewer) {
            // Initialize CAD viewer first
            window.CADViewer = new CADViewer();
        }
        
        // Create or update the file gallery in step 2
        this.createFileGallery();
        
        if (this.uploadedFiles.length > 0) {
            // Set the first file as currently viewing if none is selected
            if (!this.currentlyViewingFile) {
                this.currentlyViewingFile = this.uploadedFiles[0].id;
            }
            
            const currentFile = this.uploadedFiles.find(f => f.id == this.currentlyViewingFile) || this.uploadedFiles[0]; // Use loose equality
            setTimeout(() => {
                window.CADViewer.loadFile(currentFile.file);
                currentFile.uploaded = true;
                this.updateFileGallery();
            }, 100); // Small delay to ensure viewer is ready
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (this.uploadedFiles.length === 0) {
                    this.showError('Please upload at least one CAD file');
                    return false;
                }
                break;
            case 2:
                // CAD viewer step - always valid
                break;
            case 3:
                // Validate that all parts have required specifications
                const missingSpecs = [];
                this.uploadedFiles.forEach(file => {
                    const spec = this.partSpecifications[file.id];
                    if (!spec || !spec.material) {
                        missingSpecs.push(file.name);
                    }
                });
                
                if (missingSpecs.length > 0) {
                    this.showError(`Please select materials for: ${missingSpecs.join(', ')}`);
                    return false;
                }
                break;
            case 4:
                if (!this.formData.contactName) {
                    this.showError('Please enter your name');
                    return false;
                }
                if (!this.formData.contactEmail || !this.isValidEmail(this.formData.contactEmail)) {
                    this.showError('Please enter a valid email address');
                    return false;
                }
                break;
        }
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.getElementById('rfq-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'rfq-error';
            errorDiv.style.cssText = `
                background: #fee2e2;
                border: 1px solid #fecaca;
                color: #dc2626;
                padding: 1rem;
                border-radius: 0.5rem;
                margin: 1rem 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            `;
            document.querySelector('.rfq-modal__content').insertBefore(
                errorDiv, 
                document.querySelector('.rfq-modal__content').firstChild
            );
        }

        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;

        // Auto hide after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            background: #d1fae5;
            border: 1px solid #a7f3d0;
            color: #065f46;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;

        document.querySelector('.rfq-modal__content').insertBefore(
            successDiv, 
            document.querySelector('.rfq-modal__content').firstChild
        );

        // Auto hide after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    async submitRFQ() {
        if (!this.validateCurrentStep()) {
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('rfq-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        try {
            // Prepare form data for submission
            const submissionData = {
                files: this.uploadedFiles.map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type
                })),
                specifications: {
                    material: this.formData.material,
                    quantity: this.formData.quantity,
                    tolerance: this.formData.tolerance,
                    surfaceFinish: this.formData.surfaceFinish,
                    deliveryDate: this.formData.deliveryDate,
                    specialRequirements: this.formData.specialRequirements
                },
                contact: {
                    name: this.formData.contactName,
                    email: this.formData.contactEmail,
                    phone: this.formData.contactPhone,
                    company: this.formData.companyName,
                    projectType: this.formData.projectType
                },
                requirements: {
                    as9100d: this.formData.as9100dRequired,
                    inspectionReport: this.formData.inspectionReport,
                    materialCerts: this.formData.materialCerts
                },
                timestamp: new Date().toISOString()
            };

            // In a real application, this would send to a server
            console.log('RFQ Submission:', submissionData);
            
            // Simulate API call
            await this.simulateAPICall(submissionData);

            this.showSuccess('Your RFQ has been submitted successfully! We will contact you within 24 hours.');
            
            // Close modal after success
            setTimeout(() => {
                document.getElementById('rfq-modal').classList.remove('active');
                document.body.style.overflow = 'auto';
                this.resetForm();
            }, 2000);

        } catch (error) {
            console.error('RFQ submission error:', error);
            this.showError('Failed to submit RFQ. Please try again.');
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async simulateAPICall(data) {
        // Simulate network delay
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate success (90% chance)
                if (Math.random() > 0.1) {
                    resolve(data);
                } else {
                    reject(new Error('Network error'));
                }
            }, 2000);
        });
    }

    resetForm() {
        this.currentStep = 1;
        this.uploadedFiles = [];
        this.formData = {};
        
        // Reset form inputs
        document.querySelectorAll('.form-control').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });

        // Reset file list
        this.hideUploadedFiles();
        document.getElementById('file-list').innerHTML = '';

        // Reset step display
        this.updateStepDisplay();
        this.updateStepContent();
    }

    // Static method to handle files from external sources
    static handleFiles(files) {
        if (window.rfqSystem) {
            window.rfqSystem.handleFiles(files);
        }
    }
}

// Initialize RFQ System when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rfqSystem = new RFQSystem();
    window.RFQSystem = RFQSystem; // For external access
}); 