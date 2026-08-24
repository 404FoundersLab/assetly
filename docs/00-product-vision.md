# Product Vision & Business Model

## Product Vision

**Mission:** Give IT teams, MSPs, and enterprises a single cloud platform to discover, inventory, monitor, secure, and remotely support every IT asset — from laptops to network switches — with tenant-safe isolation and MSP-grade automation.

**Vision Statement:** Become the unified operating system for modern IT operations — replacing fragmented tools (asset spreadsheets, RMM agents, ticketing, network monitors) with one auditable, compliant, AI-assisted platform.

---

## Business Goals

| Goal | KPI (Year 1) | KPI (Year 3) |
|------|--------------|--------------|
| MSP & enterprise adoption | 50 paying tenants | 2,000 tenants |
| ARR | $500K | $15M |
| Agent deployment rate | 60% of licensed endpoints | 85% |
| Platform uptime | 99.9% | 99.95% |
| Time-to-value | < 7 days onboarding | < 3 days |
| NPS | 40+ | 55+ |

**Strategic pillars:**
1. **Unified data model** — One source of truth for assets, devices, employees, tickets
2. **Agent-first telemetry** — Lightweight agents with secure command channel
3. **MSP-native multi-tenancy** — Parent/child tenant hierarchy, white-label, per-client billing
4. **Compliance by design** — SOC 2, ISO 27001, GDPR-ready audit trails
5. **Extensibility** — Webhooks, REST API, marketplace integrations

---

## User Personas

### 1. IT Administrator — "Sarah"
- **Company:** 500-employee enterprise
- **Goals:** Track all hardware, warranty renewals, asset assignments
- **Pain:** Spreadsheets, no audit trail, lost devices
- **Uses:** Asset Management, Reporting, Alerting

### 2. System Engineer — "Marcus"
- **Company:** Mid-size SaaS company
- **Goals:** Monitor server health, deploy patches, run scripts remotely
- **Pain:** Multiple RMM tools, inconsistent agent coverage
- **Uses:** Endpoint Monitoring, Remote Management, Software Inventory

### 3. Network Administrator — "Priya"
- **Company:** Healthcare enterprise
- **Goals:** Monitor Cisco/Aruba switches, bandwidth, SNMP alerts
- **Pain:** Separate NMS, no link to asset records
- **Uses:** Network Discovery, Network Device Monitoring

### 4. MSP Provider — "James"
- **Company:** 40-client MSP
- **Goals:** Manage all clients from one pane, bill per endpoint, SLA reporting
- **Pain:** Tool sprawl, per-client silos, margin pressure
- **Uses:** Multi-tenant dashboard, Ticketing, Remote Desktop, MSP billing

### 5. IT Helpdesk Agent — "Emily"
- **Company:** Shared services IT
- **Goals:** Resolve tickets fast, remote assist users, check asset history
- **Pain:** No context on user's device, slow remote tools
- **Uses:** Ticketing, Remote Desktop, Asset lookup

### 6. Enterprise IT Director — "Robert"
- **Company:** Fortune 500
- **Goals:** Compliance reports, executive dashboards, cost optimization
- **Pain:** No visibility into total asset cost, depreciation, risk
- **Uses:** Reporting, Compliance, Executive Dashboards

---

## SaaS Business Model

### Revenue Streams

1. **Subscription (primary)** — Per-endpoint + per-admin seat pricing
2. **MSP Partner tier** — Volume discounts, white-label add-on
3. **Add-ons** — Remote Desktop sessions, advanced reporting, AI assistant
4. **Professional services** — Onboarding, AD integration, custom integrations

### Tenant Types

```
Platform (SaaS Operator)
└── MSP Tenant (optional parent)
    ├── Client Tenant A
    ├── Client Tenant B
    └── Client Tenant C
└── Direct Enterprise Tenant
```

### Subscription Plans

| Plan | Target | Endpoints | Admins | Key Limits |
|------|--------|-----------|--------|------------|
| **Starter** | Small IT teams | 100 | 3 | Assets only, email alerts |
| **Professional** | Mid-market | 1,000 | 15 | + Monitoring, remote mgmt |
| **Enterprise** | Large orgs | 10,000+ | Unlimited | + SSO, SAML, custom SLA |
| **MSP** | Service providers | Per-client pools | Unlimited | + White-label, client hierarchy |

### Usage Metering

- Licensed endpoints (agents installed)
- Network devices monitored
- Remote desktop minutes
- API calls / webhooks
- Storage (session recordings, reports)

---

## Competitive Differentiation

| Capability | Us | Lansweeper | NinjaOne | ManageEngine |
|------------|-----|------------|----------|--------------|
| True multi-tenant MSP hierarchy | ✓ | Partial | ✓ | Partial |
| Unified asset + RMM + ticketing | ✓ | Asset focus | RMM focus | Broad but complex |
| Modern React UI | ✓ | Legacy | ✓ | Legacy |
| Cloud-native K8s architecture | ✓ | Hybrid | ✓ | On-prem heavy |
| AI IT assistant (Phase 7) | Roadmap | No | Limited | Limited |

---

## Success Metrics for Demo / Phase 1

- Stakeholder can create tenant, add 10 assets, assign to employee, scan QR code
- Audit log shows every change with user + timestamp
- Dashboard shows asset breakdown by status, department, warranty expiry
- Demo completes in < 15 minutes without backend errors
