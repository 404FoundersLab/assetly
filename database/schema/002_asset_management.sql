-- IT Asset Platform - Asset Management Schema

CREATE TYPE asset_category AS ENUM ('laptop', 'desktop', 'server', 'mobile', 'peripheral', 'network', 'other');
CREATE TYPE asset_status AS ENUM ('in_stock', 'deployed', 'in_repair', 'retired', 'lost', 'disposed');
CREATE TYPE lifecycle_stage AS ENUM ('procurement', 'active', 'maintenance', 'end_of_life');
CREATE TYPE employee_status AS ENUM ('active', 'terminated', 'on_leave');
CREATE TYPE warranty_type AS ENUM ('manufacturer', 'extended', 'support');
CREATE TYPE depreciation_method AS ENUM ('straight_line', 'declining_balance');

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES departments(id),
    cost_center VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_departments_tenant ON departments(tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY departments_tenant_isolation ON departments
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    employee_number VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    job_title VARCHAR(255),
    department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES employees(id),
    status employee_status NOT NULL DEFAULT 'active',
    hire_date DATE,
    termination_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, employee_number)
);

CREATE INDEX idx_employees_tenant_dept ON employees(tenant_id, department_id) WHERE deleted_at IS NULL;

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY employees_tenant_isolation ON employees
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Vendors
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website VARCHAR(500),
    address JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, name)
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendors_tenant_isolation ON vendors
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Assets
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    asset_tag VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category asset_category NOT NULL DEFAULT 'other',
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    status asset_status NOT NULL DEFAULT 'in_stock',
    lifecycle_stage lifecycle_stage NOT NULL DEFAULT 'procurement',
    purchase_date DATE,
    purchase_cost DECIMAL(12,2),
    current_value DECIMAL(12,2),
    location VARCHAR(255),
    qr_code_data VARCHAR(500),
    vendor_id UUID REFERENCES vendors(id),
    assigned_employee_id UUID REFERENCES employees(id),
    warranty_expires_at DATE,
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, asset_tag)
);

CREATE INDEX idx_assets_tenant_status ON assets(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_tenant_tag ON assets(tenant_id, asset_tag);
CREATE INDEX idx_assets_warranty_expiry ON assets(tenant_id, warranty_expires_at)
    WHERE warranty_expires_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_assets_assigned ON assets(tenant_id, assigned_employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_search ON assets USING gin(
    to_tsvector('english',
        coalesce(name, '') || ' ' ||
        coalesce(serial_number, '') || ' ' ||
        coalesce(asset_tag, '') || ' ' ||
        coalesce(manufacturer, '') || ' ' ||
        coalesce(model, '')
    )
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_tenant_isolation ON assets
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Asset assignments
CREATE TABLE asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES users(id),
    return_condition TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_active_assignment ON asset_assignments(asset_id) WHERE returned_at IS NULL;
CREATE INDEX idx_assignments_tenant ON asset_assignments(tenant_id);
CREATE INDEX idx_assignments_employee ON asset_assignments(employee_id) WHERE returned_at IS NULL;

ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_assignments_tenant_isolation ON asset_assignments
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Asset ownership history (immutable)
CREATE TABLE asset_ownership_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    event_type VARCHAR(50) NOT NULL,
    from_status asset_status,
    to_status asset_status,
    from_employee_id UUID REFERENCES employees(id),
    to_employee_id UUID REFERENCES employees(id),
    performed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ownership_history_asset ON asset_ownership_history(asset_id, created_at DESC);

ALTER TABLE asset_ownership_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_ownership_history_tenant_isolation ON asset_ownership_history
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Warranty records
CREATE TABLE warranty_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    provider VARCHAR(255),
    warranty_type warranty_type NOT NULL DEFAULT 'manufacturer',
    start_date DATE,
    end_date DATE,
    contract_number VARCHAR(100),
    coverage_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warranty_asset ON warranty_records(asset_id);
CREATE INDEX idx_warranty_expiry ON warranty_records(tenant_id, end_date);

ALTER TABLE warranty_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY warranty_records_tenant_isolation ON warranty_records
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Purchase records
CREATE TABLE purchase_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    vendor_id UUID REFERENCES vendors(id),
    po_number VARCHAR(100),
    purchase_date DATE NOT NULL,
    cost DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    invoice_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchase_records_tenant_isolation ON purchase_records
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Depreciation records
CREATE TABLE depreciation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES companies(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    method depreciation_method NOT NULL DEFAULT 'straight_line',
    useful_life_months INT NOT NULL DEFAULT 36,
    salvage_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    monthly_amount DECIMAL(12,2) NOT NULL,
    accumulated DECIMAL(12,2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE depreciation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY depreciation_records_tenant_isolation ON depreciation_records
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Trigger: update asset ownership history on assignment
CREATE OR REPLACE FUNCTION log_asset_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.returned_at IS NULL THEN
        UPDATE assets SET status = 'deployed', assigned_employee_id = NEW.employee_id, updated_at = NOW()
        WHERE id = NEW.asset_id;
        INSERT INTO asset_ownership_history (tenant_id, asset_id, event_type, to_status, to_employee_id, performed_by, notes)
        VALUES (NEW.tenant_id, NEW.asset_id, 'ASSIGNED', 'deployed', NEW.employee_id, NEW.assigned_by, NEW.notes);
    ELSIF TG_OP = 'UPDATE' AND OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
        UPDATE assets SET status = 'in_stock', assigned_employee_id = NULL, updated_at = NOW()
        WHERE id = NEW.asset_id;
        INSERT INTO asset_ownership_history (tenant_id, asset_id, event_type, from_status, to_status, from_employee_id, performed_by, notes)
        VALUES (NEW.tenant_id, NEW.asset_id, 'RETURNED', 'deployed', 'in_stock', NEW.employee_id, NEW.assigned_by, NEW.return_condition);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asset_assignment
    AFTER INSERT OR UPDATE ON asset_assignments
    FOR EACH ROW EXECUTE FUNCTION log_asset_assignment();

-- Trigger: auto-generate QR code data on asset insert
CREATE OR REPLACE FUNCTION generate_asset_qr()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qr_code_data IS NULL THEN
        NEW.qr_code_data := '/assets/lookup/' || NEW.id::TEXT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asset_qr
    BEFORE INSERT ON assets
    FOR EACH ROW EXECUTE FUNCTION generate_asset_qr();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
