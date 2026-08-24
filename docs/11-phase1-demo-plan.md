# Phase 1 Demo Plan — Asset Management MVP

> **Purpose:** Deliver a stakeholder-ready demo in **10 weeks** to validate product vision, secure funding/partnerships, and onboard 1–3 design partner MSPs.

---

## Demo Objectives

What stakeholders must **see and believe** after the demo:

1. **Multi-tenant SaaS works** — Login as Acme Corp; data is isolated
2. **Asset lifecycle is complete** — Create → assign → return → retire with full history
3. **IT team productivity** — Find any asset in seconds; QR scan on phone
4. **Compliance-ready** — Every action has an audit trail
5. **Business viability** — Dashboard shows warranty risk and asset value

---

## Demo Scope (In vs Out)

### ✅ IN SCOPE (Demo MVP)

| Module | Features |
|--------|----------|
| **Auth** | Email/password login, JWT, logout, password reset stub |
| **Tenant** | Single tenant demo (Acme Corp), tenant settings page |
| **RBAC** | 3 roles: Admin, IT Admin, Viewer |
| **Assets** | Full CRUD, status lifecycle, categories, search/filter |
| **Assignment** | Assign to employee, return workflow, assignment history |
| **Employees** | CRUD, link to department |
| **Departments** | Flat list (tree in UI optional) |
| **Vendors** | CRUD, link to assets |
| **Warranty** | Expiry date on asset, warranty report widget |
| **Depreciation** | Straight-line calculation, current value display |
| **QR Codes** | Generate QR per asset, mobile-friendly lookup page |
| **Audit** | Auto-logged CRUD + assign/return, audit log viewer |
| **Dashboard** | Asset counts, status breakdown, warranty alerts |

### ❌ OUT OF SCOPE (Later Phases)

- Agents, monitoring, remote management
- Network discovery, ticketing, remote desktop
- SSO / SAML / LDAP (show as "Enterprise — Coming Soon" in settings)
- Stripe billing (show plan badge only)
- MSP parent/child hierarchy (show roadmap slide)
- Email notifications (stub UI only)

---

## Demo User Stories

### Story 1: New Laptop Onboarding (3 min)
> As an IT Admin, I receive a new Dell laptop, register it in the system, assign it to a new hire, and print a QR label.

**Steps shown:**
1. Login → Dashboard
2. Assets → Add Asset (LAP-051, Dell Latitude, serial, vendor, warranty)
3. Employees → Select "Sarah Chen" → Assign Asset
4. Asset detail → View QR code → Scan with phone → Asset page loads

### Story 2: Employee Offboarding (2 min)
> As an IT Admin, I process a departing employee's laptop return.

**Steps shown:**
1. Employees → "Mike Johnson" → View assigned assets
2. Return asset → Condition notes → Asset back to "In Stock"
3. Audit log → Shows assign + return with timestamps

### Story 3: Warranty Risk Review (2 min)
> As IT Director, I review assets with expiring warranties before budget planning.

**Steps shown:**
1. Dashboard → "4 warranties expiring in 30 days" widget
2. Click through → Filtered asset list
3. Export CSV (optional if ready)

### Story 4: Security & Compliance (2 min)
> As a CISO stakeholder, I verify audit trails and role-based access.

**Steps shown:**
1. Settings → Users & Roles
2. Login as Viewer → Confirm no edit buttons
3. Audit Logs → Filter by asset → Full change history

### Story 5: Architecture Walkthrough (5 min)
> Technical stakeholders review multi-tenant design, API, and roadmap.

**Slides + live API call:**
- Swagger `/api/v1/assets` with JWT
- PostgreSQL RLS explanation
- Roadmap phases 2–7

**Total demo time: ~15 minutes + 10 min Q&A**

---

## 10-Week Sprint Plan

### Sprint 1 (Weeks 1–2): Foundation
| Task | Owner | Done When |
|------|-------|-----------|
| Monorepo setup (pnpm, turbo) | Tech Lead | CI green |
| Docker compose (PG + Redis) | DevOps/Backend | `docker compose up` works |
| DB schema + RLS policies | Backend | Migrations apply cleanly |
| Auth module (JWT login/refresh) | Backend | Postman login works |
| Tenant + user modules | Backend | Seed users load |
| React app shell + MUI theme | Frontend | Login page renders |
| Redux auth slice | Frontend | Token persisted |

### Sprint 2 (Weeks 3–4): Asset Core
| Task | Owner | Done When |
|------|-------|-----------|
| Asset CRUD API + validation | Backend | Swagger documented |
| Asset list with pagination/search | Frontend | 50 assets render |
| Asset create/edit forms | Frontend | Validation errors shown |
| Asset detail page | Frontend | All fields displayed |
| RBAC guards on all endpoints | Backend | Viewer gets 403 on write |
| Unit tests (auth + asset) | QA/Backend | 80% on critical paths |

### Sprint 3 (Weeks 5–6): People & Workflows
| Task | Owner | Done When |
|------|-------|-----------|
| Employee + department APIs | Backend | CRUD complete |
| Employee UI + department selector | Frontend | Linked to assets |
| Assign asset workflow | Full-Stack | Status → deployed |
| Return asset workflow | Full-Stack | Assignment closed |
| Ownership history timeline | Frontend | Shows on asset detail |
| Audit interceptor | Backend | All writes logged |

