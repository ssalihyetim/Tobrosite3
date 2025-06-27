/**
 * SupabaseDataManager - Database operations using Supabase
 * Replaces localStorage with proper database persistence
 */

class SupabaseDataManager {
    constructor() {
        this.client = null;
        this.isOnline = navigator.onLine;
        this.fallbackManager = null; // Fallback to localStorage when offline
        
        // Setup online/offline detection
        window.addEventListener('online', () => this.isOnline = true);
        window.addEventListener('offline', () => this.isOnline = false);
    }

    /**
     * Initialize Supabase connection
     */
    async init() {
        try {
            console.log('SupabaseDataManager: Starting initialization...');
            console.log('window.supabase available:', !!window.supabase);
            console.log('window.supabase type:', typeof window.supabase);
            console.log('window.supabase.createClient available:', typeof window.supabase?.createClient);
            console.log('window.getSupabaseClient available:', !!window.getSupabaseClient);
            console.log('global supabase available:', typeof supabase !== 'undefined');
            console.log('global supabase type:', typeof supabase);
            console.log('global supabase.createClient available:', typeof supabase?.createClient);
            console.log('SUPABASE_CONFIG:', window.SUPABASE_CONFIG);
            
            // Always create a fresh client to ensure proper configuration
            if (window.SUPABASE_CONFIG) {
                // Try different ways to access the Supabase library
                let supabaseLib = null;
                
                if (window.supabase && typeof window.supabase.createClient === 'function') {
                    // Supabase library is available as window.supabase
                    supabaseLib = window.supabase;
                    console.log('SupabaseDataManager: Found Supabase library at window.supabase');
                } else if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
                    // Supabase library is available as global supabase
                    supabaseLib = supabase;
                    console.log('SupabaseDataManager: Found Supabase library as global supabase');
                } else if (window.supabase && window.supabase.constructor && window.supabase.constructor.createClient) {
                    // Try to get the constructor from existing client
                    supabaseLib = window.supabase.constructor;
                    console.log('SupabaseDataManager: Found Supabase library via constructor');
                }
                
                if (supabaseLib) {
                    console.log('SupabaseDataManager: Creating fresh Supabase client with config:', {
                        url: window.SUPABASE_CONFIG.url,
                        keyExists: !!window.SUPABASE_CONFIG.anonKey,
                        keyPreview: window.SUPABASE_CONFIG.anonKey?.substring(0, 20) + '...'
                    });
                    this.client = supabaseLib.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
                    console.log('SupabaseDataManager: Created fresh Supabase client');
                    console.log('Client URL:', this.client?.supabaseUrl);
                    console.log('Client Key exists:', !!this.client?.supabaseKey);
                } else {
                    console.warn('SupabaseDataManager: No Supabase library found, checking for existing client...');
                }
            }
            
            // Fallback: use existing client if no library found
            if (!this.client && window.getSupabaseClient) {
                this.client = window.getSupabaseClient();
                console.log('SupabaseDataManager: Using getSupabaseClient() as fallback');
                console.log('Client URL:', this.client?.supabaseUrl);
                console.log('Client Key exists:', !!this.client?.supabaseKey);
            } else if (!this.client && window.supabase) {
                this.client = window.supabase;
                console.log('SupabaseDataManager: Using global Supabase client as final fallback');
                console.log('Client URL:', this.client?.supabaseUrl);
                console.log('Client Key exists:', !!this.client?.supabaseKey);
            }
            
            if (!this.client) {
                console.warn('SupabaseDataManager: No Supabase client available, falling back to localStorage');
                // Try to initialize fallback manager
                if (window.DataManager) {
                    this.fallbackManager = new window.DataManager();
                }
                return false;
            }
            
            console.log('SupabaseDataManager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize SupabaseDataManager:', error);
            // Try to initialize fallback manager
            if (window.DataManager) {
                this.fallbackManager = new window.DataManager();
            }
            return false;
        }
    }

    /**
     * Check if Supabase is available
     */
    isSupabaseAvailable() {
        const isAvailable = this.client && this.isOnline;
        if (!isAvailable) {
            console.log('SupabaseDataManager: isSupabaseAvailable check:', {
                hasClient: !!this.client,
                isOnline: this.isOnline
            });
        }
        return isAvailable;
    }

    /**
     * Execute with fallback to localStorage
     */
    async executeWithFallback(supabaseOperation, fallbackOperation) {
        if (this.isSupabaseAvailable()) {
            try {
                return await supabaseOperation();
            } catch (error) {
                console.warn('Supabase operation failed, falling back to localStorage:', error);
                if (this.fallbackManager && fallbackOperation) {
                    return fallbackOperation();
                }
                throw error;
            }
        } else if (this.fallbackManager && fallbackOperation) {
            return fallbackOperation();
        } else {
            throw new Error('No data storage available');
        }
    }

    // ========================================
    // RFQ Operations
    // ========================================

    /**
     * Save RFQ to database
     */
    async saveRFQ(rfq) {
        const rfqData = typeof rfq.toJSON === 'function' ? rfq.toJSON() : rfq;
        
        return this.executeWithFallback(
            async () => {
                // Prepare RFQ data, only include created_at if it exists
                const rfqInsertData = {
                    id: rfqData.id,
                    rfq_number: rfqData.rfq_number || rfqData.rfqNumber,
                    customer_id: rfqData.customer_id || rfqData.customerId,
                    customer_info: rfqData.customerInfo,
                    title: rfqData.title,
                    description: rfqData.description,
                    requirements: rfqData.requirements,
                    status: rfqData.status,
                    priority: rfqData.priority,
                    requested_delivery: rfqData.requested_delivery || rfqData.requestedDelivery,
                    quote_due_date: rfqData.quote_due_date || rfqData.quoteDueDate,
                    total_parts: rfqData.total_parts || rfqData.totalParts,
                    total_quantity: rfqData.total_quantity || rfqData.totalQuantity,
                    services: rfqData.services,
                    materials: rfqData.materials,
                    surface_finishes: rfqData.surface_finishes || rfqData.surfaceFinishes,
                    tolerances: rfqData.tolerances,
                    special_requirements: rfqData.specialRequirements || rfqData.special_requirements,
                    estimated_value: rfqData.estimated_value || rfqData.estimatedValue,
                    actual_value: rfqData.actual_value || rfqData.actualValue,
                    margin: rfqData.margin,
                    source: rfqData.source,
                    assigned_to: rfqData.assigned_to || rfqData.assignedTo,
                    tags: rfqData.tags,
                    notes: rfqData.notes,
                    timeline: rfqData.timeline,
                    quotes: rfqData.quotes,
                    updated_at: new Date().toISOString(),
                    submitted_at: rfqData.submitted_at || rfqData.submittedAt,
                    reviewed_at: rfqData.reviewed_at || rfqData.reviewedAt,
                    quoted_at: rfqData.quoted_at || rfqData.quotedAt,
                    closed_at: rfqData.closed_at || rfqData.closedAt,
                    email_data: rfqData.email_data || rfqData.emailData
                };
                
                // Only include created_at if it's not null/undefined (let DB set default otherwise)
                if (rfqData.createdAt) {
                    rfqInsertData.created_at = rfqData.createdAt;
                }

                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.rfqs)
                    .upsert([rfqInsertData], { 
                        onConflict: 'rfq_number',
                        ignoreDuplicates: false 
                    })
                    .select();

                if (error) throw error;
                
                // Save associated parts
                if (rfqData.parts && rfqData.parts.length > 0) {
                    await this.saveParts(rfqData.parts, rfqData.id);
                }
                
                console.log(`RFQ ${rfqData.id} saved to Supabase`);
                return true;
            },
            () => this.fallbackManager?.saveRFQ(rfq)
        );
    }

    /**
     * Get RFQ by ID
     */
    async getRFQ(rfqId) {
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.rfqs)
                    .select(`
                        *,
                        parts (*, files(*))
                    `)
                    .eq('id', rfqId)
                    .single();

                if (error) {
                    if (error.code === 'PGRST116') return null; // Not found
                    throw error;
                }
                
                return this.formatRFQFromDatabase(data);
            },
            () => this.fallbackManager?.getRFQ(rfqId)
        );
    }

    /**
     * Get all RFQs
     */
    async getAllRFQs() {
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.rfqs)
                    .select(`
                        *,
                        parts (*),
                        files (*)
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                
                const rfqs = {};
                data.forEach(rfq => {
                    rfqs[rfq.id] = this.formatRFQFromDatabase(rfq);
                });
                
                return rfqs;
            },
            () => this.fallbackManager?.getAllRFQs() || {}
        );
    }

    /**
     * Get RFQs by number prefix (for checking duplicates)
     */
    async getRFQsByNumberPrefix(prefix) {
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.rfqs)
                    .select('rfq_number')
                    .like('rfq_number', `${prefix}%`);

                if (error) throw error;
                
                return data || [];
            },
            () => {
                // Fallback to localStorage if available
                if (this.fallbackManager && this.fallbackManager.getAllRFQs) {
                    const allRFQs = this.fallbackManager.getAllRFQs();
                    return allRFQs.filter(rfq => rfq.number && rfq.number.startsWith(prefix));
                }
                return [];
            }
        );
    }

    /**
     * Delete RFQ
     */
    async deleteRFQ(rfqId) {
        return this.executeWithFallback(
            async () => {
                // Delete associated parts first
                await this.client
                    .from(SUPABASE_CONFIG.tables.parts)
                    .delete()
                    .eq('rfq_id', rfqId);
                
                // Delete RFQ
                const { error } = await this.client
                    .from(SUPABASE_CONFIG.tables.rfqs)
                    .delete()
                    .eq('id', rfqId);

                if (error) throw error;
                
                console.log(`RFQ ${rfqId} deleted from Supabase`);
                return true;
            },
            () => this.fallbackManager?.deleteRFQ(rfqId)
        );
    }

    /**
     * Update RFQ status
     */
    async updateRFQStatus(rfqId, status, note = '') {
        return this.executeWithFallback(
            async () => {
                const timelineEntry = {
                    date: new Date().toISOString(),
                    action: `Status changed to ${status}`,
                    user: 'Admin',
                    note: note
                };

                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.rfqs)
                    .update({
                        status: status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', rfqId)
                    .select()
                    .single();

                if (error) throw error;

                // Add timeline entry
                const currentTimeline = data.timeline || [];
                currentTimeline.push(timelineEntry);
                
                await this.client
                    .from(SUPABASE_CONFIG.tables.rfqs)
                    .update({
                        timeline: currentTimeline
                    })
                    .eq('id', rfqId);

                return true;
            },
            () => this.fallbackManager?.updateRFQStatus(rfqId, status, note)
        );
    }

    // ========================================
    // Parts Operations
    // ========================================

    /**
     * Save parts for an RFQ
     */
    async saveParts(parts, rfqId) {
        if (!this.isSupabaseAvailable()) {
            return true; // Parts are included in RFQ data for localStorage fallback
        }

        try {
            const partsData = parts.map(part => ({
                id: part.id,
                rfq_id: rfqId,
                name: part.name,
                quantity: part.quantity,
                material: part.material,
                surface_finish: part.finish,
                description: part.description,
                specifications: part.specifications,
                file_ids: part.fileIds,
                estimated_value: part.estimatedValue,
                status: part.status
            }));

            const { error } = await this.client
                .from(SUPABASE_CONFIG.tables.parts)
                .upsert(partsData);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Failed to save parts:', error);
            throw error;
        }
    }

    // ========================================
    // Customer Operations
    // ========================================

    /**
     * Save customer
     */
    async saveCustomer(customer) {
        const customerData = typeof customer.toJSON === 'function' ? customer.toJSON() : customer;
        
        return this.executeWithFallback(
            async () => {
                // Prepare customer data, only include created_at if it exists
                const customerInsertData = {
                    id: customerData.id,
                    name: customerData.name,
                    email: customerData.email,
                    company: customerData.company,
                    phone: customerData.phone,
                    address: customerData.address,
                    updated_at: new Date().toISOString()
                };
                
                // Only include created_at if it's not null/undefined (let DB set default otherwise)
                if (customerData.createdAt) {
                    customerInsertData.created_at = customerData.createdAt;
                }

                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.customers)
                    .upsert([customerInsertData], { 
                        onConflict: 'email',
                        ignoreDuplicates: false 
                    })
                    .select();

                if (error) throw error;
                return true;
            },
            () => this.fallbackManager?.saveCustomer(customer)
        );
    }

    /**
     * Get customer by ID
     */
    async getCustomer(customerId) {
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.customers)
                    .select('*')
                    .eq('id', customerId)
                    .single();

                if (error) {
                    if (error.code === 'PGRST116') return null;
                    throw error;
                }
                
                return data;
            },
            () => this.fallbackManager?.getCustomer(customerId)
        );
    }

    /**
     * Get customer by email
     */
    async getCustomerByEmail(email) {
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.customers)
                    .select('*')
                    .eq('email', email)
                    .single();

                if (error) {
                    if (error.code === 'PGRST116') return null;
                    throw error;
                }
                
                return data;
            },
            () => this.fallbackManager?.getCustomerByEmail(email)
        );
    }

    /**
     * Get all customers
     */
    async getAllCustomers() {
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.customers)
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                
                const customers = {};
                data.forEach(customer => {
                    customers[customer.id] = customer;
                });
                
                return customers;
            },
            () => this.fallbackManager?.getAllCustomers() || {}
        );
    }

    // ========================================
    // File Operations with Supabase Storage
    // ========================================

    /**
     * Upload a file to Supabase storage and save its metadata
     */
    async uploadFile(file, rfqId, fileId, partId) {
        if (!this.isSupabaseAvailable()) {
            // Fallback to IndexedDB for offline storage
            if (window.fileStorage) {
                return await window.fileStorage.storeFile(fileId, file, { rfqId, partId });
            }
            throw new Error('File storage not available');
        }

        try {
            const fileName = `${rfqId}/${fileId}_${file.name}`;
            
            const { data, error } = await this.client.storage
                .from(SUPABASE_CONFIG.buckets.rfq_files)
                .upload(fileName, file);

            if (error) throw error;

            // Save file metadata to database
            const metadata = {
                id: fileId,
                rfq_id: rfqId,
                part_id: partId,
                filename: file.name,
                file_path: data.path,
                file_size: file.size,
                content_type: file.type,
                uploaded_at: new Date().toISOString()
            };
            
            await this.saveFileMetadata(metadata);

            return {
                id: fileId,
                path: data.path,
                url: this.getFileUrl(data.path)
            };
        } catch (error) {
            console.error('File upload failed:', error);
            throw error;
        }
    }

    /**
     * Get file URL
     */
    getFileUrl(filePath) {
        if (!this.isSupabaseAvailable()) return null;
        
        const { data } = this.client.storage
            .from(SUPABASE_CONFIG.buckets.rfq_files)
            .getPublicUrl(filePath);
            
        return data.publicUrl;
    }

    /**
     * Delete file
     */
    async deleteFile(fileId) {
        if (!this.isSupabaseAvailable()) {
            if (window.fileStorage) {
                return await window.fileStorage.deleteFile(fileId);
            }
            return false;
        }

        try {
            // Get file path from database
            const { data: fileData, error: fetchError } = await this.client
                .from(SUPABASE_CONFIG.tables.files)
                .select('file_path')
                .eq('id', fileId)
                .single();

            if (fetchError) throw fetchError;

            // Delete from storage
            const { error: storageError } = await this.client.storage
                .from(SUPABASE_CONFIG.buckets.rfq_files)
                .remove([fileData.file_path]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await this.client
                .from(SUPABASE_CONFIG.tables.files)
                .delete()
                .eq('id', fileId);

            if (dbError) throw dbError;

            return true;
        } catch (error) {
            console.error('File deletion failed:', error);
            throw error;
        }
    }

    // ========================================
    // Utility Methods
    // ========================================

    /**
     * Format RFQ data from database to match existing structure
     */
    formatRFQFromDatabase(dbRFQ) {
        const parts = dbRFQ.parts || [];
        const allFiles = parts.flatMap(p => p.files || []);

        return {
            id: dbRFQ.id,
            rfqNumber: dbRFQ.rfq_number,
            customerId: dbRFQ.customer_id,
            customerInfo: dbRFQ.customer_info,
            customer: dbRFQ.customer_info || { name: null, email: null, company: null },
            title: dbRFQ.title,
            description: dbRFQ.description,
            requirements: dbRFQ.requirements,
            status: dbRFQ.status,
            priority: dbRFQ.priority,
            requestedDelivery: dbRFQ.requested_delivery,
            quoteDueDate: dbRFQ.quote_due_date,
            parts: parts, 
            files: allFiles,
            totalParts: dbRFQ.total_parts,
            totalQuantity: dbRFQ.total_quantity,
            services: dbRFQ.services,
            materials: dbRFQ.materials,
            surfaceFinishes: dbRFQ.surface_finishes,
            tolerances: dbRFQ.tolerances,
            specialRequirements: dbRFQ.special_requirements,
            estimatedValue: dbRFQ.estimated_value,
            actualValue: dbRFQ.actual_value,
            margin: dbRFQ.margin,
            source: dbRFQ.source,
            assignedTo: dbRFQ.assigned_to,
            tags: dbRFQ.tags,
            notes: dbRFQ.notes,
            timeline: dbRFQ.timeline,
            quotes: dbRFQ.quotes,
            createdAt: dbRFQ.created_at,
            updatedAt: dbRFQ.updated_at,
            submittedAt: dbRFQ.submitted_at,
            reviewedAt: dbRFQ.reviewed_at,
            quotedAt: dbRFQ.quoted_at,
            closedAt: dbRFQ.closed_at,
            emailData: dbRFQ.email_data
        };
    }

    /**
     * Import RFQ data (maintain compatibility with existing system)
     */
    async importRFQData(rfqData) {
        try {
            // Create RFQ instance
            const rfq = new RFQ();
            rfq.fromImportData(rfqData);
            
            // Save to database
            await this.saveRFQ(rfq);
            
            // Handle customer data
            if (rfq.customerInfo && rfq.customerInfo.email) {
                let customer = await this.getCustomerByEmail(rfq.customerInfo.email);
                if (!customer) {
                    customer = new Customer({
                        name: rfq.customerInfo.name,
                        email: rfq.customerInfo.email,
                        company: rfq.customerInfo.company,
                        phone: rfq.customerInfo.phone,
                        address: rfq.customerInfo.address
                    });
                    await this.saveCustomer(customer);
                    rfq.customerId = customer.id;
                    await this.saveRFQ(rfq); // Update with customer ID
                }
            }
            
            return rfq;
        } catch (error) {
            console.error('Failed to import RFQ data:', error);
            // Fallback to localStorage import
            if (this.fallbackManager) {
                return await this.fallbackManager.importRFQData(rfqData);
            }
            throw error;
        }
    }

    // ========================================
    // Metrics Operations (for Dashboard Compatibility)
    // ========================================

    /**
     * Get metrics for dashboard
     */
    getMetrics() {
        if (!this.isSupabaseAvailable() && this.fallbackManager) {
            return this.fallbackManager.getMetrics();
        }

        // For Supabase, we'll calculate metrics from the database
        // This is a synchronous method for compatibility, so we return cached metrics
        const cached = localStorage.getItem('supabase_cached_metrics');
        if (cached) {
            return JSON.parse(cached);
        }

        // Return default metrics if no cache
        return {
            totalRFQs: 0,
            pendingRFQs: 0,
            activeQuotes: 0,
            totalValue: 0,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Update metrics (calculate and cache)
     */
    async updateMetrics(customMetrics = {}) {
        if (!this.isSupabaseAvailable() && this.fallbackManager) {
            return this.fallbackManager.updateMetrics(customMetrics);
        }

        try {
            // Calculate metrics from Supabase data
            const { data: rfqs, error } = await this.client
                .from(SUPABASE_CONFIG.tables.rfqs)
                .select('status, estimated_value, actual_value');

            if (error) throw error;

            const metrics = {
                totalRFQs: rfqs.length,
                pendingRFQs: rfqs.filter(rfq => rfq.status === 'new' || rfq.status === 'reviewing').length,
                activeQuotes: rfqs.filter(rfq => rfq.status === 'quoted').length,
                totalValue: rfqs.reduce((sum, rfq) => sum + (rfq.estimated_value || 0), 0),
                lastUpdated: new Date().toISOString(),
                ...customMetrics
            };

            // Cache metrics for synchronous access
            localStorage.setItem('supabase_cached_metrics', JSON.stringify(metrics));

            return metrics;
        } catch (error) {
            console.error('Failed to update metrics:', error);
            if (this.fallbackManager) {
                return this.fallbackManager.updateMetrics(customMetrics);
            }
            throw error;
        }
    }

    /**
     * Get all quotes (for compatibility)
     */
    async getAllQuotes() {
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.quotes)
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                
                const quotes = {};
                data.forEach(quote => {
                    quotes[quote.id] = quote;
                });
                
                return quotes;
            },
            () => this.fallbackManager?.getAllQuotes() || {}
        );
    }

    /**
     * Save quote
     */
    async saveQuote(quote) {
        const quoteData = typeof quote.toJSON === 'function' ? quote.toJSON() : quote;
        
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.quotes)
                    .upsert([{
                        id: quoteData.id,
                        rfq_id: quoteData.rfqId,
                        quote_number: quoteData.quoteNumber,
                        total_amount: quoteData.totalAmount,
                        currency: quoteData.currency,
                        validity_days: quoteData.validityDays,
                        terms_conditions: quoteData.termsConditions,
                        delivery_time: quoteData.deliveryTime,
                        payment_terms: quoteData.paymentTerms,
                        status: quoteData.status,
                        created_by: quoteData.createdBy,
                        created_at: quoteData.createdAt,
                        updated_at: new Date().toISOString(),
                        sent_at: quoteData.sentAt,
                        responded_at: quoteData.respondedAt
                    }])
                    .select();

                if (error) throw error;
                return true;
            },
            () => this.fallbackManager?.saveQuote(quote)
        );
    }

    /**
     * Get quote by ID
     */
    async getQuote(quoteId) {
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.quotes)
                    .select('*')
                    .eq('id', quoteId)
                    .single();

                if (error) {
                    if (error.code === 'PGRST116') return null;
                    throw error;
                }
                
                return data;
            },
            () => this.fallbackManager?.getQuote(quoteId)
        );
    }

    /**
     * Get quotes by RFQ ID
     */
    async getQuotesByRFQ(rfqId) {
        return this.executeWithFallback(
            async () => {
                const { data, error } = await this.client
                    .from(SUPABASE_CONFIG.tables.quotes)
                    .select('*')
                    .eq('rfq_id', rfqId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data;
            },
            () => this.fallbackManager?.getQuotesByRFQ(rfqId) || []
        );
    }

    /**
     * Clear all data (for development/testing)
     */
    async clearAllData(confirm = false) {
        if (!confirm) {
            throw new Error('Data clearing requires confirmation');
        }

        if (this.fallbackManager) {
            this.fallbackManager.clearAllData(confirm);
        }

        if (this.isSupabaseAvailable()) {
            // Clear Supabase data (be very careful with this!)
            console.warn('Clearing Supabase data - this cannot be undone!');
            
            // Delete in correct order due to foreign key constraints
            await this.client.from(SUPABASE_CONFIG.tables.parts).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await this.client.from(SUPABASE_CONFIG.tables.files).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await this.client.from(SUPABASE_CONFIG.tables.quotes).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await this.client.from(SUPABASE_CONFIG.tables.rfqs).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await this.client.from(SUPABASE_CONFIG.tables.customers).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        // Clear cached metrics
        localStorage.removeItem('supabase_cached_metrics');
    }

    /**
     * Export all data
     */
    async exportAllData() {
        const data = {
            rfqs: await this.getAllRFQs(),
            customers: await this.getAllCustomers(),
            quotes: await this.getAllQuotes(),
            exportDate: new Date().toISOString(),
            source: this.isSupabaseAvailable() ? 'supabase' : 'localStorage'
        };

        return data;
    }

    /**
     * Save file metadata to database
     */
    async saveFileMetadata(fileData) {
        if (!this.isSupabaseAvailable()) {
            console.warn('Cannot save file metadata, Supabase not available');
            return;
        }

        try {
            const { error } = await this.client
                .from(SUPABASE_CONFIG.tables.files)
                .insert([fileData]);

            if (error) throw error;
            console.log(`File metadata saved for: ${fileData.filename}`);
        } catch (error) {
            console.error('Error saving file metadata:', error);
            throw error;
        }
    }

    /**
     * Get connection status and metrics
     */
    async getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            supabaseAvailable: this.isSupabaseAvailable(),
            fallbackAvailable: !!this.fallbackManager
        };
    }
}

// Make SupabaseDataManager available globally
if (typeof window !== 'undefined') {
    window.SupabaseDataManager = SupabaseDataManager;
    console.log('SupabaseDataManager loaded and available globally');
}

// Export for Node.js environment (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseDataManager;
} 