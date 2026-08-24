-- Support Tickets
-- Run after 010_add_serial_number.sql

CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('hardware','software','access','network','other')),
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_tickets_tenant_idx    ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS support_tickets_employee_idx  ON support_tickets(employee_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx    ON support_tickets(status);
