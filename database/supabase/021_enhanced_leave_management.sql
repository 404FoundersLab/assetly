-- 021: Enhanced Multi-tier Leave Management (Employee, Reporting Lead, Manager, HR, Team Members)

CREATE TABLE IF NOT EXISTS hr_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    employee_name VARCHAR(255),
    employee_email VARCHAR(255),
    department_id UUID,
    department_name VARCHAR(255),
    leave_type VARCHAR(50) NOT NULL DEFAULT 'casual',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count NUMERIC(4, 1) NOT NULL DEFAULT 1.0,
    day_type VARCHAR(20) DEFAULT 'full',
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    manager_id UUID,
    manager_name VARCHAR(255),
    manager_status VARCHAR(20) DEFAULT 'pending',
    manager_comment TEXT,
    reviewed_by_manager_at TIMESTAMPTZ,
    approved_by VARCHAR(100),
    hr_status VARCHAR(20) DEFAULT 'pending',
    hr_comment TEXT,
    reviewed_by_hr_at TIMESTAMPTZ,
    backup_employee_id UUID,
    backup_employee_name VARCHAR(255),
    handover_notes TEXT,
    contact_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- In case table already existed, ensure new columns are added safely
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255);
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS department_name VARCHAR(255);
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS day_type VARCHAR(20) DEFAULT 'full';
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS manager_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS manager_comment TEXT;
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS reviewed_by_manager_at TIMESTAMPTZ;
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS hr_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS hr_comment TEXT;
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS reviewed_by_hr_at TIMESTAMPTZ;
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS backup_employee_id UUID;
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS backup_employee_name VARCHAR(255);
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS handover_notes TEXT;
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_tenant ON hr_leave_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_emp ON hr_leave_requests(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_manager ON hr_leave_requests(tenant_id, manager_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_dates ON hr_leave_requests(tenant_id, start_date, end_date);

-- Employee leave quotas & balances per year
CREATE TABLE IF NOT EXISTS hr_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    year INT NOT NULL DEFAULT 2026,
    leave_type VARCHAR(50) NOT NULL,
    allocated_days NUMERIC(4, 1) NOT NULL DEFAULT 12.0,
    used_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    pending_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    carried_forward NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, year, leave_type)
);

-- Leave Types and Policies configuration
CREATE TABLE IF NOT EXISTS hr_leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    days_per_year NUMERIC(4, 1) NOT NULL DEFAULT 12.0,
    carry_forward_max NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    is_paid BOOLEAN NOT NULL DEFAULT true,
    requires_proof BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- Seed comprehensive leave categories for tenants
INSERT INTO hr_leave_types (tenant_id, name, code, days_per_year, carry_forward_max, is_paid, requires_proof, description)
SELECT 
    t.id,
    v.name,
    v.code,
    v.days_per_year,
    v.carry_forward_max,
    v.is_paid,
    v.requires_proof,
    v.description
FROM tenants t
CROSS JOIN (
    VALUES
        ('Casual Leave (CL)', 'CL', 12.0, 0.0, true, false, 'Short unplanned time-off for personal commitments and urgent domestic matters.'),
        ('Privilege Leave (PL / EL)', 'PL', 18.0, 30.0, true, false, 'Accrued annual vacation and privilege quota, eligible for year-end carry forward & encashment.'),
        ('Optional Leave / Floating Holiday (OL)', 'OL', 3.0, 0.0, true, false, 'Flexible floating holiday for regional festivals, cultural days, or personal religious observances.'),
        ('Compensatory Off (Compensation Leave)', 'COMP', 10.0, 0.0, true, false, 'Credited compensation leave for weekend deployment, client emergency, or overtime duty.'),
        ('Maternity Leave (ML)', 'ML', 182.0, 0.0, true, true, 'Statutory 26-week maternal care leave for expectant and new mothers.'),
        ('Paternity Leave (PL)', 'PAT', 15.0, 0.0, true, false, 'Paid support time-off for new fathers within 6 months of childbirth or legal adoption.'),
        ('Sick / Medical Leave (SL)', 'SL', 12.0, 6.0, true, true, 'Medical recovery leave; doctor certificate required for absences exceeding 2 consecutive days.'),
        ('Bereavement / Compassionate Leave (BL)', 'BL', 5.0, 0.0, true, false, 'Compassionate paid support leave for immediate family bereavement.'),
        ('Marriage / Wedding Leave (WL)', 'WL', 5.0, 0.0, true, true, 'Special celebratory paid leave granted once in tenure for employee’s own wedding.'),
        ('Adoption Leave (AL)', 'AL', 60.0, 0.0, true, true, 'Childcare leave granted upon legal adoption of a child under one year of age.'),
        ('Leave Without Pay / Loss of Pay (LWP)', 'LWP', 30.0, 0.0, false, true, 'Approved unpaid time-off availed after exhausting all accrued annual quotas.'),
        ('Sabbatical / Study Leave (SAB)', 'SAB', 90.0, 0.0, false, true, 'Extended career pause for advanced educational qualifications, research, or public service.')
) AS v(name, code, days_per_year, carry_forward_max, is_paid, requires_proof, description)
ON CONFLICT (tenant_id, code) DO NOTHING;