### Sprint 4 (Week 7): Financial & QR
| Task | Owner | Done When |
|------|-------|-----------|
| Vendor CRUD | Full-Stack | Vendors linkable |
| Warranty fields + report query | Backend | Dashboard widget data |
| Depreciation calculation job | Backend | currentValue updates |
| QR code generation endpoint | Backend | PNG + lookup URL |
| QR display + mobile lookup page | Frontend | Phone scan works |

### Sprint 5 (Week 8): Dashboard & Polish
| Task | Owner | Done When |
|------|-------|-----------|
| Dashboard summary API | Backend | All widgets populated |
| Dashboard UI (charts) | Frontend | MUI charts render |
| Audit log viewer | Frontend | Filterable table |
| Global search (assets) | Frontend | Finds by tag/serial |
| Error handling + loading states | Frontend | No blank screens |
| Responsive layout | Frontend | Tablet usable |

### Sprint 6 (Weeks 9–10): Demo Hardening
| Task | Owner | Done When |
|------|-------|-----------|
| Demo seed data (50 assets, 20 employees) | Backend | Realistic data |
| E2E tests (5 demo flows) | QA | All pass |
| Security review checklist | Tech Lead | No critical findings |
| Deploy demo to Azure | DevOps | HTTPS live |
| Demo script rehearsal | PM + Team | 15 min timed run |
| Stakeholder demo | All | Feedback captured |

---

## Team Structure

```
Product Manager (0.5 FTE)
├── Tech Lead / Architect (1)
├── Backend Developer (1)
├── Frontend Developer (1)
├── Full-Stack Developer (1)
└── QA Engineer (0.5 → 1 in week 8)
```

**Estimated cost (10 weeks):** $120K–$160K USD (contractor rates) or 50 person-weeks

---

## Technical Decisions for Demo

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Modular monolith | Speed; split later |
| ORM | TypeORM or Prisma | Team preference; RLS via raw `SET` |
| UI library | MUI v5 + DataGrid | Enterprise look fast |
| State | Redux Toolkit + RTK Query | Spec requirement |
| QR | `qrcode` npm package | Simple, no external service |
| Depreciation | DB trigger or nightly cron | Straight-line only for demo |
| Hosting | Azure Container Apps or AKS | Matches target platform |

---

## Demo Environment Spec

| Component | Spec |
|-----------|------|
| URL | `https://demo.itasset.io` |
| Tenant | Acme Corp (`acme-corp`) |
| Admin | `admin@acme.com` / `Demo@123456` |
| IT Admin | `itadmin@acme.com` / `Demo@123456` |
| Viewer | `viewer@acme.com` / `Demo@123456` |
| Seed | 50 assets, 20 employees, 5 departments, 3 vendors |
| Reset | Nightly cron restores seed |
| Uptime target | 99% during demo week |

---

## Success Criteria (Demo Exit)

| Criteria | Metric |
|----------|--------|
| Functional | All 5 demo stories complete without errors |
| Performance | Page load < 2s, API p95 < 500ms |
| Security | RBAC enforced, RLS verified, HTTPS only |
| UX | Stakeholder rates UX ≥ 4/5 in feedback form |
| Business | ≥ 2 design partners commit to Phase 2 beta |
| Technical | Swagger docs published, schema documented |

---

## Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | Scope creep from stakeholders | High | High | Written scope doc; change request process |
| 2 | RLS bugs leak tenant data | Medium | Critical | Automated tenant isolation tests |
| 3 | Frontend delays | Medium | High | MUI templates; cut nice-to-have UI |
| 4 | Demo day outage | Low | Critical | Rehearsal recording backup; local fallback |
| 5 | Key engineer unavailable | Medium | Medium | Pair programming; documented runbooks |

---

## Post-Demo Next Steps

1. **Week 11:** Collect stakeholder feedback → prioritize Phase 2 backlog
2. **Week 11–12:** Sign design partner agreements (MSPs)
3. **Week 12:** Phase 2 kickoff — Windows agent spike
4. **Month 4:** Phase 2 beta with 3 partners, 500 agents target
5. **Month 6:** Public beta (Professional tier)

---

## Immediate Actions (This Week)

| # | Action | Owner | Due |
|---|--------|-------|-----|
| 1 | Approve Phase 1 scope & budget | Stakeholders | Day 2 |
| 2 | Provision Azure subscription + GitHub repo | DevOps | Day 3 |
| 3 | Apply database schema (`database/schema/*.sql`) | Backend | Day 4 |
| 4 | Scaffold NestJS + React monorepo | Tech Lead | Day 5 |
| 5 | Schedule weekly sprint demos | PM | Day 5 |
| 6 | Identify 3 design partner MSPs | PM/Sales | Week 2 |

---

## Appendix: Demo Script (Speaker Notes)

**Opening (1 min):**
> "Today I'll show IT Asset Platform — a multi-tenant SaaS that gives IT teams one place to manage every asset from procurement to retirement, with full audit compliance. This is Phase 1: Asset Management."

**Transition to roadmap (after Story 4):**
> "What you've seen is Phase 1. Phase 2 adds endpoint monitoring agents — like NinjaOne. Phase 3 adds remote script execution. By Phase 6, you'll have browser-based remote desktop. Let me show you the architecture..."

**Closing (1 min):**
> "We're seeking 3 design partners for our Phase 2 beta. The demo environment stays live at demo.itasset.io. Questions?"
