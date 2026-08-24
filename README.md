# IT Asset & Remote Management Platform

Enterprise multi-tenant SaaS for IT asset lifecycle management, endpoint monitoring, remote support, and MSP operations.

**Comparable products:** ManageEngine Endpoint Central, Lansweeper, NinjaOne, Action1, ConnectWise Automate

---

## Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 1 | [System Architecture](docs/01-system-architecture.md) | High-level design, multi-tenant strategy, diagrams |
| 2 | [Database Schema](docs/02-database-schema.md) | ER diagram, PostgreSQL schema, indexes, audit tables |
| 3 | [Folder Structure](docs/03-folder-structure.md) | Monorepo layout for frontend, backend, agents, infra |
| 4 | [API Specification](docs/04-api-specification.md) | REST + WebSocket APIs with request/response schemas |
| 5 | [Agent Architecture](docs/05-agent-architecture.md) | Windows/Linux/macOS agent design |
| 6 | [DevOps Architecture](docs/07-devops-architecture.md) | Docker, K8s, CI/CD, Azure, DR |
| 7 | [Security Design](docs/06-security-design.md) | RBAC, MFA, Zero Trust, encryption, compliance |
| 8 | [Deployment Guide](docs/08-deployment-guide.md) | Local, staging, and production deployment |
| 9 | [SaaS Pricing Model](docs/09-pricing-model.md) | Plans, limits, MSP billing |
| 10 | [Development Roadmap](docs/10-roadmap.md) | 7-phase product roadmap |
| **→** | [**Phase 1 Demo Plan**](docs/11-phase1-demo-plan.md) | **Initial MVP scope, timeline, demo script** |
| 14 | [Multi-Tenant Database Architecture](docs/14-multi-tenant-database-architecture.md) | Shared DB vs dedicated DB per org, Neon provisioning |

---

## Quick Start (Phase 1 Demo)

```bash
# From project root
npm install
cd apps/web && npm install && cd ../..
npm run dev
# Open http://localhost:5173

# Demo login: admin@acme.com / Demo@123456
```

Or run directly from the web app folder:

```bash
cd apps/web
npm install
npm run dev
```

```bash
# Start infrastructure (optional, for future API)
docker compose -f docker/docker-compose.demo.yml up -d
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Material UI, Redux Toolkit |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Messaging | RabbitMQ |
| Monitoring | Prometheus + Grafana |
| Auth | JWT, LDAP, AD, Entra ID, SAML |
| Deployment | Docker, Kubernetes, Azure |

---

## Phase 1 Demo Scope (Asset Management MVP)

See [Phase 1 Demo Plan](docs/11-phase1-demo-plan.md) for full details.

**Demo delivers:**
- Multi-tenant login with RBAC
- Asset inventory CRUD with lifecycle states
- Employee & department management
- Asset assignment / return workflows
- QR code generation & scan lookup
- Warranty & vendor tracking
- Audit trail
- Executive dashboard (asset counts, warranty expiry)

**Timeline:** 10 weeks | **Team:** 5 engineers | **Target:** Stakeholder demo + pilot customer

---

## Deploy to Cloud (Free)

This demo is a **static React SPA** (`apps/web`). No backend is required for the current UI.

### Recommended free platforms

| Platform | Free tier | Best for | Auto-deploy from Git |
|----------|-----------|----------|----------------------|
| **[Cloudflare Pages](https://pages.cloudflare.com/)** | Unlimited static bandwidth | Production demos, global CDN | Yes (GitHub/GitLab) |
| **[Vercel](https://vercel.com/)** | 100 GB bandwidth/mo | Easiest Vite setup | Yes (GitHub) |
| **[Netlify](https://www.netlify.com/)** | 100 GB bandwidth/mo | Simple UI, forms later | Yes (GitHub) |
| **[Render](https://render.com/)** | Free static sites | Static + future API on same account | Yes (GitHub) |

**Pick one:** Cloudflare Pages (best free bandwidth) or Vercel (fastest setup). Config files are included: `vercel.json`, `netlify.toml`, and `apps/web/public/_redirects` (SPA routing).

### Build settings (all platforms)

| Setting | Value |
|---------|--------|
| Root / base directory | `apps/web` (Netlify) or repo root (Vercel uses `vercel.json`) |
| Install | `npm install` |
| Build | `npm run build` |
| Output | `dist` |

### Push to GitHub

```bash
cd D:\Pavan\asset
git init
git add .
git commit -m "Initial commit: IT Asset Platform demo UI"
# Create empty repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/it-asset-platform.git
git branch -M main
git push -u origin main
```

### Deploy on Vercel (example)

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New Project** → import your repo.
3. Vercel reads `vercel.json` automatically → **Deploy**.
4. Live URL: `https://your-project.vercel.app`

### Deploy on Cloudflare Pages (example)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → Connect GitHub.
2. Build: `npm run build`, output `dist`, root directory `apps/web`.
3. **Save and Deploy**.

Demo login after deploy: `admin@acme.com` / `Demo@123456`
