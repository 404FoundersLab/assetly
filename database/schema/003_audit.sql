-- IT Asset Platform - Audit Schema

CREATE TYPE audit_action AS ENUM (
    'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'RETURN',
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'EXPORT'
);

CREATE TABLE audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for current and next 3 months
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE INDEX idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
    v_action audit_action;
    v_old JSONB;
    v_new JSONB;
BEGIN
    v_user_id := NULLIF(current_setting('app.current_user', true), '')::UUID;

    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_new := to_jsonb(NEW);
        v_tenant_id := NEW.tenant_id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_tenant_id := NEW.tenant_id;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_old := to_jsonb(OLD);
        v_tenant_id := OLD.tenant_id;
    END IF;

    INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (
        v_tenant_id,
        v_user_id,
        v_action,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old,
        v_new
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_assets AFTER INSERT OR UPDATE OR DELETE ON assets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_asset_assignments AFTER INSERT OR UPDATE ON asset_assignments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
