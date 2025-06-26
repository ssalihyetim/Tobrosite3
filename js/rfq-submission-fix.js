/**
 * Enhanced RFQ Submission System
 * Fixes file storage issues and EmailJS configuration problems
 */

class EnhancedRFQSubmission {
    constructor() {
        this.emailServiceConfig = {
            serviceId: 'service_YOUR_ID', // Replace with actual EmailJS Service ID
            templateIds: {
                admin: 'template_admin_rfq',  // Replace with actual template ID
                customer: 'template_customer_confirm'  // Replace with actual template ID
            },
            publicKey: 'YOUR_PUBLIC_KEY', // Replace with actual EmailJS Public Key
            isConfigured: false
        };
        
        this.maxFileSize = 10 * 1024 * 1024; // 10MB limit for email
        this.maxTotalSize = 25 * 1024 * 1024; // 25MB total limit
    }

    /**
     * Initialize EmailJS with proper configuration
     */
    initEmailJS() {
        if (typeof emailjs === 'undefined') {
            console.error('EmailJS library not loaded');
            return false;
        }

        try {
            // Check if EmailJS is properly configured
            if (this.emailServiceConfig.publicKey === 'YOUR_PUBLIC_KEY') {
                console.warn('EmailJS not configured - using fallback submission method');
                return false;
            }

            emailjs.init(this.emailServiceConfig.publicKey);
            this.emailServiceConfig.isConfigured = true;
            console.log('EmailJS initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize EmailJS:', error);
            return false;
        }
    }

    /**
     * Enhanced RFQ submission with better error handling
     */
    async submitRFQ(rfqData, parts, onProgress = null) {
        try {
            // Step 1: Validate data
            const validation = this.validateSubmissionData(rfqData, parts);
            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            if (onProgress) onProgress(10, 'Validating data...');

            // Step 2: Collect and validate files
            if (onProgress) onProgress(20, 'Processing files...');
            const filesData = await this.collectAndValidateFiles(parts);

            // Step 3: Prepare submission package
            if (onProgress) onProgress(40, 'Preparing submission...');
            const submissionPackage = this.createSubmissionPackage(rfqData, parts, filesData);

            // Step 4: Choose submission method based on configuration and file size
            if (onProgress) onProgress(60, 'Sending RFQ...');
            
            if (this.emailServiceConfig.isConfigured && filesData.totalSize < this.maxTotalSize) {
                await this.submitViaEmailJS(submissionPackage, onProgress);
            } else {
                await this.submitViaFallback(submissionPackage, onProgress);
            }

            if (onProgress) onProgress(100, 'Submission complete!');
            return { success: true, method: this.emailServiceConfig.isConfigured ? 'email' : 'download' };

        } catch (error) {
            console.error('RFQ submission failed:', error);
            throw error;
        }
    }

    /**
     * Validate submission data
     */
    validateSubmissionData(rfqData, parts) {
        if (!rfqData) {
            return { isValid: false, message: 'RFQ data is required' };
        }

        if (!rfqData.customer || !rfqData.customer.name || !rfqData.customer.email) {
            return { isValid: false, message: 'Customer name and email are required' };
        }

        if (!parts || parts.length === 0) {
            return { isValid: false, message: 'At least one part is required' };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(rfqData.customer.email)) {
            return { isValid: false, message: 'Valid email address is required' };
        }

        return { isValid: true };
    }

