/**
 * DataManager - Core data persistence and management system
 * Handles localStorage operations, data validation, and provides unified API
 * for RFQ, Customer, Quote, and Part data management
 */

class DataManager {
    constructor() {
        this.storageKeys = {
            rfqs: 'tobro_admin_rfqs',
            customers: 'tobro_admin_customers', 
            quotes: 'tobro_admin_quotes',
            parts: 'tobro_admin_parts',
            settings: 'tobro_admin_settings',
            metrics: 'tobro_admin_metrics'
        };
        
        this.init();
    }

    /**
     * Initialize the data manager
     */
    init() {
        // Initialize storage if not exists
        this.initializeStorage();
        
        // Set up event listeners for storage changes
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        console.log('DataManager initialized');
    }

    /**
     * Initialize storage with default data structures
     */
    initializeStorage() {
        Object.values(this.storageKeys).forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify({}));
            }
        });

        // Initialize metrics if not exists
        if (!this.getMetrics()) {
            this.updateMetrics({
                totalRFQs: 0,
                pendingRFQs: 0,
                activeQuotes: 0,
                totalValue: 0,
                lastUpdated: new Date().toISOString()
            });
        }
    }

    // ========================================
    // RFQ Data Management
    // ========================================

    /**
     * Save an RFQ to storage
     * @param {RFQ} rfq - RFQ instance to save
     * @returns {boolean} Success status
     */
    saveRFQ(rfq) {
        try {
            const rfqs = this.getAllRFQs();
            rfqs[rfq.id] = rfq.toJSON();
            
            localStorage.setItem(this.storageKeys.rfqs, JSON.stringify(rfqs));
            this.updateMetrics();
            
            console.log(`RFQ ${rfq.id} saved successfully`);
            return true;
        } catch (error) {
            console.error('Error saving RFQ:', error);
            return false;
        }
    }

    /**
     * Get an RFQ by ID
     * @param {string} rfqId - RFQ ID
     * @returns {Object|null} RFQ data or null
     */
    getRFQ(rfqId) {
        try {
            const rfqs = this.getAllRFQs();
            return rfqs[rfqId] || null;
        } catch (error) {
            console.error('Error getting RFQ:', error);
            return null;
        }
    }

    /**
     * Get all RFQs
     * @returns {Object} All RFQs indexed by ID
     */
    getAllRFQs() {
        try {
            const data = localStorage.getItem(this.storageKeys.rfqs);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error getting all RFQs:', error);
            return {};
        }
    }

    /**
     * Delete an RFQ
     * @param {string} rfqId - RFQ ID to delete
     * @returns {boolean} Success status
     */
    deleteRFQ(rfqId) {
        try {
            const rfqs = this.getAllRFQs();
            if (rfqs[rfqId]) {
                delete rfqs[rfqId];
                localStorage.setItem(this.storageKeys.rfqs, JSON.stringify(rfqs));
                this.updateMetrics();
                console.log(`RFQ ${rfqId} deleted successfully`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting RFQ:', error);
            return false;
        }
    }

    /**
     * Update RFQ status
     * @param {string} rfqId - RFQ ID
     * @param {string} status - New status
     * @param {string} note - Optional status change note
     * @returns {boolean} Success status
     */
    updateRFQStatus(rfqId, status, note = '') {
        try {
            const rfq = this.getRFQ(rfqId);
            if (rfq) {
                rfq.status = status;
                rfq.updatedAt = new Date().toISOString();
                
                // Add timeline entry
                rfq.timeline.push({
                    date: new Date().toISOString(),
                    action: `Status changed to ${status}`,
                    user: 'Admin',
                    note: note
                });

                const rfqs = this.getAllRFQs();
                rfqs[rfqId] = rfq;
                localStorage.setItem(this.storageKeys.rfqs, JSON.stringify(rfqs));
                this.updateMetrics();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating RFQ status:', error);
            return false;
        }
    }

    // ========================================
    // Customer Data Management
    // ========================================

    /**
     * Save a customer to storage
     * @param {Customer} customer - Customer instance to save
     * @returns {boolean} Success status
     */
    saveCustomer(customer) {
        try {
            const customers = this.getAllCustomers();
            customers[customer.id] = customer.toJSON();
            
            localStorage.setItem(this.storageKeys.customers, JSON.stringify(customers));
            
            console.log(`Customer ${customer.id} saved successfully`);
            return true;
        } catch (error) {
            console.error('Error saving customer:', error);
            return false;
        }
    }

    /**
     * Get a customer by ID
     * @param {string} customerId - Customer ID
     * @returns {Object|null} Customer data or null
     */
    getCustomer(customerId) {
        try {
            const customers = this.getAllCustomers();
            return customers[customerId] || null;
        } catch (error) {
            console.error('Error getting customer:', error);
            return null;
        }
    }

    /**
     * Get customer by email
     * @param {string} email - Customer email
     * @returns {Object|null} Customer data or null
     */
    getCustomerByEmail(email) {
        try {
            const customers = this.getAllCustomers();
            const customerList = Object.values(customers);
            return customerList.find(customer => customer.email === email) || null;
        } catch (error) {
            console.error('Error getting customer by email:', error);
            return null;
        }
    }

    /**
     * Get all customers
     * @returns {Object} All customers indexed by ID
     */
    getAllCustomers() {
        try {
            const data = localStorage.getItem(this.storageKeys.customers);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error getting all customers:', error);
            return {};
        }
    }

    // ========================================
    // Quote Data Management
    // ========================================

    /**
     * Save a quote to storage
     * @param {Quote} quote - Quote instance to save
     * @returns {boolean} Success status
     */
    saveQuote(quote) {
        try {
            const quotes = this.getAllQuotes();
            quotes[quote.id] = quote.toJSON();
            
            localStorage.setItem(this.storageKeys.quotes, JSON.stringify(quotes));
            this.updateMetrics();
            
            console.log(`Quote ${quote.id} saved successfully`);
            return true;
        } catch (error) {
            console.error('Error saving quote:', error);
            return false;
        }
    }

    /**
     * Get a quote by ID
     * @param {string} quoteId - Quote ID
     * @returns {Object|null} Quote data or null
     */
    getQuote(quoteId) {
        try {
            const quotes = this.getAllQuotes();
            return quotes[quoteId] || null;
        } catch (error) {
            console.error('Error getting quote:', error);
            return null;
        }
    }

    /**
     * Get all quotes
     * @returns {Object} All quotes indexed by ID
     */
    getAllQuotes() {
        try {
            const data = localStorage.getItem(this.storageKeys.quotes);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error getting all quotes:', error);
            return {};
        }
    }

    /**
     * Get quotes by RFQ ID
     * @param {string} rfqId - RFQ ID
     * @returns {Array} Array of quotes for the RFQ
     */
    getQuotesByRFQ(rfqId) {
        try {
            const quotes = this.getAllQuotes();
            return Object.values(quotes).filter(quote => quote.rfqId === rfqId);
        } catch (error) {
            console.error('Error getting quotes by RFQ:', error);
            return [];
        }
    }

    // ========================================
    // Settings Management
    // ========================================

    /**
     * Get settings
     * @returns {Object} Settings object
     */
    getSettings() {
        try {
            const data = localStorage.getItem(this.storageKeys.settings);
            return data ? JSON.parse(data) : this.getDefaultSettings();
        } catch (error) {
            console.error('Error getting settings:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Save settings
     * @param {Object} settings - Settings object
     * @returns {boolean} Success status
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.storageKeys.settings, JSON.stringify(settings));
            console.log('Settings saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    /**
     * Get default settings
     * @returns {Object} Default settings
     */
    getDefaultSettings() {
        return {
            emailIntegration: {
                service: 'emailjs',
                serviceId: '',
                templateId: '',
                userId: ''
            },
            notifications: {
                newRFQ: true,
                statusChanges: true,
                quoteExpiring: true
            },
            display: {
                theme: 'light',
                itemsPerPage: 25,
                defaultView: 'dashboard'
            },
            business: {
                companyName: 'TobroTech',
                defaultMarkup: 50,
                defaultLeadTime: '2-3 weeks'
            }
        };
    }

    // ========================================
    // Metrics and Analytics
    // ========================================

    /**
     * Get current metrics
     * @returns {Object} Metrics object
     */
    getMetrics() {
        try {
            const data = localStorage.getItem(this.storageKeys.metrics);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting metrics:', error);
            return null;
        }
    }

    /**
     * Update metrics based on current data
     * @param {Object} customMetrics - Optional custom metrics to merge
     */
    updateMetrics(customMetrics = {}) {
        try {
            const rfqs = this.getAllRFQs();
            const quotes = this.getAllQuotes();
            
            const rfqList = Object.values(rfqs);
            const quoteList = Object.values(quotes);
            
            const metrics = {
                totalRFQs: rfqList.length,
                pendingRFQs: rfqList.filter(rfq => rfq.status === 'new' || rfq.status === 'reviewing').length,
                activeQuotes: quoteList.filter(quote => quote.status === 'sent' || quote.status === 'negotiating').length,
                totalValue: quoteList.reduce((sum, quote) => sum + (quote.totalAmount || 0), 0),
                lastUpdated: new Date().toISOString(),
                ...customMetrics
            };

            localStorage.setItem(this.storageKeys.metrics, JSON.stringify(metrics));
            
            // Dispatch event for UI updates
            window.dispatchEvent(new CustomEvent('metricsUpdated', { detail: metrics }));
            
        } catch (error) {
            console.error('Error updating metrics:', error);
        }
    }

    // ========================================
    // Import/Export Functions
    // ========================================

    /**
     * Import RFQ data from JSON
     * @param {Object} rfqData - RFQ data from email attachment
     * @returns {Promise<string>} RFQ ID if successful
     */
    async importRFQData(rfqData) {
        try {
            // Create RFQ instance from imported data
            const rfq = new RFQ();
            rfq.fromImportData(rfqData);
            
            // Handle different customer data formats
            let customerData = null;
            if (rfqData.customerInfo) {
                // Legacy format
                customerData = rfqData.customerInfo;
            } else if (rfqData.rfq && rfqData.rfq.customer) {
                // New format from RFQ submission system
                customerData = rfqData.rfq.customer;
            } else {
                throw new Error('No customer information found in RFQ data');
            }
            
            // Ensure we have an email for customer lookup
            if (!customerData.email) {
                throw new Error('Customer email is required for RFQ import');
            }
            
            // Create/update customer if needed
            let customer = this.getCustomerByEmail(customerData.email);
            if (!customer) {
                customer = new Customer();
                customer.fromRFQData(customerData);
                this.saveCustomer(customer);
            } else {
                // Update customer with new information
                customer = new Customer(customer);
                customer.updateFromRFQ(customerData);
                this.saveCustomer(customer);
            }

            // Link customer to RFQ
            rfq.customerId = customer.id;
            
            // Save RFQ
            if (this.saveRFQ(rfq)) {
                console.log(`RFQ imported successfully: ${rfq.id}`);
                return rfq.id;
            } else {
                throw new Error('Failed to save imported RFQ');
            }
            
        } catch (error) {
            console.error('Error importing RFQ data:', error);
            throw error;
        }
    }

    /**
     * Export all data for backup
     * @returns {Object} Complete data export
     */
    exportAllData() {
        try {
            return {
                rfqs: this.getAllRFQs(),
                customers: this.getAllCustomers(),
                quotes: this.getAllQuotes(),
                settings: this.getSettings(),
                metrics: this.getMetrics(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    /**
     * Import complete data from backup
     * @param {Object} data - Complete data export
     * @returns {boolean} Success status
     */
    importAllData(data) {
        try {
            if (data.rfqs) {
                localStorage.setItem(this.storageKeys.rfqs, JSON.stringify(data.rfqs));
            }
            if (data.customers) {
                localStorage.setItem(this.storageKeys.customers, JSON.stringify(data.customers));
            }
            if (data.quotes) {
                localStorage.setItem(this.storageKeys.quotes, JSON.stringify(data.quotes));
            }
            if (data.settings) {
                localStorage.setItem(this.storageKeys.settings, JSON.stringify(data.settings));
            }
            if (data.metrics) {
                localStorage.setItem(this.storageKeys.metrics, JSON.stringify(data.metrics));
            }
            
            console.log('All data imported successfully');
            this.updateMetrics();
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // ========================================
    // Utility Functions
    // ========================================

    /**
     * Handle storage change events
     * @param {StorageEvent} event - Storage event
     */
    handleStorageChange(event) {
        if (Object.values(this.storageKeys).includes(event.key)) {
            console.log(`Storage updated: ${event.key}`);
            // Dispatch custom event for UI updates
            window.dispatchEvent(new CustomEvent('dataUpdated', { 
                detail: { key: event.key, newValue: event.newValue } 
            }));
        }
    }

    /**
     * Clear all data (use with caution)
     * @param {boolean} confirm - Confirmation flag
     */
    clearAllData(confirm = false) {
        if (!confirm) {
            console.warn('clearAllData requires confirmation');
            return false;
        }
        
        try {
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            
            this.initializeStorage();
            console.log('All data cleared successfully');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    /**
     * Get storage usage statistics
     * @returns {Object} Storage statistics
     */
    getStorageStats() {
        try {
            const stats = {};
            Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
                const data = localStorage.getItem(storageKey);
                stats[key] = {
                    size: data ? data.length : 0,
                    items: data ? Object.keys(JSON.parse(data)).length : 0
                };
            });
            
            return stats;
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {};
        }
    }
}

// Export for use in other modules
window.DataManager = DataManager; 