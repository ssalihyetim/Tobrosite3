/**
 * EmailJS Configuration for TobroTech RFQ System
 * 
 * To set up email submission:
 * 1. Create an account at https://www.emailjs.com/
 * 2. Set up your email service (Gmail, Outlook, etc.)
 * 3. Create the required email templates
 * 4. Replace the placeholder values below with your actual IDs
 * 5. Change isConfigured to true
 */

window.emailjsConfig = {
    // Set this to true after configuring your EmailJS account
    isConfigured: false,
    
    // Your EmailJS Service ID (from EmailJS dashboard)
    serviceId: 'service_YOUR_SERVICE_ID',
    
    // Your EmailJS Public Key (from EmailJS account settings)
    publicKey: 'user_YOUR_PUBLIC_KEY',
    
    // Template IDs for different email types
    templateIds: {
        // Admin notification template
        admin: 'template_admin_rfq',
        
        // Customer confirmation template
        customer: 'template_customer_confirm'
    },
    
    // Email addresses
    emails: {
        // Your admin/sales email address
        admin: 'sales@tobrotech.com',
        
        // Support email for fallback instructions
        support: 'support@tobrotech.com'
    }
};

// Initialize EmailJS if configured
if (window.emailjsConfig.isConfigured && typeof emailjs !== 'undefined') {
    try {
        emailjs.init(window.emailjsConfig.publicKey);
        console.log('EmailJS initialized successfully');
    } catch (error) {
        console.error('Failed to initialize EmailJS:', error);
        window.emailjsConfig.isConfigured = false;
    }
} 