    /**
     * Collect and validate files with better error handling
     */
    async collectAndValidateFiles(parts) {
        const filesData = {
            files: [],
            totalSize: 0,
            cadFiles: [],
            errors: []
        };

        for (const part of parts) {
            if (part.files && part.files.length > 0) {
                for (const fileRef of part.files) {
                    try {
                        const storedFile = await window.fileStorage.getFile(fileRef.id);
                        
                        if (!storedFile) {
                            console.warn(`File ${fileRef.id} not found in storage`);
                            filesData.errors.push(`File ${fileRef.name || fileRef.id} not found`);
                            continue;
                        }

                        if (!storedFile.file) {
                            console.warn(`File data missing for ${fileRef.id}`);
                            filesData.errors.push(`File data missing for ${fileRef.name || fileRef.id}`);
                            continue;
                        }

                        // Convert file to base64
                        const base64Data = await this.fileToBase64(storedFile.file);
                        
                        const fileData = {
                            id: fileRef.id,
                            name: storedFile.metadata.name,
                            size: storedFile.metadata.size,
                            type: storedFile.metadata.type,
                            partId: part.id,
                            partNumber: part.number,
                            data: base64Data
                        };

                        filesData.files.push(fileData);
                        filesData.totalSize += storedFile.metadata.size;

                        // Track CAD files
                        if (this.isCADFile(storedFile.metadata.name)) {
                            filesData.cadFiles.push(fileData);
                        }

                    } catch (error) {
                        console.error(`Error processing file ${fileRef.id}:`, error);
                        filesData.errors.push(`Error processing file ${fileRef.name || fileRef.id}: ${error.message}`);
                    }
                }
            }
        }

        return filesData;
    }

