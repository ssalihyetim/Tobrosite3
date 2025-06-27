-- TobroTech RFQ Management System - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CUSTOMERS TABLE
-- ========================================
CREATE TABLE customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    company TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on email for fast lookups
CREATE INDEX idx_customers_email ON customers(email);

-- ========================================
-- RFQS TABLE
-- ========================================
CREATE TABLE rfqs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rfq_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_info JSONB, -- Fallback customer info if no customer record
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'quoted', 'won', 'lost')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    requested_delivery DATE,
    quote_due_date DATE,
    total_parts INTEGER DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    services JSONB DEFAULT '[]'::jsonb,
    materials JSONB DEFAULT '[]'::jsonb,
    surface_finishes JSONB DEFAULT '[]'::jsonb,
    tolerances TEXT,
    special_requirements TEXT,
    estimated_value DECIMAL(12,2) DEFAULT 0,
    actual_value DECIMAL(12,2) DEFAULT 0,
    margin DECIMAL(5,2) DEFAULT 0,
    source TEXT DEFAULT 'web_form',
    assigned_to TEXT DEFAULT 'unassigned',
    tags JSONB DEFAULT '[]'::jsonb,
    notes JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    quotes JSONB DEFAULT '[]'::jsonb, -- Array of quote IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    quoted_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    email_data JSONB
);

-- Create indexes for efficient queries
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_priority ON rfqs(priority);
CREATE INDEX idx_rfqs_customer_id ON rfqs(customer_id);
CREATE INDEX idx_rfqs_created_at ON rfqs(created_at);
CREATE INDEX idx_rfqs_rfq_number ON rfqs(rfq_number);

-- ========================================
-- PARTS TABLE
-- ========================================
CREATE TABLE parts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    material TEXT,
    surface_finish TEXT,
    description TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,
    file_ids JSONB DEFAULT '[]'::jsonb,
    estimated_value DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on RFQ ID for fast lookups
CREATE INDEX idx_parts_rfq_id ON parts(rfq_id);

-- ========================================
-- FILES TABLE (for file metadata)
-- ========================================
CREATE TABLE files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase Storage path
    file_size BIGINT,
    content_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on RFQ ID for fast lookups
CREATE INDEX idx_files_rfq_id ON files(rfq_id);

-- ========================================
-- QUOTES TABLE
-- ========================================
CREATE TABLE quotes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    quote_number TEXT UNIQUE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    validity_days INTEGER DEFAULT 30,
    terms_conditions TEXT,
    delivery_time TEXT,
    payment_terms TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    created_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient queries
CREATE INDEX idx_quotes_rfq_id ON quotes(rfq_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);

-- ========================================
-- ADMIN SETTINGS TABLE
-- ========================================
CREATE TABLE admin_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
-- Note: You'll need to set up authentication and user roles in Supabase

-- Policy for authenticated admin users (you can modify based on your auth setup)
CREATE POLICY "Admin full access to customers" ON customers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to rfqs" ON rfqs
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to parts" ON parts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to files" ON files
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to quotes" ON quotes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to settings" ON admin_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- AUTOMATIC UPDATED_AT TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON rfqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STORAGE BUCKETS
-- ========================================

-- Create storage buckets (run these in Supabase dashboard or via API)
-- These commands are for reference - you'll need to create buckets through Supabase dashboard

/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('rfq-files', 'rfq-files', false, 52428800, '{"application/pdf","image/jpeg","image/png","image/gif","application/zip","application/x-zip-compressed","text/plain","application/step","application/iges","application/x-step","model/step","model/iges","application/sla","model/stl"}'),
  ('cad-files', 'cad-files', false, 104857600, '{"application/step","application/iges","application/x-step","model/step","model/iges","application/sla","model/stl","application/x-solidworks","application/vnd.solidworks.part","application/vnd.solidworks.assembly","application/vnd.solidworks.drawing"}'),
  ('documents', 'documents', false, 10485760, '{"application/pdf","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"}');
*/

-- ========================================
-- SAMPLE DATA (Optional - for testing)
-- ========================================

-- Insert sample customer
/*
INSERT INTO customers (name, email, company, phone, address) VALUES
('John Smith', 'john.smith@aerospace-corp.com', 'Aerospace Corporation', '+1-555-0123', '123 Aviation Blvd, Los Angeles, CA 90245');

-- Insert sample RFQ
INSERT INTO rfqs (rfq_number, customer_id, title, description, status, priority, estimated_value) VALUES
('RFQ-20241201-1200', (SELECT id FROM customers WHERE email = 'john.smith@aerospace-corp.com'), 'Precision Aluminum Brackets', 'Need 50 units of aluminum brackets for aircraft assembly', 'new', 'high', 5000.00);
*/

-- ========================================
-- USEFUL VIEWS (Optional)
-- ========================================

-- View for RFQ dashboard with customer info
CREATE VIEW rfq_dashboard AS
SELECT 
    r.id,
    r.rfq_number,
    r.title,
    r.status,
    r.priority,
    r.estimated_value,
    r.total_parts,
    r.created_at,
    r.quote_due_date,
    c.name as customer_name,
    c.company as customer_company,
    c.email as customer_email
FROM rfqs r
LEFT JOIN customers c ON r.customer_id = c.id
ORDER BY r.created_at DESC;

-- View for RFQ metrics
CREATE VIEW rfq_metrics AS
SELECT 
    COUNT(*) as total_rfqs,
    COUNT(CASE WHEN status = 'new' THEN 1 END) as new_rfqs,
    COUNT(CASE WHEN status = 'reviewing' THEN 1 END) as reviewing_rfqs,
    COUNT(CASE WHEN status = 'quoted' THEN 1 END) as quoted_rfqs,
    COUNT(CASE WHEN status = 'won' THEN 1 END) as won_rfqs,
    COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_rfqs,
    SUM(estimated_value) as total_estimated_value,
    SUM(CASE WHEN status = 'won' THEN actual_value ELSE 0 END) as total_won_value,
    AVG(estimated_value) as avg_rfq_value
FROM rfqs;

-- ========================================
-- FUNCTIONS (Optional - for advanced features)
-- ========================================

-- Function to generate RFQ number
CREATE OR REPLACE FUNCTION generate_rfq_number()
RETURNS TEXT AS $$
DECLARE
    rfq_number TEXT;
    date_part TEXT;
    time_part TEXT;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    time_part := TO_CHAR(NOW(), 'HH24MI');
    rfq_number := 'RFQ-' || date_part || '-' || time_part;
    RETURN rfq_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update RFQ metrics when status changes
CREATE OR REPLACE FUNCTION update_rfq_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- You can add logic here to update cached metrics
    -- For now, this is just a placeholder
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call metrics update function
CREATE TRIGGER update_rfq_metrics_trigger
    AFTER INSERT OR UPDATE OF status ON rfqs
    FOR EACH ROW
    EXECUTE FUNCTION update_rfq_metrics(); 