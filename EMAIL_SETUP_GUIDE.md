# EmailJS Setup Guide for TobroTech RFQ System

## 🚀 Quick Setup (5 minutes)

### Step 1: Create EmailJS Account
1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

### Step 2: Add Email Service
1. In EmailJS dashboard, click "Email Services"
2. Click "Add New Service"
3. Choose your email provider:
   - **Gmail** (recommended for testing)
   - **Outlook/Hotmail**
   - **Custom SMTP** (for business emails)
4. Follow the setup instructions for your provider
5. **Copy the Service ID** (e.g., `service_abc123`)

### Step 3: Create Email Templates

#### Admin Notification Template
1. Click "Email Templates" → "Create New Template"
2. **Template ID**: `template_admin_rfq`
3. **Template Content**:

```html
Subject: New RFQ Submission - {{rfq_number}}

Hello Admin,

A new RFQ has been submitted through the TobroTech website.

CUSTOMER INFORMATION:
- Name: {{from_name}}
- Email: {{from_email}}
- Company: {{company}}

RFQ DETAILS:
- RFQ Number: {{rfq_number}}
- Project: {{project_name}}
- Total Parts: {{total_parts}}
- Total Files: {{total_files}}
- Estimated Value: {{estimated_value}}
- CAD Files: {{has_cad_files}}
- Total File Size: {{total_file_size}}

PARTS SUMMARY:
{{parts_summary}}

SHIPPING ADDRESS:
{{shipping_address}}

SUBMISSION INFO:
- Date: {{submission_date}}
- Time: {{submission_time}}

COMPLETE RFQ DATA:
{{rfq_data}}

PROCESSING ERRORS (if any):
{{processing_errors}}

Please review and respond within 24-48 hours.

Best regards,
TobroTech RFQ System
```

#### Customer Confirmation Template
1. Create another template with **Template ID**: `template_customer_confirm`
2. **Template Content**:

```html
Subject: RFQ Confirmation - {{rfq_number}}

Dear {{customer_name}},

Thank you for submitting your RFQ through TobroTech!

RFQ CONFIRMATION:
- RFQ Number: {{rfq_number}}
- Project: {{project_name}}
- Total Parts: {{total_parts}}
- Submission Date: {{submission_date}}

NEXT STEPS:
✓ Your RFQ is being reviewed by our engineering team
✓ We'll analyze your specifications and CAD files
✓ You'll receive a detailed quote within {{expected_response}}

QUESTIONS?
If you have any questions or need to provide additional information, 
please contact us at {{admin_contact}} or reply to this email.

Thank you for choosing TobroTech for your precision machining needs!

Best regards,
TobroTech Sales Team
Phone: (555) 123-4567
Email: sales@tobrotech.com
```

### Step 4: Configure Public Key
1. Go to "Account" → "General"
2. **Copy your Public Key** (e.g., `user_abc123xyz`)

### Step 5: Update Your Website Code

#### Option A: Update the configuration file
Create/edit `js/emailjs-config.js`:

```javascript
// EmailJS Configuration
window.emailjsConfig = {
    serviceId: 'service_YOUR_SERVICE_ID',    // Replace with your Service ID
    templateIds: {
        admin: 'template_admin_rfq',         // Admin notification template
        customer: 'template_customer_confirm' // Customer confirmation template
    },
    publicKey: 'user_YOUR_PUBLIC_KEY'        // Replace with your Public Key
};
```

#### Option B: Update existing files
In `js/rfq-submission-fix.js`, update lines:
```javascript
this.emailServiceConfig = {
    serviceId: 'service_YOUR_ACTUAL_ID',     // Replace with your Service ID
    templateIds: {
        admin: 'template_admin_rfq',
        customer: 'template_customer_confirm'
    },
    publicKey: 'user_YOUR_ACTUAL_KEY',       // Replace with your Public Key
    isConfigured: true                       // Change to true
};
```

### Step 6: Test the Setup
1. Open your RFQ panel
2. Create a test RFQ with a few parts
3. Submit the RFQ
4. Check:
   - Admin email received the RFQ data
   - Customer received confirmation email
   - No console errors

---

## 🔧 Advanced Configuration

### Custom SMTP Setup (Business Email)
If using your own business email (recommended for production):

1. In EmailJS, choose "Custom SMTP"
2. Enter your email server settings:
   - **SMTP Server**: mail.yourcompany.com
   - **Port**: 587 (TLS) or 465 (SSL)
   - **Username**: your-email@yourcompany.com
   - **Password**: your-email-password

### Email Limits and Pricing
- **Free Plan**: 200 emails/month
- **Paid Plans**: Start at $15/month for 5,000 emails
- **File Attachments**: Up to 50MB total per email

### Security Best Practices
1. **Never expose private keys** in client-side code
2. **Use template restrictions** in EmailJS dashboard
3. **Set up domain restrictions** for your public key
4. **Monitor usage** to prevent abuse

---

## 🐛 Troubleshooting

### Common Issues:

#### "The Public Key is invalid"
- Check that your public key is correct
- Ensure it starts with `user_`
- Verify the key is active in your EmailJS account

#### "Service not found"
- Verify your Service ID is correct
- Check that the email service is properly configured
- Ensure the service is active

#### "Template not found"
- Check template IDs match exactly
- Verify templates are published (not draft)
- Test templates individually in EmailJS dashboard

#### Files not sending
- Check file size limits (10MB per email)
- Verify files are properly stored in IndexedDB
- Check browser console for storage errors

#### Emails not received
- Check spam folders
- Verify email addresses are correct
- Test with different email providers
- Check EmailJS dashboard for send logs

### Debug Mode
Add this to test EmailJS connection:
```javascript
// Test EmailJS configuration
async function testEmailJS() {
    try {
        const result = await emailjs.send(
            'your_service_id',
            'your_template_id',
            { test_message: 'Hello from TobroTech!' }
        );
        console.log('EmailJS test successful:', result);
    } catch (error) {
        console.error('EmailJS test failed:', error);
    }
}
```

---

## 📧 Email Template Variables Reference

### Available Variables:
- `{{from_name}}` - Customer name
- `{{from_email}}` - Customer email
- `{{company}}` - Customer company
- `{{rfq_number}}` - RFQ number
- `{{project_name}}` - Project name
- `{{total_parts}}` - Number of parts
- `{{total_files}}` - Number of files
- `{{estimated_value}}` - Estimated project value
- `{{has_cad_files}}` - Yes/No for CAD files
- `{{total_file_size}}` - Total file size
- `{{parts_summary}}` - Detailed parts list
- `{{submission_date}}` - Submission date
- `{{submission_time}}` - Submission time
- `{{shipping_address}}` - Shipping address
- `{{rfq_data}}` - Complete RFQ JSON data
- `{{processing_errors}}` - Any processing errors

---

## 🔄 Fallback System

If EmailJS fails or isn't configured, the system automatically:
1. **Downloads RFQ package** as JSON file
2. **Shows instructions** to email manually
3. **Provides admin email** for manual submission
4. **Maintains all data** for later processing

This ensures no RFQs are lost even if email service fails.

---

## 📞 Support

Need help with setup?
- Check the [EmailJS Documentation](https://www.emailjs.com/docs/)
- Email: support@tobrotech.com
- Phone: (555) 123-4567

**Setup should take less than 10 minutes!** 🚀 

// Open browser console and run:
await setupAdminPassword('YourSecurePassword123!'); 