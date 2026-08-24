-- Demo seed data for stakeholder presentations
-- Password for all demo users: Demo@123456
-- bcrypt hash generated for 'Demo@123456' (cost 10)

DO $$
DECLARE
    v_plan_id UUID;
    v_tenant_id UUID;
    v_role_admin UUID;
    v_role_itadmin UUID;
    v_role_viewer UUID;
    v_user_admin UUID;
    v_user_itadmin UUID;
    v_user_viewer UUID;
    v_dept_eng UUID;
    v_dept_hr UUID;
    v_dept_sales UUID;
    v_dept_fin UUID;
    v_dept_ops UUID;
    v_vendor_dell UUID;
    v_vendor_apple UUID;
    v_vendor_hp UUID;
    v_emp_ids UUID[];
    v_asset_id UUID;
    i INT;
BEGIN
    SELECT id INTO v_plan_id FROM subscription_plans WHERE tier = 'professional' LIMIT 1;

    INSERT INTO companies (name, slug, status, subscription_plan_id, trial_ends_at, settings)
    VALUES (
        'Acme Corp',
        'acme-corp',
        'active',
        v_plan_id,
        NOW() + INTERVAL '365 days',
        '{"timezone": "America/New_York", "locale": "en-US"}'::JSONB
    )
    RETURNING id INTO v_tenant_id;

    PERFORM set_current_tenant(v_tenant_id);

    -- Roles
    INSERT INTO roles (tenant_id, name, description, is_system) VALUES
        (v_tenant_id, 'tenant_admin', 'Full tenant administration', true),
        (v_tenant_id, 'it_admin', 'IT operations management', true),
        (v_tenant_id, 'viewer', 'Read-only access', true)
    RETURNING id INTO v_role_admin;

    SELECT id INTO v_role_admin FROM roles WHERE tenant_id = v_tenant_id AND name = 'tenant_admin';
    SELECT id INTO v_role_itadmin FROM roles WHERE tenant_id = v_tenant_id AND name = 'it_admin';
    SELECT id INTO v_role_viewer FROM roles WHERE tenant_id = v_tenant_id AND name = 'viewer';

    -- Assign permissions to roles
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_admin, id FROM permissions;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_itadmin, id FROM permissions
    WHERE code NOT IN ('user:write', 'settings:write', 'asset:delete', 'employee:delete');

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_viewer, id FROM permissions WHERE code LIKE '%:read';

    -- Demo users (password: Demo@123456)
    INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
    VALUES
        (v_tenant_id, 'admin@acme.com', '$2b$10$rQZ5K8Y5Y5Y5Y5Y5Y5Y5YuK8Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', 'Jane', 'Admin', 'active'),
        (v_tenant_id, 'itadmin@acme.com', '$2b$10$rQZ5K8Y5Y5Y5Y5Y5Y5Y5YuK8Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', 'Mike', 'Thompson', 'active'),
        (v_tenant_id, 'viewer@acme.com', '$2b$10$rQZ5K8Y5Y5Y5Y5Y5Y5Y5YuK8Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', 'Lisa', 'Viewer', 'active')
    RETURNING id INTO v_user_admin;

    SELECT id INTO v_user_admin FROM users WHERE email = 'admin@acme.com';
    SELECT id INTO v_user_itadmin FROM users WHERE email = 'itadmin@acme.com';
    SELECT id INTO v_user_viewer FROM users WHERE email = 'viewer@acme.com';

    INSERT INTO user_roles (user_id, role_id) VALUES
        (v_user_admin, v_role_admin),
        (v_user_itadmin, v_role_itadmin),
        (v_user_viewer, v_role_viewer);

    -- Departments
    INSERT INTO departments (tenant_id, name, cost_center) VALUES
        (v_tenant_id, 'Engineering', 'CC-100'),
        (v_tenant_id, 'Human Resources', 'CC-200'),
        (v_tenant_id, 'Sales', 'CC-300'),
        (v_tenant_id, 'Finance', 'CC-400'),
        (v_tenant_id, 'Operations', 'CC-500')
    RETURNING id INTO v_dept_eng;

    SELECT id INTO v_dept_eng FROM departments WHERE tenant_id = v_tenant_id AND name = 'Engineering';
    SELECT id INTO v_dept_hr FROM departments WHERE tenant_id = v_tenant_id AND name = 'Human Resources';
    SELECT id INTO v_dept_sales FROM departments WHERE tenant_id = v_tenant_id AND name = 'Sales';
    SELECT id INTO v_dept_fin FROM departments WHERE tenant_id = v_tenant_id AND name = 'Finance';
    SELECT id INTO v_dept_ops FROM departments WHERE tenant_id = v_tenant_id AND name = 'Operations';

    -- Vendors
    INSERT INTO vendors (tenant_id, name, contact_email, website) VALUES
        (v_tenant_id, 'Dell Technologies', 'sales@dell.com', 'https://dell.com'),
        (v_tenant_id, 'Apple Inc', 'enterprise@apple.com', 'https://apple.com'),
        (v_tenant_id, 'HP Inc', 'business@hp.com', 'https://hp.com')
    RETURNING id INTO v_vendor_dell;

    SELECT id INTO v_vendor_dell FROM vendors WHERE tenant_id = v_tenant_id AND name = 'Dell Technologies';
    SELECT id INTO v_vendor_apple FROM vendors WHERE tenant_id = v_tenant_id AND name = 'Apple Inc';
    SELECT id INTO v_vendor_hp FROM vendors WHERE tenant_id = v_tenant_id AND name = 'HP Inc';

    -- 20 Employees
    INSERT INTO employees (tenant_id, employee_number, first_name, last_name, email, job_title, department_id, status, hire_date)
    VALUES
        (v_tenant_id, 'EMP-001', 'Sarah', 'Chen', 'sarah.chen@acme.com', 'Senior Engineer', v_dept_eng, 'active', '2024-01-15'),
        (v_tenant_id, 'EMP-002', 'Mike', 'Johnson', 'mike.johnson@acme.com', 'DevOps Engineer', v_dept_eng, 'active', '2023-06-01'),
        (v_tenant_id, 'EMP-003', 'Emily', 'Davis', 'emily.davis@acme.com', 'HR Manager', v_dept_hr, 'active', '2022-03-10'),
        (v_tenant_id, 'EMP-004', 'James', 'Wilson', 'james.wilson@acme.com', 'Sales Director', v_dept_sales, 'active', '2021-08-20'),
        (v_tenant_id, 'EMP-005', 'Priya', 'Patel', 'priya.patel@acme.com', 'Financial Analyst', v_dept_fin, 'active', '2024-02-01'),
        (v_tenant_id, 'EMP-006', 'David', 'Brown', 'david.brown@acme.com', 'Backend Developer', v_dept_eng, 'active', '2023-11-15'),
        (v_tenant_id, 'EMP-007', 'Anna', 'Martinez', 'anna.martinez@acme.com', 'Frontend Developer', v_dept_eng, 'active', '2024-04-01'),
        (v_tenant_id, 'EMP-008', 'Robert', 'Taylor', 'robert.taylor@acme.com', 'Account Executive', v_dept_sales, 'active', '2023-01-10'),
        (v_tenant_id, 'EMP-009', 'Jennifer', 'Lee', 'jennifer.lee@acme.com', 'Operations Manager', v_dept_ops, 'active', '2022-07-01'),
        (v_tenant_id, 'EMP-010', 'Chris', 'Anderson', 'chris.anderson@acme.com', 'QA Engineer', v_dept_eng, 'active', '2024-06-15'),
        (v_tenant_id, 'EMP-011', 'Maria', 'Garcia', 'maria.garcia@acme.com', 'Recruiter', v_dept_hr, 'active', '2023-09-01'),
        (v_tenant_id, 'EMP-012', 'Kevin', 'White', 'kevin.white@acme.com', 'Sales Rep', v_dept_sales, 'active', '2024-01-20'),
        (v_tenant_id, 'EMP-013', 'Laura', 'Harris', 'laura.harris@acme.com', 'Controller', v_dept_fin, 'active', '2021-12-01'),
        (v_tenant_id, 'EMP-014', 'Tom', 'Clark', 'tom.clark@acme.com', 'Sys Admin', v_dept_ops, 'active', '2022-05-15'),
        (v_tenant_id, 'EMP-015', 'Nina', 'Robinson', 'nina.robinson@acme.com', 'UX Designer', v_dept_eng, 'active', '2023-08-01'),
        (v_tenant_id, 'EMP-016', 'Alex', 'Walker', 'alex.walker@acme.com', 'Support Engineer', v_dept_ops, 'active', '2024-03-01'),
        (v_tenant_id, 'EMP-017', 'Sophie', 'Hall', 'sophie.hall@acme.com', 'Marketing Manager', v_dept_sales, 'active', '2023-04-15'),
        (v_tenant_id, 'EMP-018', 'Daniel', 'Young', 'daniel.young@acme.com', 'Data Engineer', v_dept_eng, 'active', '2024-05-01'),
        (v_tenant_id, 'EMP-019', 'Rachel', 'King', 'rachel.king@acme.com', 'Payroll Specialist', v_dept_fin, 'active', '2022-11-01'),
        (v_tenant_id, 'EMP-020', 'Mark', 'Scott', 'mark.scott@acme.com', 'Network Admin', v_dept_ops, 'active', '2021-06-01');

    SELECT ARRAY_AGG(id) INTO v_emp_ids FROM employees WHERE tenant_id = v_tenant_id;

    -- 50 Assets
    FOR i IN 1..50 LOOP
        INSERT INTO assets (
            tenant_id, asset_tag, name, category, manufacturer, model,
            serial_number, status, lifecycle_stage, purchase_date, purchase_cost,
            current_value, location, vendor_id, warranty_expires_at, created_by
        ) VALUES (
            v_tenant_id,
            'AST-' || LPAD(i::TEXT, 3, '0'),
            CASE (i % 5)
                WHEN 0 THEN 'Dell Latitude 5540'
                WHEN 1 THEN 'MacBook Pro 14'
                WHEN 2 THEN 'HP EliteBook 840'
                WHEN 3 THEN 'Dell OptiPlex 7090'
                ELSE 'iPhone 15 Pro'
            END,
            CASE (i % 5)
                WHEN 0 THEN 'laptop'::asset_category
                WHEN 1 THEN 'laptop'::asset_category
                WHEN 2 THEN 'laptop'::asset_category
                WHEN 3 THEN 'desktop'::asset_category
                ELSE 'mobile'::asset_category
            END,
            CASE (i % 3) WHEN 0 THEN 'Dell' WHEN 1 THEN 'Apple' ELSE 'HP' END,
            'Model-' || i,
            'SN-' || MD5(i::TEXT),
            CASE
                WHEN i <= 35 THEN 'deployed'::asset_status
                WHEN i <= 45 THEN 'in_stock'::asset_status
                WHEN i <= 48 THEN 'in_repair'::asset_status
                ELSE 'retired'::asset_status
            END,
            'active'::lifecycle_stage,
            CURRENT_DATE - (i * 30),
            800 + (i * 50),
            600 + (i * 30),
            'HQ Floor ' || ((i % 5) + 1),
            CASE (i % 3) WHEN 0 THEN v_vendor_dell WHEN 1 THEN v_vendor_apple ELSE v_vendor_hp END,
            CASE
                WHEN i <= 4 THEN CURRENT_DATE + 15   -- expiring in 30 days
                WHEN i <= 12 THEN CURRENT_DATE + 60  -- expiring in 90 days
                ELSE CURRENT_DATE + 365
            END,
            v_user_admin
        )
        RETURNING id INTO v_asset_id;

        -- Assign deployed assets to employees
        IF i <= 35 THEN
            PERFORM set_config('app.current_user', v_user_admin::TEXT, false);
            INSERT INTO asset_assignments (tenant_id, asset_id, employee_id, assigned_by, notes)
            VALUES (v_tenant_id, v_asset_id, v_emp_ids[1 + (i % 20)], v_user_admin, 'Initial deployment');
        END IF;

        -- Depreciation
        INSERT INTO depreciation_records (tenant_id, asset_id, method, useful_life_months, salvage_value, monthly_amount, start_date)
        VALUES (
            v_tenant_id, v_asset_id, 'straight_line', 36, 100,
            ROUND((800 + (i * 50) - 100) / 36, 2),
            CURRENT_DATE - (i * 30)
        );
    END LOOP;

    RAISE NOTICE 'Demo seed complete. Tenant: acme-corp (%), Users: admin@acme.com, itadmin@acme.com, viewer@acme.com', v_tenant_id;
END $$;
