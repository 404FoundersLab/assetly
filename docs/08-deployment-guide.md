# Deployment Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 LTS |
| pnpm | 9+ |
| Docker Desktop | 4.x |
| PostgreSQL client | 16 (optional, for manual SQL) |
| kubectl | 1.29+ (production) |
| Azure CLI | 2.60+ (cloud deploy) |

---

## Local Development (Phase 1 Demo)

### Step 1: Clone and install

```bash
git clone <repo-url> it-asset-platform
cd it-asset-platform
pnpm install
```

### Step 2: Start infrastructure

```bash
docker compose -f docker/docker-compose.demo.yml up -d
```

Services started:
- PostgreSQL on `localhost:5432` (user: `platform`, password: `platform_dev`, db: `itasset`)
- Redis on `localhost:6379`

### Step 3: Initialize database

```bash
# Windows PowerShell
$env:PGPASSWORD = "platform_dev"
psql -h localhost -U platform -d itasset -f database/schema/001_core_tenant.sql
psql -h localhost -U platform -d itasset -f database/schema/002_asset_management.sql
psql -h localhost -U platform -d itasset -f database/schema/003_audit.sql
psql -h localhost -U platform -d itasset -f database/seed/demo_seed.sql
```

### Step 4: Configure environment

**apps/api/.env:**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://platform:platform_dev@localhost:5432/itasset
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
```

**apps/web/.env:**
```env
VITE_API_URL=http://localhost:3000/api/v1
```

### Step 5: Run applications

```bash
# Terminal 1 — API
cd apps/api && pnpm run start:dev

# Terminal 2 — Web
cd apps/web && pnpm run dev
```

Open: http://localhost:5173  
Demo login: `admin@acme.com` / `Demo@123456` (after seed applied)

---

## Docker Production Build

```bash
docker build -f docker/Dockerfile.api -t itasset-api:latest .
docker build -f docker/Dockerfile.web -t itasset-web:latest .
```

---

## Kubernetes Deployment (Azure AKS)

### Step 1: Provision infrastructure

```bash
cd infrastructure/terraform/azure
terraform init
terraform plan -var-file=production.tfvars
terraform apply -var-file=production.tfvars
```

### Step 2: Configure kubectl

```bash
az aks get-credentials --resource-group itasset-prod-rg --name itasset-aks
```

### Step 3: Deploy secrets

```bash
kubectl create namespace itasset-prod
kubectl apply -f infrastructure/kubernetes/base/secrets.yaml -n itasset-prod
```

### Step 4: Run migrations

```bash
kubectl apply -f infrastructure/kubernetes/base/migration-job.yaml -n itasset-prod
kubectl wait --for=condition=complete job/db-migrate -n itasset-prod --timeout=300s
```

### Step 5: Deploy application

```bash
kubectl apply -k infrastructure/kubernetes/overlays/production
kubectl rollout status deployment/itasset-api -n itasset-prod
```

### Step 6: Verify

```bash
curl https://api.platform.com/health
# Expected: {"status":"ok","database":"connected","redis":"connected"}
```

---

## Azure-Specific Configuration

### DNS

```
*.platform.com     → Azure Front Door
api.platform.com   → Front Door → AKS Ingress
status.platform.com → Status page (Better Stack / Azure)
```

### Entra ID SSO (Enterprise)

1. Register app in Entra ID
2. Configure redirect URI: `https://api.platform.com/api/v1/auth/entra/callback`
3. Store client ID/secret in Key Vault
4. Enable in tenant settings UI

### Managed Identity

AKS pods use Workload Identity to access:
- Azure Key Vault (secrets)
- Azure Blob Storage (exports)
- Azure Service Bus (optional RabbitMQ replacement)

---

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — process alive |
| `GET /health/ready` | Readiness — DB + Redis connected |
| `GET /health/live` | Minimal ping |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| RLS blocks all queries | Ensure `SET app.current_tenant` runs per connection |
| JWT invalid | Check clock sync; verify JWT_SECRET matches |
| CORS errors | Add frontend origin to CORS_ORIGIN |
| Migration fails | Check PostgreSQL version ≥ 16; review migration logs |
| Redis connection refused | Verify docker compose is running |

---

## Demo Environment (Stakeholder)

Deploy demo to Azure with fixed seed data:

```bash
# Use demo overlay
kubectl apply -k infrastructure/kubernetes/overlays/demo
```

**Demo URL:** https://demo.itasset.io  
**Reset schedule:** Nightly job restores seed data  
**Credentials:** Provided in demo script (see Phase 1 Demo Plan)