    /**
     * Create comprehensive submission package
     */
    createSubmissionPackage(rfqData, parts, filesData) {
        const submissionPackage = {
            rfq: {
                id: rfqData.id,
                number: rfqData.number,
                customer: rfqData.customer,
                project: rfqData.project,
                shipping: rfqData.shipping,
                created: rfqData.created,
                submittedAt: new Date().toISOString()
            },
            parts: parts.map(part => ({
                id: part.id,
                number: part.number,
                name: part.name,
                description: part.description,
                specifications: part.specifications,
                status: part.status,
                estimatedValue: part.estimatedValue || 0,
                fileCount: part.files ? part.files.length : 0,
                fileNames: part.files ? part.files.map(f => f.name) : []
            })),
            files: filesData.files,
            summary: {
                totalParts: parts.length,
                totalFiles: filesData.files.length,
                totalFileSize: filesData.totalSize,
                hasCADFiles: filesData.cadFiles.length > 0,
                cadFileCount: filesData.cadFiles.length,
                estimatedValue: parts.reduce((sum, part) => sum + (part.estimatedValue || 0), 0),
                processingErrors: filesData.errors
            },
            metadata: {
                version: '2.0',
                submissionMethod: 'web_form',
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        };

        return submissionPackage;
    }

    /**
     * Submit via EmailJS with improved error handling
     */
    async submitViaEmailJS(submissionPackage, onProgress = null) {
        try {
            // Prepare admin notification email
            const adminEmailData = {
                to_email: 'admin@tobrotech.com', // Update with your actual admin email
                from_name: submissionPackage.rfq.customer.name,
                from_email: submissionPackage.rfq.customer.email,
                company: submissionPackage.rfq.customer.company || 'Not specified',
                rfq_number: submissionPackage.rfq.number,
                project_name: submissionPackage.rfq.project.name || 'New Project',
                
                // Summary information
                total_parts: submissionPackage.summary.totalParts,
                total_files: submissionPackage.summary.totalFiles,
                estimated_value: `$${submissionPackage.summary.estimatedValue.toFixed(2)}`,
                has_cad_files: submissionPackage.summary.hasCADFiles ? 'Yes' : 'No',
                total_file_size: this.formatFileSize(submissionPackage.summary.totalFileSize),
                
                // Detailed parts information
                parts_summary: submissionPackage.parts.map(part => 
                    `${part.number}: ${part.name}\n` +
                    `- Quantity: ${part.specifications?.quantity || 1}\n` +
                    `- Material: ${part.specifications?.material || 'Not specified'}\n` +
                    `- Files: ${part.fileNames.join(', ') || 'None'}\n`
                ).join('\n'),
                
                // Complete RFQ data as JSON attachment
                rfq_data: JSON.stringify(submissionPackage, null, 2),
                
                submission_date: new Date().toLocaleDateString(),
                submission_time: new Date().toLocaleTimeString(),
                shipping_address: submissionPackage.rfq.shipping?.address || 'Not provided',
                
                // Error information if any
                processing_errors: submissionPackage.summary.processingErrors.length > 0 ? 
                    submissionPackage.summary.processingErrors.join('; ') : 'None'
            };

            if (onProgress) onProgress(70, 'Sending admin notification...');

            // Send admin notification
            const adminResponse = await emailjs.send(
                this.emailServiceConfig.serviceId,
                this.emailServiceConfig.templateIds.admin,
                adminEmailData
            );

            console.log('Admin notification sent:', adminResponse);

            if (onProgress) onProgress(85, 'Sending customer confirmation...');

            // Send customer confirmation
            const customerEmailData = {
                to_email: submissionPackage.rfq.customer.email,
                customer_name: submissionPackage.rfq.customer.name,
                rfq_number: submissionPackage.rfq.number,
                project_name: submissionPackage.rfq.project.name || 'New Project',
                total_parts: submissionPackage.summary.totalParts,
                submission_date: new Date().toLocaleDateString(),
                expected_response: '2-3 business days',
                admin_contact: 'sales@tobrotech.com'
            };

            const customerResponse = await emailjs.send(
                this.emailServiceConfig.serviceId,
                this.emailServiceConfig.templateIds.customer,
                customerEmailData
            );

            console.log('Customer confirmation sent:', customerResponse);

            if (onProgress) onProgress(95, 'Finalizing submission...');

        } catch (error) {
            console.error('EmailJS submission failed:', error);
            
            // If EmailJS fails, fall back to download method
            console.log('Falling back to download method...');
            await this.submitViaFallback(submissionPackage, onProgress);
        }
    }

    /**
     * Fallback submission method - creates downloadable package
     */
    async submitViaFallback(submissionPackage, onProgress = null) {
        try {
            if (onProgress) onProgress(70, 'Creating download package...');

            // Create JSON file for admin processing
            const jsonBlob = new Blob([JSON.stringify(submissionPackage, null, 2)], { 
                type: 'application/json' 
            });

            // Create download link
            const url = URL.createObjectURL(jsonBlob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `RFQ-${submissionPackage.rfq.number}-${Date.now()}.json`;
            downloadLink.style.display = 'none';

            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);

            if (onProgress) onProgress(90, 'Package downloaded...');

            // Show instructions to user
            this.showFallbackInstructions(submissionPackage.rfq.number);

            if (onProgress) onProgress(100, 'Please email the downloaded file...');

        } catch (error) {
            console.error('Fallback submission failed:', error);
            throw new Error('All submission methods failed. Please contact support.');
        }
    }

    /**
     * Show instructions for manual submission
     */
    showFallbackInstructions(rfqNumber) {
        const instructions = `
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #495057; margin-top: 0;">📁 RFQ Package Downloaded</h3>
                <p><strong>RFQ Number:</strong> ${rfqNumber}</p>
                <p>Your RFQ has been packaged and downloaded. To complete your submission:</p>
                <ol style="margin: 15px 0;">
                    <li><strong>Locate the downloaded file</strong> on your computer</li>
                    <li><strong>Email it to:</strong> <a href="mailto:sales@tobrotech.com">sales@tobrotech.com</a></li>
                    <li><strong>Subject:</strong> RFQ Submission - ${rfqNumber}</li>
                    <li><strong>Include a brief message</strong> about your project</li>
                </ol>
                <p style="margin-bottom: 0;"><strong>📞 Need help?</strong> Call us at (555) 123-4567</p>
            </div>
        `;

        // Create modal or notification
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 12px; max-width: 600px; margin: 20px; max-height: 90vh; overflow-y: auto;">
                    ${instructions}
                    <div style="text-align: center; padding: 0 20px 20px;">
                        <button onclick="this.closest('div').remove()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
                            Got it, thanks!
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Convert file to base64
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.split(',')[1]; // Remove data:mime;base64, prefix
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Check if file is a CAD file
     */
    isCADFile(filename) {
        const cadExtensions = ['.dwg', '.dxf', '.step', '.stp', '.iges', '.igs', '.stl', '.obj', '.3mf', '.amf'];
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return cadExtensions.includes(extension);
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Create global instance
window.enhancedRFQSubmission = new EnhancedRFQSubmission();

// Initialize when EmailJS is available
document.addEventListener('DOMContentLoaded', () => {
    if (typeof emailjs !== 'undefined') {
        window.enhancedRFQSubmission.initEmailJS();
    }
}); 