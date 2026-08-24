# Folder Structure

Monorepo layout using **pnpm workspaces** + **Turborepo** (recommended).

```
it-asset-platform/
├── apps/
│   ├── web/                          # React + MUI frontend
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/                  # App shell, routing
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── assets/
│   │   │   │   ├── employees/
│   │   │   │   ├── departments/
│   │   │   │   ├── vendors/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── monitoring/       # Phase 2+
│   │   │   │   ├── remote/           # Phase 3+
│   │   │   │   ├── network/          # Phase 4+
│   │   │   │   ├── tickets/          # Phase 5+
│   │   │   │   └── settings/
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── utils/
│   │   │   │   └── types/
│   │   │   ├── store/                # Redux Toolkit slices
│   │   │   │   ├── index.ts
│   │   │   │   ├── authSlice.ts
│   │   │   │   ├── assetSlice.ts
│   │   │   │   └── tenantSlice.ts
│   │   │   └── theme/                # MUI theme
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── api/                          # NestJS backend (modular monolith → microservices)
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   ├── rbac.guard.ts
│       │   │   │   └── tenant.guard.ts
│       │   │   ├── interceptors/
│       │   │   │   └── audit.interceptor.ts
│       │   │   ├── middleware/
│       │   │   │   └── tenant-context.middleware.ts
│       │   │   └── pipes/
│       │   ├── config/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── tenant/
│       │   │   ├── user/
│       │   │   ├── rbac/
│       │   │   ├── asset/
│       │   │   ├── employee/
│       │   │   ├── department/
│       │   │   ├── vendor/
│       │   │   ├── warranty/
│       │   │   ├── audit/
│       │   │   ├── dashboard/
│       │   │   ├── agent/            # Phase 2+
│       │   │   ├── monitoring/       # Phase 2+
│       │   │   ├── remote/           # Phase 3+
│       │   │   ├── network/          # Phase 4+
│       │   │   ├── ticket/           # Phase 5+
│       │   │   ├── alert/            # Phase 2+
│       │   │   └── report/
│       │   └── database/
│       │       ├── migrations/
│       │       └── seeds/
│       ├── test/
│       └── package.json
│
├── agents/
│   ├── core/                         # Shared agent library (Rust or Go)
│   │   ├── src/
│   │   │   ├── comms/                # mTLS, WebSocket, RabbitMQ
│   │   │   ├── metrics/
│   │   │   ├── inventory/
│   │   │   ├── executor/
│   │   │   └── updater/
│   │   └── Cargo.toml / go.mod
│   ├── windows/                      # Windows service wrapper
│   ├── linux/                        # systemd unit
│   └── macos/                        # launchd plist
│
├── packages/
│   ├── shared-types/                 # Shared TS types (API contracts)
│   ├── ui-components/                # Shared MUI components
│   ├── eslint-config/
│   └── tsconfig/
│
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   └── docker-compose.demo.yml
│   ├── kubernetes/
│   │   ├── base/
│   │   │   ├── namespace.yaml
│   │   │   ├── api-deployment.yaml
│   │   │   ├── web-deployment.yaml
│   │   │   ├── postgres-statefulset.yaml
│   │   │   ├── redis-deployment.yaml
│   │   │   └── ingress.yaml
│   │   └── overlays/
│   │       ├── staging/
│   │       └── production/
│   ├── terraform/
│   │   └── azure/
│   │       ├── main.tf
│   │       ├── aks.tf
│   │       ├── postgres.tf
│   │       └── networking.tf
│   └── prometheus/
│       ├── prometheus.yml
│       └── alerts.yml
│
├── database/
│   ├── schema/
│   │   ├── 001_core_tenant.sql
│   │   ├── 002_asset_management.sql
│   │   └── 003_audit.sql
│   └── seed/
│       └── demo_seed.sql
│
├── docs/                             # Architecture documentation
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd-staging.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## Module Boundaries (NestJS Phase 1)

| Module | Responsibility | Depends On |
|--------|----------------|------------|
| `auth` | Login, JWT, refresh, MFA stub | user, tenant |
| `tenant` | Company CRUD, subscription limits | — |
| `user` | User management | rbac, tenant |
| `rbac` | Roles, permissions | — |
| `asset` | Asset CRUD, lifecycle, QR | employee, vendor, audit |
| `employee` | Employee CRUD | department, audit |
| `department` | Department hierarchy | audit |
| `vendor` | Vendor management | audit |
| `warranty` | Warranty records | asset, audit |
| `audit` | Audit log queries | — |
| `dashboard` | Aggregated stats | asset, employee |

---

## Frontend Feature Structure

Each feature folder follows:

```
features/assets/
├── components/
│   ├── AssetList.tsx
│   ├── AssetForm.tsx
│   ├── AssetDetail.tsx
│   ├── AssignAssetDialog.tsx
│   └── QRCodeDisplay.tsx
├── hooks/
│   └── useAssets.ts
├── api/
│   └── assetsApi.ts
├── types/
│   └── asset.types.ts
└── pages/
    ├── AssetsPage.tsx
    └── AssetDetailPage.tsx
```

---

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| API routes | kebab-case, plural | `/api/v1/assets` |
| DB tables | snake_case, plural | `asset_assignments` |
| TS interfaces | PascalCase | `AssetCreateDto` |
| Redux slices | camelCase + Slice | `assetSlice` |
| K8s resources | app-env-type | `itasset-api-prod` |
