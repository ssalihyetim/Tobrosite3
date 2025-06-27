# Supabase Integration Setup Guide

This guide will help you set up Supabase database integration for your TobroTech RFQ management system.

## Prerequisites

1. A Supabase account (free tier available)
2. Basic understanding of JavaScript and SQL
3. Access to your project files

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Set project name: `tobro-rfq-system`  - Tobrosite3
5. Set database password (save this securely!) - DhFK2t?KE8e&HV&
6. Choose a region close to your users
7. Click "Create new project"
8. Wait for project setup to complete (~2 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** https://nnnkszlkdinsfousfkzu.supabase.co
   - **anon public key** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubmtzemxrZGluc2ZvdXNma3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTA3MjQsImV4cCI6MjA2NjUyNjcyNH0.QpHBtgRIrB-XOXZ1Eov0Pc7zgjbew8uROEtuqZVey-Y
   - **personal access token** sbp_149609de092124958ef688475e77c520f328743a
   - **project_id** nnnkszlkdinsfousfkzu

## Step 3: Configure Your Application

1. Open `js/config/supabase-config.js`
2. Replace the placeholder values:

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_ACTUAL_SUPABASE_URL_HERE',
    anonKey: 'YOUR_ACTUAL_ANON_KEY_HERE',
    // ... rest of config
};
```

Example:
```javascript
const SUPABASE_CONFIG = {
    url: 'https://abcdefghijklmn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    // ... rest stays the same
};
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-schema.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema

This will create:
- `customers` table
- `rfqs` table  
- `parts` table
- `files` table
- `quotes` table
- `admin_settings` table
- Necessary indexes and triggers
- Row Level Security policies

## Step 5: Set Up Storage Buckets

1. In Supabase dashboard, go to **Storage**
2. Create the following buckets:

### RFQ Files Bucket
- **Name**: `rfq-files`
- **Public**: No (private)
- **File size limit**: 50MB
- **Allowed MIME types**: 
  ```
  application/pdf,image/jpeg,image/png,image/gif,application/zip,
  application/x-zip-compressed,text/plain,application/step,
  application/iges,application/x-step,model/step,model/iges,
  application/sla,model/stl
  ```

### CAD Files Bucket  
- **Name**: `cad-files`
- **Public**: No (private)
- **File size limit**: 100MB
- **Allowed MIME types**:
  ```
  application/step,application/iges,application/x-step,model/step,
  model/iges,application/sla,model/stl,application/x-solidworks,
  application/vnd.solidworks.part,application/vnd.solidworks.assembly,
  application/vnd.solidworks.drawing
  ```

### Documents Bucket
- **Name**: `documents`  
- **Public**: No (private)
- **File size limit**: 10MB
- **Allowed MIME types**:
  ```
  application/pdf,text/plain,application/msword,
  application/vnd.openxmlformats-officedocument.wordprocessingml.document
  ```

## Step 6: Set Up Authentication

### Create Admin User

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **Add user**
3. Choose **Create user**
4. Enter your admin email and password
5. Set **Email confirmed**: Yes
6. Click **Create user**

### Or Use Registration Code (Alternative)

If you prefer programmatic setup, you can use the registration function:

```javascript
// In browser console on your admin page:
await window.adminAuth.registerAdmin(
    'your-admin@email.com',
    'your-secure-password',
    'tobro-admin-setup-2024'  // Registration key from SupabaseAuth.js
);
```

## Step 7: Configure Row Level Security (Optional but Recommended)

The schema already includes basic RLS policies. For production, you may want to customize them:

1. Go to **Authentication** → **Policies**
2. Review the automatically created policies
3. Modify as needed for your security requirements

Example: Restrict admin access to specific email domains:
```sql
CREATE POLICY "Restrict admin access" ON rfqs
    FOR ALL USING (
        auth.email() LIKE '%@yourdomain.com' OR 
        auth.email() = 'admin@tobro.com'
    );
```

## Step 8: Test the Integration

1. Load your admin panel: `admin-panel.html`
2. Check browser console for:
   - "Supabase client initialized successfully"
   - "SupabaseDataManager initialized successfully"
   - "Using SupabaseDataManager for data persistence"
3. Look for connection status indicator in admin header
4. Try importing an RFQ to test database operations

## Step 9: Migration from localStorage (If you have existing data)

If you have existing RFQs in localStorage, you can migrate them:

1. Open browser console on your admin panel
2. Run the migration script:

```javascript
// Export existing localStorage data
const existingData = JSON.parse(localStorage.getItem('tobro_admin_rfqs') || '{}');

// Import each RFQ to Supabase
for (const [id, rfqData] of Object.entries(existingData)) {
    try {
        await window.adminDashboard.dataManager.importRFQData(rfqData);
        console.log(`Migrated RFQ: ${rfqData.rfqNumber}`);
    } catch (error) {
        console.error(`Failed to migrate RFQ ${id}:`, error);
    }
}

console.log('Migration complete!');
```

## Troubleshooting

### "Supabase not configured" Warning
- Check that you've updated `supabase-config.js` with your actual credentials
- Ensure the Supabase CDN script is loaded before your config script

### Connection Issues
- Verify your project URL and API key are correct
- Check browser network tab for any blocked requests
- Ensure your Supabase project is active (not paused)

### Database Errors
- Check that the schema was applied correctly in SQL Editor
- Verify Row Level Security policies allow your operations
- Check browser console for specific error messages

### File Upload Issues
- Ensure storage buckets are created with correct names
- Check file size limits and MIME type restrictions
- Verify bucket policies allow uploads for authenticated users

### Authentication Problems
- Make sure you have at least one admin user created
- Check that email confirmation is set to "Yes" for admin users
- Verify the admin registration key matches in `SupabaseAuth.js`

## Production Considerations

### Security
1. **Change the admin registration key** in `SupabaseAuth.js`
2. **Enable email confirmation** for production
3. **Set up proper RLS policies** for multi-tenant scenarios
4. **Use environment variables** for sensitive config (if using a build system)

### Performance
1. **Enable database connection pooling** in Supabase settings
2. **Set up database backups** in Supabase dashboard
3. **Monitor usage** in Supabase analytics

### Monitoring
1. Set up **Supabase alerts** for database usage
2. Monitor **API request limits** on your plan
3. Check **storage usage** regularly

## Fallback Strategy

The system is designed to gracefully fallback to localStorage if Supabase is unavailable:

- **Online**: Uses Supabase database and storage
- **Offline/Error**: Falls back to localStorage + IndexedDB
- **Seamless transition**: Users won't notice the difference

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Review Supabase logs in your dashboard
3. Verify your configuration matches this guide
4. Check that all files are uploaded correctly

## Cost Estimates

Supabase free tier includes:
- 500MB database storage
- 1GB file storage  
- 50,000 monthly API requests
- 50,000 monthly active users

For a typical small manufacturing company:
- **Free tier**: Suitable for 100-200 RFQs/month
- **Pro tier ($25/month)**: Suitable for 1000+ RFQs/month

Monitor your usage in the Supabase dashboard to plan upgrades.

---

**Next Steps**: Once setup is complete, your RFQ system will automatically use the cloud database for all new data while maintaining backward compatibility with existing localStorage data. 