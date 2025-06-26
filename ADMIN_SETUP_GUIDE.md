# Admin Setup Guide: Receiving RFQ Data from Local System

## Overview

Your RFQ panel uses a **local-first approach** where prospects work entirely in their browser. When they submit an RFQ, the system packages all their data (including CAD files) and sends it to you via email. This guide shows you how to set up and manage the data flow.

## 🔧 Quick Setup (5 minutes)

### 1. Set Up EmailJS (Recommended)

**EmailJS** is the easiest way to receive RFQ submissions without a backend server.

1. **Create EmailJS Account**
   - Go to [emailjs.com](https://www.emailjs.com/)
   - Create free account (1000 emails/month free)

2. **Configure Email Service**
   - Add your email service (Gmail, Outlook, etc.)
   - Create email templates (see templates below)
   - Get your Public Key and Service ID

3. **Update Your Code**
   ```javascript
   // In rfq-panel.html, replace:
   emailjs.init("YOUR_PUBLIC_KEY"); // Replace with your actual key
   
   // In rfq-panel-system.js, replace:
   'YOUR_SERVICE_ID' // Replace with your actual service ID
   ```

### 2. Email Templates

Create these templates in EmailJS:

**Template 1: RFQ Submission Notification**
```
Subject: New RFQ Submission - {{rfq_number}}

New RFQ received from {{from_name}} ({{company}})

RFQ Details:
- Number: {{rfq_number}}
- Project: {{project_name}}
- Customer: {{from_name}} <{{from_email}}>
- Company: {{company}}
- Total Parts: {{total_parts}}
- Estimated Value: {{estimated_value}}
- CAD Files: {{has_cad_files}}
- Total File Size: {{total_file_size}}

Parts Summary:
{{parts_summary}}

Shipping Address:
{{shipping_address}}

Files: {{files_note}}

Submitted: {{submission_date}}

Reply to customer: {{from_email}}
```

**Template 2: Customer Confirmation**
```
Subject: RFQ {{rfq_number}} Received - TobroTech

Dear {{customer_name}},

Thank you for submitting RFQ {{rfq_number}}. We have received your request and will review it promptly.

Expected Response Time: {{expected_response}}
Submission Date: {{submission_date}}

We'll contact you soon with questions or a detailed quote.

Best regards,
TobroTech Team
```

## 📋 How It Works

### For Small Files (<10MB total)
1. Prospect submits RFQ
2. System packages all data + files
3. Sends email notification to you
4. Files attached as base64 in separate email
5. Customer gets confirmation email

### For Large Files (>10MB)
1. Prospect submits RFQ  
2. System creates downloadable package
3. Sends notification email to you
4. Customer gets instructions to send files separately
5. Files sent via WeTransfer/Dropbox with RFQ number

## 🔄 Processing RFQs

### Option 1: Email Processing (Current)
1. **Receive notification email** with RFQ details
2. **Download attached JSON file** with complete data
3. **Open admin-dashboard.html** in browser
4. **Drag & drop JSON file** to view/process

### Option 2: Webhook Integration (Advanced)
```javascript
// Add to rfq-panel-system.js
async sendViaAPI(submissionData) {
    const response = await fetch('/api/rfq-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
    });
    return response.json();
}
```

## 📊 Admin Dashboard Usage

1. **Open `admin-dashboard.html`** in your browser
2. **Drag JSON files** from email attachments
3. **View complete RFQ data** including:
   - Customer information
   - Part specifications  
   - File list with download links
   - Manufacturing requirements

4. **Actions available:**
   - Download individual files
   - Download complete package
   - Create quote (integrate with your system)
   - Export data for ERP/CRM

## 🔐 Data Flow Diagram

```
Prospect Browser          Email Service           Admin
    |                         |                    |
    |--- Upload CAD files --> |                    |
    |--- Fill specifications->|                    |
    |--- Submit RFQ --------> |                    |
    |                         |--- Email alert --> |
    |                         |--- JSON package -> |
    |                         |                    |
    |<-- Confirmation --------|                    |
                              |                <---|-- Download files
                              |                <---|-- Process quote
```

## 📁 File Management

### Small Files Processing
```javascript
// Files are base64 encoded in JSON
{
  "files": [
    {
      "id": "file-123",
      "name": "housing.step", 
      "size": 2048576,
      "type": "application/step",
      "partId": "part-001",
      "data": "base64encodedfiledata..."
    }
  ]
}
```

### Large Files Processing
- Customer gets download instructions
- Files sent via secure transfer
- Reference RFQ number for tracking

## ⚡ Quick Start Checklist

- [ ] Set up EmailJS account
- [ ] Create email templates
- [ ] Update keys in rfq-panel.html
- [ ] Test submission with sample RFQ
- [ ] Bookmark admin-dashboard.html
- [ ] Set up file storage workflow

## 🛠 Advanced Integrations

### CRM Integration
```javascript
// Example: Send to CRM after processing
async sendToCRM(rfqData) {
    await fetch('https://api.yourcrm.com/leads', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
        body: JSON.stringify({
            name: rfqData.rfq.customer.name,
            email: rfqData.rfq.customer.email,
            company: rfqData.rfq.customer.company,
            source: 'RFQ Panel',
            value: rfqData.summary.estimatedValue
        })
    });
}
```

### ERP Integration
- Export RFQ data as CSV/Excel
- Import parts into manufacturing system
- Sync customer data

## 📞 Support

If you need help setting up:
1. Check EmailJS documentation
2. Test with small files first
3. Monitor browser console for errors
4. Verify email delivery

## 🎯 Benefits of This Approach

✅ **No server required** - Works immediately  
✅ **Privacy-first** - Files stay local until submission  
✅ **No signup friction** - Prospects start immediately  
✅ **Scalable** - Handles any file size  
✅ **Trackable** - All submissions logged  
✅ **Professional** - Automated confirmations 