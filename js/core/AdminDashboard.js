/**
 * AdminDashboard - Main controller for the admin panel
 * Manages navigation, data operations, and UI interactions
 */

class AdminDashboard {
    constructor() {
        this.dataManager = null;
        this.currentView = 'dashboard';
        this.currentRFQ = null;
        this.filters = {
            status: '',
            priority: '',
            dateRange: '',
            search: ''
        };
        
        // UI Elements
        this.elements = {};
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Initialize data manager
        this.dataManager = new DataManager();
    }

    /**
     * Initialize the admin dashboard
     */
    async init() {
        try {
            console.log('Initializing AdminDashboard...');
            
            // Cache DOM elements
            this.cacheElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup navigation
            this.setupNavigation();
            
            // Setup import functionality
            this.setupImportFunctionality();
            
            // Show initial view
            this.showView('dashboard');
            
            // Update metrics
            this.updateMetrics();
            
            console.log('AdminDashboard initialized successfully');
            
        } catch (error) {
            console.error('Error initializing AdminDashboard:', error);
            this.showNotification('Error initializing admin panel', 'error');
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        // Navigation elements
        this.elements.navLinks = document.querySelectorAll('.nav-link');
        this.elements.sidebarToggle = document.getElementById('sidebar-toggle');
        this.elements.sidebar = document.getElementById('admin-sidebar');
        
        // View containers
        this.elements.viewContainers = document.querySelectorAll('.admin-view');
        this.elements.dashboardView = document.getElementById('dashboard-view');
        this.elements.rfqsView = document.getElementById('rfqs-view');
        
        // Dashboard elements
        this.elements.totalRFQs = document.getElementById('total-rfqs');
        this.elements.pendingRFQs = document.getElementById('pending-rfqs');
        this.elements.activeQuotes = document.getElementById('active-quotes');
        this.elements.totalValue = document.getElementById('total-value');
        this.elements.recentActivity = document.getElementById('recent-activity');
        this.elements.rfqCount = document.getElementById('rfq-count');
        
        // RFQ table elements
        this.elements.rfqsTable = document.getElementById('rfqs-table');
        this.elements.rfqsTableBody = document.getElementById('rfqs-table-body');
        this.elements.rfqsEmptyState = document.getElementById('rfqs-empty-state');
        this.elements.statusFilter = document.getElementById('status-filter');
        this.elements.priorityFilter = document.getElementById('priority-filter');
        
        // Import modal elements
        this.elements.importModal = document.getElementById('import-modal');
        this.elements.importBtn = document.getElementById('import-rfq-btn');
        this.elements.importDropZone = document.getElementById('import-drop-zone');
        this.elements.importFileInput = document.getElementById('import-file-input');
        this.elements.importProgress = document.getElementById('import-progress');
        this.elements.progressFill = document.getElementById('progress-fill');
        this.elements.progressText = document.getElementById('progress-text');
        
        // Search
        this.elements.globalSearch = document.getElementById('global-search');
        
        // Notifications
        this.elements.notificationCount = document.getElementById('notification-count');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                if (view) {
                    this.showView(view);
                }
            });
        });
        
        // Sidebar toggle (mobile)
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
        
        // Global search
        if (this.elements.globalSearch) {
            this.elements.globalSearch.addEventListener('input', 
                this.debounce((e) => this.handleGlobalSearch(e.target.value), 300)
            );
        }
        
        // Filters
        if (this.elements.statusFilter) {
            this.elements.statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }
        
        if (this.elements.priorityFilter) {
            this.elements.priorityFilter.addEventListener('change', (e) => {
                this.filters.priority = e.target.value;
                this.applyFilters();
            });
        }
        
        // Data update listeners
        window.addEventListener('metricsUpdated', (e) => {
            this.updateMetricsDisplay(e.detail);
        });
        
        window.addEventListener('dataUpdated', (e) => {
            this.handleDataUpdate(e.detail);
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Load metrics
            const metrics = this.dataManager.getMetrics();
            if (metrics) {
                this.updateMetricsDisplay(metrics);
            }
            
            // Load RFQs for table
            this.loadRFQsTable();
            
            // Load recent activity
            this.loadRecentActivity();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    /**
     * Setup navigation
     */
    setupNavigation() {
        // Set initial active state
        this.setActiveNavigation('dashboard');
    }

    /**
     * Setup import functionality
     */
    setupImportFunctionality() {
        // Import button
        if (this.elements.importBtn) {
            this.elements.importBtn.addEventListener('click', () => {
                this.showImportDialog();
            });
        }
        
        // File input
        if (this.elements.importFileInput) {
            this.elements.importFileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }
        
        // Drag and drop
        if (this.elements.importDropZone) {
            this.setupDragAndDrop();
        }
        
        // Modal close
        const modalClose = this.elements.importModal?.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeImportDialog();
            });
        }
        
        // Modal overlay close
        const modalOverlay = this.elements.importModal?.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => {
                this.closeImportDialog();
            });
        }
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const dropZone = this.elements.importDropZone;
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFileSelection(e.dataTransfer.files);
        });
        
        dropZone.addEventListener('click', () => {
            this.elements.importFileInput.click();
        });
    }

    // ========================================
    // Navigation Methods
    // ========================================

    /**
     * Show a specific view
     * @param {string} viewName - Name of the view to show
     */
    showView(viewName) {
        // Hide all views
        this.elements.viewContainers.forEach(view => {
            view.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            this.setActiveNavigation(viewName);
            
            // Load view-specific data
            this.loadViewData(viewName);
        }
    }

    /**
     * Set active navigation item
     * @param {string} viewName - Active view name
     */
    setActiveNavigation(viewName) {
        this.elements.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Toggle sidebar (mobile)
     */
    toggleSidebar() {
        if (this.elements.sidebar) {
            this.elements.sidebar.classList.toggle('active');
        }
    }

    /**
     * Load data for specific view
     * @param {string} viewName - View name
     */
    loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'rfqs':
                this.loadRFQsTable();
                break;
            case 'customers':
                this.loadCustomersData();
                break;
            case 'quotes':
                this.loadQuotesData();
                break;
            // Add other views as implemented
        }
    }

    // ========================================
    // Dashboard Methods
    // ========================================

    /**
     * Load dashboard data
     */
    loadDashboardData() {
        this.updateMetrics();
        this.loadRecentActivity();
    }

    /**
     * Update metrics
     */
    updateMetrics() {
        this.dataManager.updateMetrics();
    }

    /**
     * Update metrics display
     * @param {Object} metrics - Metrics data
     */
    updateMetricsDisplay(metrics) {
        if (this.elements.totalRFQs) {
            this.elements.totalRFQs.textContent = metrics.totalRFQs || 0;
        }
        if (this.elements.pendingRFQs) {
            this.elements.pendingRFQs.textContent = metrics.pendingRFQs || 0;
        }
        if (this.elements.activeQuotes) {
            this.elements.activeQuotes.textContent = metrics.activeQuotes || 0;
        }
        if (this.elements.totalValue) {
            this.elements.totalValue.textContent = formatCurrency(metrics.totalValue || 0);
        }
        if (this.elements.rfqCount) {
            this.elements.rfqCount.textContent = metrics.totalRFQs || 0;
        }
        if (this.elements.notificationCount) {
            this.elements.notificationCount.textContent = metrics.pendingRFQs || 0;
        }
    }

    /**
     * Load recent activity
     */
    loadRecentActivity() {
        const rfqs = this.dataManager.getAllRFQs();
        const rfqList = Object.values(rfqs)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 10);
        
        if (this.elements.recentActivity) {
            if (rfqList.length === 0) {
                this.elements.recentActivity.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No recent activity</p>
                        <small>Import your first RFQ to get started</small>
                    </div>
                `;
            } else {
                const activityHTML = rfqList.map(rfq => {
                    const statusInfo = this.getStatusInfo(rfq.status);
                    return `
                        <div class="activity-item" onclick="adminDashboard.viewRFQ('${rfq.id}')">
                            <div class="activity-icon">
                                <i class="fas ${statusInfo.icon}"></i>
                            </div>
                            <div class="activity-content">
                                <div class="activity-title">${rfq.rfqNumber}</div>
                                <div class="activity-description">${rfq.customerInfo.company}</div>
                                <div class="activity-time">${formatTimeAgo(rfq.updatedAt)}</div>
                            </div>
                            <div class="activity-status">
                                <span class="status-badge ${rfq.status}">${statusInfo.label}</span>
                            </div>
                        </div>
                    `;
                }).join('');
                
                this.elements.recentActivity.innerHTML = activityHTML;
            }
        }
    }

    // ========================================
    // RFQ Management Methods
    // ========================================

    /**
     * Load RFQs table
     */
    loadRFQsTable() {
        const rfqs = this.dataManager.getAllRFQs();
        const rfqList = Object.values(rfqs);
        
        if (rfqList.length === 0) {
            this.showRFQsEmptyState();
        } else {
            this.renderRFQsTable(rfqList);
        }
    }

    /**
     * Show RFQs empty state
     */
    showRFQsEmptyState() {
        if (this.elements.rfqsTable) {
            this.elements.rfqsTable.style.display = 'none';
        }
        if (this.elements.rfqsEmptyState) {
            this.elements.rfqsEmptyState.style.display = 'block';
        }
    }

    /**
     * Render RFQs table
     * @param {Array} rfqs - Array of RFQ data
     */
    renderRFQsTable(rfqs) {
        if (!this.elements.rfqsTableBody) return;
        
        // Show table, hide empty state
        if (this.elements.rfqsTable) {
            this.elements.rfqsTable.style.display = 'table';
        }
        if (this.elements.rfqsEmptyState) {
            this.elements.rfqsEmptyState.style.display = 'none';
        }
        
        // Apply filters
        const filteredRFQs = this.applyRFQFilters(rfqs);
        
        // Sort by most recent
        filteredRFQs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Generate table rows
        const tableHTML = filteredRFQs.map(rfq => {
            const statusInfo = this.getStatusInfo(rfq.status);
            const priorityInfo = this.getPriorityInfo(rfq.priority);
            
            return `
                <tr onclick="adminDashboard.viewRFQ('${rfq.id}')" style="cursor: pointer;">
                    <td>
                        <div class="rfq-number">${rfq.rfqNumber}</div>
                        <small class="text-muted">${formatDate(rfq.createdAt)}</small>
                    </td>
                    <td>
                        <div class="customer-name">${rfq.customerInfo.name}</div>
                        <small class="text-muted">${rfq.customerInfo.email}</small>
                    </td>
                    <td>${rfq.customerInfo.company}</td>
                    <td>
                        <span class="status-badge ${rfq.status}">${statusInfo.label}</span>
                    </td>
                    <td>
                        <span class="priority-badge ${rfq.priority}">${priorityInfo.label}</span>
                    </td>
                    <td>
                        <span class="parts-count">${rfq.totalParts}</span>
                        <small class="text-muted">(${rfq.totalQuantity} qty)</small>
                    </td>
                    <td>${formatCurrency(rfq.estimatedValue || 0)}</td>
                    <td>${formatTimeAgo(rfq.createdAt)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); adminDashboard.viewRFQ('${rfq.id}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); adminDashboard.createQuote('${rfq.id}')" title="Create Quote">
                                <i class="fas fa-calculator"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        this.elements.rfqsTableBody.innerHTML = tableHTML;
    }

    /**
     * Apply filters to RFQ list
     * @param {Array} rfqs - RFQ list
     * @returns {Array} Filtered RFQs
     */
    applyRFQFilters(rfqs) {
        return rfqs.filter(rfq => {
            // Status filter
            if (this.filters.status && rfq.status !== this.filters.status) {
                return false;
            }
            
            // Priority filter
            if (this.filters.priority && rfq.priority !== this.filters.priority) {
                return false;
            }
            
            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const searchableText = [
                    rfq.rfqNumber,
                    rfq.customerInfo.name,
                    rfq.customerInfo.company,
                    rfq.customerInfo.email,
                    rfq.title,
                    rfq.description
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Apply current filters
     */
    applyFilters() {
        if (this.currentView === 'rfqs') {
            this.loadRFQsTable();
        }
    }

    /**
     * View RFQ details
     * @param {string} rfqId - RFQ ID
     */
    viewRFQ(rfqId) {
        const rfq = this.dataManager.getRFQ(rfqId);
        if (rfq) {
            this.showRFQDetails(rfq);
        } else {
            this.showNotification('RFQ not found', 'error');
        }
    }

    /**
     * Create quote from RFQ
     * @param {string} rfqId - RFQ ID
     */
    createQuote(rfqId) {
        const rfq = this.dataManager.getRFQ(rfqId);
        if (rfq) {
            // TODO: Implement quote creation
            console.log('Create quote for RFQ:', rfq);
            this.showNotification(`Creating quote for ${rfq.rfqNumber}`, 'info');
        }
    }

    // ========================================
    // Import Methods
    // ========================================

    /**
     * Show import dialog
     */
    showImportDialog() {
        if (this.elements.importModal) {
            this.elements.importModal.classList.add('active');
            this.resetImportDialog();
        }
    }

    /**
     * Close import dialog
     */
    closeImportDialog() {
        if (this.elements.importModal) {
            this.elements.importModal.classList.remove('active');
        }
    }

    /**
     * Reset import dialog
     */
    resetImportDialog() {
        if (this.elements.importFileInput) {
            this.elements.importFileInput.value = '';
        }
        if (this.elements.importProgress) {
            this.elements.importProgress.style.display = 'none';
        }
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = '0%';
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = 'Processing files...';
        }
    }

    /**
     * Handle file selection
     * @param {FileList} files - Selected files
     */
    async handleFileSelection(files) {
        if (!files || files.length === 0) return;
        
        const jsonFiles = Array.from(files).filter(file => 
            file.type === 'application/json' || file.name.endsWith('.json')
        );
        
        if (jsonFiles.length === 0) {
            this.showNotification('Please select JSON files only', 'warning');
            return;
        }
        
        this.showImportProgress();
        
        try {
            for (let i = 0; i < jsonFiles.length; i++) {
                const file = jsonFiles[i];
                const progress = ((i + 1) / jsonFiles.length) * 100;
                
                this.updateImportProgress(progress, `Processing ${file.name}...`);
                
                await this.processRFQFile(file);
                
                // Small delay for UI feedback
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            this.showNotification(`Successfully imported ${jsonFiles.length} RFQ(s)`, 'success');
            this.closeImportDialog();
            
            // Refresh data
            this.loadInitialData();
            
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Error importing files: ' + error.message, 'error');
        }
    }

    /**
     * Show import progress
     */
    showImportProgress() {
        if (this.elements.importProgress) {
            this.elements.importProgress.style.display = 'block';
        }
    }

    /**
     * Update import progress
     * @param {number} percentage - Progress percentage
     * @param {string} text - Progress text
     */
    updateImportProgress(percentage, text) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${percentage}%`;
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = text;
        }
    }

    /**
     * Process individual RFQ file
     * @param {File} file - JSON file
     */
    async processRFQFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    const rfqId = await this.dataManager.importRFQData(jsonData);
                    
                    if (rfqId) {
                        console.log(`RFQ imported successfully: ${rfqId}`);
                        resolve(rfqId);
                    } else {
                        throw new Error('Failed to import RFQ');
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error(`Failed to read file: ${file.name}`));
            };
            
            reader.readAsText(file);
        });
    }

    // ========================================
    // Utility Methods
    // ========================================

    /**
     * Handle global search
     * @param {string} searchTerm - Search term
     */
    handleGlobalSearch(searchTerm) {
        this.filters.search = searchTerm;
        this.applyFilters();
    }

    /**
     * Handle data updates
     * @param {Object} updateData - Update data
     */
    handleDataUpdate(updateData) {
        console.log('Data updated:', updateData);
        
        // Refresh current view
        this.loadViewData(this.currentView);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Handle responsive behavior
        if (window.innerWidth <= 1024) {
            // Mobile/tablet view
            if (this.elements.sidebar) {
                this.elements.sidebar.classList.remove('active');
            }
        }
    }

    /**
     * Get status display info
     * @param {string} status - Status value
     * @returns {Object} Status info
     */
    getStatusInfo(status) {
        const statusMap = {
            'new': { label: 'New', color: 'info', icon: 'fa-plus' },
            'reviewing': { label: 'Reviewing', color: 'warning', icon: 'fa-eye' },
            'quoted': { label: 'Quoted', color: 'primary', icon: 'fa-calculator' },
            'won': { label: 'Won', color: 'success', icon: 'fa-trophy' },
            'lost': { label: 'Lost', color: 'danger', icon: 'fa-times' }
        };
        
        return statusMap[status] || statusMap['new'];
    }

    /**
     * Get priority display info
     * @param {string} priority - Priority value
     * @returns {Object} Priority info
     */
    getPriorityInfo(priority) {
        const priorityMap = {
            'low': { label: 'Low', color: 'secondary', icon: 'fa-arrow-down' },
            'normal': { label: 'Normal', color: 'info', icon: 'fa-minus' },
            'high': { label: 'High', color: 'warning', icon: 'fa-arrow-up' },
            'urgent': { label: 'Urgent', color: 'danger', icon: 'fa-exclamation' }
        };
        
        return priorityMap[priority] || priorityMap['normal'];
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }

    /**
     * Get notification icon
     * @param {string} type - Notification type
     * @returns {string} Icon class
     */
    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        return icons[type] || icons['info'];
    }

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ========================================
    // RFQ Detail Modal Methods
    // ========================================

    /**
     * Show RFQ details modal
     * @param {Object} rfq - RFQ data
     */
    showRFQDetails(rfq) {
        // Store current RFQ for reference
        this.currentDetailRFQ = rfq;

        // Populate modal with RFQ data
        this.populateRFQDetailModal(rfq);

        // Show modal
        const modal = document.getElementById('rfq-detail-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Close RFQ detail modal
     */
    closeRFQDetailModal() {
        const modal = document.getElementById('rfq-detail-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.currentDetailRFQ = null;
    }

    /**
     * Populate RFQ detail modal with data
     * @param {Object} rfq - RFQ data
     */
    populateRFQDetailModal(rfq) {
        // Set title
        document.getElementById('rfq-detail-title').textContent = `RFQ ${rfq.rfqNumber} Details`;

        // RFQ Information
        document.getElementById('detail-rfq-number').textContent = rfq.rfqNumber;
        
        const statusElement = document.getElementById('detail-rfq-status');
        statusElement.textContent = this.getStatusInfo(rfq.status).label;
        statusElement.className = `value status-badge ${rfq.status}`;
        
        document.getElementById('detail-rfq-created').textContent = formatDate(rfq.createdAt);
        document.getElementById('detail-rfq-project').textContent = rfq.title || 'No project name';

        // Customer Information
        document.getElementById('detail-customer-name').textContent = rfq.customerInfo.name;
        
        const emailLink = document.getElementById('detail-customer-email');
        emailLink.textContent = rfq.customerInfo.email;
        emailLink.href = `mailto:${rfq.customerInfo.email}`;
        
        document.getElementById('detail-customer-company').textContent = rfq.customerInfo.company || 'Not specified';
        document.getElementById('detail-customer-phone').textContent = rfq.customerInfo.phone || 'Not provided';

        // Summary
        document.getElementById('detail-total-parts').textContent = rfq.totalParts || 0;
        document.getElementById('detail-total-files').textContent = rfq.totalFiles || 0;
        document.getElementById('detail-estimated-value').textContent = formatCurrency(rfq.estimatedValue || 0);
        
        const priorityElement = document.getElementById('detail-priority');
        const priorityInfo = this.getPriorityInfo(rfq.priority || 'normal');
        priorityElement.textContent = priorityInfo.label;
        priorityElement.className = `value priority-badge ${rfq.priority || 'normal'}`;

        // Set status select
        const statusSelect = document.getElementById('status-select');
        if (statusSelect) {
            statusSelect.value = rfq.status;
        }

        // Load default tab
        this.switchRFQTab('parts');
    }

    /**
     * Switch RFQ detail tabs
     * @param {string} tabName - Tab name
     */
    switchRFQTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        // Load content based on tab
        switch (tabName) {
            case 'parts':
                this.loadPartsTab();
                break;
            case 'files':
                this.loadFilesTab();
                break;
            case 'timeline':
                this.loadTimelineTab();
                break;
            case 'quote':
                this.loadQuoteTab();
                break;
        }
    }

    /**
     * Load parts tab content
     */
    loadPartsTab() {
        if (!this.currentDetailRFQ) return;

        const partsGrid = document.getElementById('rfq-parts-grid');
        if (!partsGrid) return;
        
        const parts = this.currentDetailRFQ.parts || [];
        
        if (parts.length === 0) {
            partsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cog"></i>
                    <h3>No Parts</h3>
                    <p>No parts found for this RFQ</p>
                </div>
            `;
            return;
        }

        partsGrid.innerHTML = parts.map(part => `
            <div class="part-card">
                <div class="part-header">
                    <h5 class="part-title">${part.name || 'Unnamed Part'}</h5>
                    <span class="status-badge ${part.status || 'new'}">${this.getStatusInfo(part.status || 'new').label}</span>
                </div>
                <div class="part-specs">
                    <div class="spec-item">
                        <span class="spec-label">Quantity</span>
                        <span class="spec-value">${part.quantity || 1}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Material</span>
                        <span class="spec-value">${part.material || 'Not specified'}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Finish</span>
                        <span class="spec-value">${part.finish || 'Standard'}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Est. Value</span>
                        <span class="spec-value">${formatCurrency(part.estimatedValue || 0)}</span>
                    </div>
                </div>
                ${part.description ? `<div class="part-description">${part.description}</div>` : ''}
                <div class="part-files">
                    <small class="text-muted">${part.files?.length || 0} file(s) attached</small>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load files tab content
     */
    loadFilesTab() {
        if (!this.currentDetailRFQ) return;

        const filesGrid = document.getElementById('rfq-files-grid');
        const filesSummary = document.getElementById('files-summary');
        if (!filesGrid || !filesSummary) return;

        const allFiles = [];
        const parts = this.currentDetailRFQ.parts || [];
        
        parts.forEach(part => {
            if (part.files) {
                part.files.forEach(file => {
                    allFiles.push({
                        ...file,
                        partName: part.name || 'Unnamed Part',
                        partId: part.id
                    });
                });
            }
        });

        // Update summary
        const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
        const cadFiles = allFiles.filter(file => this.isCADFile(file.name));
        
        filesSummary.innerHTML = `
            <div class="summary-stats">
                <span><strong>${allFiles.length}</strong> total files</span>
                <span><strong>${cadFiles.length}</strong> CAD files</span>
                <span><strong>${formatFileSize(totalSize)}</strong> total size</span>
            </div>
        `;

        if (allFiles.length === 0) {
            filesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No Files</h3>
                    <p>No files attached to this RFQ</p>
                </div>
            `;
            return;
        }

        filesGrid.innerHTML = allFiles.map(file => `
            <div class="file-card" onclick="adminDashboard.viewFile('${file.id}')">
                <div class="file-icon">
                    <i class="fas fa-${this.getFileIcon(file.name)}"></i>
                </div>
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size || 0)}</div>
                <div class="file-part">Part: ${file.partName}</div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); adminDashboard.downloadFile('${file.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load timeline tab content
     */
    loadTimelineTab() {
        if (!this.currentDetailRFQ) return;

        const timeline = document.getElementById('rfq-timeline');
        if (!timeline) return;
        
        // Get timeline events
        const events = [
            {
                type: 'created',
                title: 'RFQ Created',
                description: 'RFQ was created and submitted by customer',
                date: this.currentDetailRFQ.createdAt,
                icon: 'plus'
            },
            {
                type: 'imported',
                title: 'Data Imported',
                description: 'RFQ data was imported into admin system',
                date: this.currentDetailRFQ.importedAt || this.currentDetailRFQ.createdAt,
                icon: 'download'
            }
        ];

        // Add status change events if any
        if (this.currentDetailRFQ.statusHistory) {
            this.currentDetailRFQ.statusHistory.forEach(change => {
                events.push({
                    type: 'status',
                    title: `Status Changed to ${this.getStatusInfo(change.status).label}`,
                    description: change.note || 'Status updated by admin',
                    date: change.date,
                    icon: 'exchange-alt'
                });
            });
        }

        // Add notes if any
        if (this.currentDetailRFQ.notes) {
            this.currentDetailRFQ.notes.forEach(note => {
                events.push({
                    type: 'note',
                    title: 'Note Added',
                    description: note.text,
                    date: note.date,
                    icon: 'comment'
                });
            });
        }

        // Sort events by date (newest first)
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        timeline.innerHTML = events.map(event => `
            <div class="timeline-item">
                <div class="timeline-icon">
                    <i class="fas fa-${event.icon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-title">${event.title}</span>
                        <span class="timeline-date">${formatDate(event.date)}</span>
                    </div>
                    <div class="timeline-description">${event.description}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load quote tab content
     */
    loadQuoteTab() {
        // Quote tab content is mostly static HTML
        // Future enhancement: Load existing quotes if any
    }

    /**
     * Add note to RFQ
     */
    addRFQNote() {
        const note = prompt('Enter note:');
        if (note && this.currentDetailRFQ) {
            // Add note to RFQ
            if (!this.currentDetailRFQ.notes) {
                this.currentDetailRFQ.notes = [];
            }
            this.currentDetailRFQ.notes.push({
                id: Date.now(),
                text: note,
                date: new Date(),
                author: 'Admin'
            });
            
            this.dataManager.updateRFQ(this.currentDetailRFQ);
            this.loadTimelineTab(); // Refresh timeline
            this.showNotification('Note added successfully');
        }
    }

    /**
     * Generate quote for RFQ
     */
    generateQuote() {
        if (this.currentDetailRFQ) {
            // Future implementation: Open quote generation modal
            this.showNotification('Quote generation coming soon...', 'info');
        }
    }

    /**
     * Update RFQ status
     */
    updateRFQStatus() {
        const statusSelect = document.getElementById('status-select');
        if (!statusSelect || !this.currentDetailRFQ) return;

        const newStatus = statusSelect.value;
        if (newStatus !== this.currentDetailRFQ.status) {
            // Update status
            const oldStatus = this.currentDetailRFQ.status;
            this.currentDetailRFQ.status = newStatus;
            
            // Add to status history
            if (!this.currentDetailRFQ.statusHistory) {
                this.currentDetailRFQ.statusHistory = [];
            }
            this.currentDetailRFQ.statusHistory.push({
                oldStatus,
                status: newStatus,
                date: new Date(),
                author: 'Admin'
            });

            this.dataManager.updateRFQ(this.currentDetailRFQ);
            
            // Update display
            this.populateRFQDetailModal(this.currentDetailRFQ);
            this.loadDashboardData(); // Refresh dashboard
            this.loadRFQsTable(); // Refresh table
            
            this.showNotification(`Status updated to ${this.getStatusInfo(newStatus).label}`);
        }
    }

    /**
     * Contact customer
     */
    contactCustomer() {
        if (this.currentDetailRFQ) {
            const subject = `Regarding RFQ ${this.currentDetailRFQ.rfqNumber}`;
            const body = `Dear ${this.currentDetailRFQ.customerInfo.name},\n\nThank you for your RFQ submission. We are reviewing your requirements and will get back to you shortly.\n\nBest regards,\nTobroTech Team`;
            const mailtoLink = `mailto:${this.currentDetailRFQ.customerInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(mailtoLink, '_blank');
        }
    }

    /**
     * Get file icon based on extension
     * @param {string} filename - File name
     * @returns {string} Font Awesome icon class
     */
    getFileIcon(filename) {
        const extension = filename.toLowerCase().split('.').pop();
        const iconMap = {
            'pdf': 'file-pdf',
            'doc': 'file-word',
            'docx': 'file-word',
            'xls': 'file-excel',
            'xlsx': 'file-excel',
            'ppt': 'file-powerpoint',
            'pptx': 'file-powerpoint',
            'jpg': 'file-image',
            'jpeg': 'file-image',
            'png': 'file-image',
            'gif': 'file-image',
            'dwg': 'drafting-compass',
            'dxf': 'drafting-compass',
            'step': 'cube',
            'stp': 'cube',
            'iges': 'cube',
            'igs': 'cube',
            'stl': 'cube',
            'obj': 'cube'
        };
        return iconMap[extension] || 'file';
    }

    /**
     * Check if file is a CAD file
     * @param {string} filename - File name
     * @returns {boolean} True if CAD file
     */
    isCADFile(filename) {
        const cadExtensions = ['dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl', 'obj', '3mf', 'amf'];
        const extension = filename.toLowerCase().split('.').pop();
        return cadExtensions.includes(extension);
    }

    /**
     * View file (placeholder)
     * @param {string} fileId - File ID
     */
    viewFile(fileId) {
        // Future implementation: Open file viewer
        this.showNotification('File viewer coming soon...', 'info');
    }

    /**
     * Download file (placeholder)
     * @param {string} fileId - File ID
     */
    downloadFile(fileId) {
        // Future implementation: Download file
        this.showNotification('File download coming soon...', 'info');
    }

    // ========================================
    // Placeholder Methods for Future Implementation
    // ========================================

    /**
     * Load customers data
     */
    loadCustomersData() {
        console.log('Loading customers data...');
        // TODO: Implement customers view
    }

    /**
     * Load quotes data
     */
    loadQuotesData() {
        console.log('Loading quotes data...');
        // TODO: Implement quotes view
    }

    /**
     * Create new quote
     */
    createNewQuote() {
        console.log('Creating new quote...');
        this.showNotification('Quote creation coming soon', 'info');
    }

    /**
     * Export data
     */
    exportData() {
        const data = this.dataManager.exportAllData();
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tobro_admin_export_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showNotification('Data exported successfully', 'success');
        } else {
            this.showNotification('Error exporting data', 'error');
        }
    }
}

// Export for global use
window.AdminDashboard = AdminDashboard; 