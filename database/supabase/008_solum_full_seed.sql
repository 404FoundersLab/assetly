-- ============================================================
-- 008 — Clean Solum Technologies setup (No dummy data)
-- Sets up the Solum tenant without dummy assets or employees.
-- ============================================================

-- ── Tenant ───────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, plan, admin_email, admin_name)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Solum Technologies India Private Limited',
  'solum-technologies',
  'professional',
  'sti@solum-group.com',
  'Vasanth'
)
ON CONFLICT (slug) DO UPDATE
  SET name        = EXCLUDED.name,
      admin_email = EXCLUDED.admin_email,
      admin_name  = EXCLUDED.admin_name;
