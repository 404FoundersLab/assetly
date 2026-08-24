# API Specification

**Base URL:** `https://{tenant-slug}.platform.com/api/v1`  
**Local demo:** `http://localhost:3000/api/v1`

**Common headers:**
```
Authorization: Bearer <access_token>
X-Tenant-ID: <uuid>          # Required for platform admin context switching
Content-Type: application/json
X-Request-ID: <uuid>         # Optional, for tracing
```

**Standard error response:**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["assetTag must be unique"],
  "timestamp": "2026-06-10T10:00:00.000Z",
  "path": "/api/v1/assets"
}
```

**Pagination (list endpoints):**
```
?page=1&limit=25&sort=createdAt&order=desc&search=laptop
```

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

---

## Authentication APIs

### POST /auth/login

**Request:**
```json
{
  "email": "admin@acme.com",
  "password": "SecurePass123!",
  "tenantSlug": "acme-corp"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| email | Required, valid email |
| password | Required, min 8 chars |
| tenantSlug | Required for multi-tenant login |

**Response (200):**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "admin@acme.com",
    "firstName": "Jane",
    "lastName": "Admin",
    "roles": ["tenant_admin"],
    "permissions": ["asset:read", "asset:write", "employee:read"]
  },
  "tenant": {
    "id": "uuid",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "plan": "professional"
  }
}
```

### POST /auth/refresh

**Request:** `{ "refreshToken": "..." }`  
**Response:** New access + refresh tokens

### POST /auth/logout

**Request:** `{ "refreshToken": "..." }`  
**Response:** `{ "success": true }`

### POST /auth/mfa/verify

**Request:** `{ "code": "123456", "sessionToken": "..." }`

### GET /auth/saml/metadata

Returns SAML SP metadata (Enterprise plan)

### POST /auth/ldap/login

**Request:** `{ "username": "DOMAIN\\user", "password": "...", "tenantSlug": "..." }`

---

## Asset APIs

### GET /assets

**Query params:** `status`, `category`, `departmentId`, `assignedEmployeeId`, `warrantyExpiringBefore`, `search`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "assetTag": "LAP-001",
      "name": "Dell Latitude 5540",
      "category": "laptop",
      "manufacturer": "Dell",
      "model": "Latitude 5540",
      "serialNumber": "SN123456",
      "status": "deployed",
      "lifecycleStage": "active",
      "assignedEmployee": {
        "id": "uuid",
        "name": "John Smith",
        "email": "john@acme.com"
      },
      "warrantyExpiresAt": "2027-03-15",
      "purchaseCost": 1299.00,
      "currentValue": 974.25,
      "qrCodeUrl": "/api/v1/assets/uuid/qr",
      "createdAt": "2026-01-15T08:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 50, "totalPages": 2 }
}
```

### POST /assets

**Permission:** `asset:write`

**Request:**
```json
{
  "assetTag": "LAP-002",
  "name": "MacBook Pro 14",
  "category": "laptop",
  "manufacturer": "Apple",
  "model": "MacBook Pro 14\" M3",
  "serialNumber": "C02XYZ",
  "status": "in_stock",
  "lifecycleStage": "procurement",
  "purchaseDate": "2026-05-01",
  "purchaseCost": 2499.00,
  "vendorId": "uuid",
  "location": "HQ - Floor 3",
  "warrantyExpiresAt": "2029-05-01",
  "notes": "Ordered for engineering",
  "customFields": { "poNumber": "PO-2026-1042" }
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| assetTag | Required, 1-100 chars, unique per tenant |
| name | Required, 1-255 chars |
| category | Required, enum |
| status | Required, enum |
| serialNumber | Optional, max 255 |
| purchaseCost | Optional, >= 0 |
| vendorId | Optional, valid UUID in tenant |

**Response (201):** Created asset object

### GET /assets/:id

**Response:** Full asset with assignments history, warranty, depreciation

### PATCH /assets/:id

**Request:** Partial update (same fields as POST, all optional)

### DELETE /assets/:id

Soft delete. **Permission:** `asset:delete`

### POST /assets/:id/assign

**Request:**
```json
{
  "employeeId": "uuid",
  "notes": "New hire onboarding",
  "expectedReturnDate": "2028-06-01"
}
```

**Validation:** Asset must be `in_stock` or `deployed`; employee must be active

**Response:** Assignment record + updated asset

### POST /assets/:id/return

**Request:**
```json
{
  "returnCondition": "Good condition, minor wear",
  "notes": "Employee offboarding"
}
```

**Response:** Asset status → `in_stock`, assignment closed

### GET /assets/:id/qr

**Response:** PNG image or `{ "qrData": "https://...", "assetTag": "LAP-001" }`

### GET /assets/:id/history

**Response:** Ownership + audit history timeline

---

## Employee APIs

### GET /employees
### POST /employees
### GET /employees/:id
### PATCH /employees/:id
### DELETE /employees/:id

**POST /employees request:**
```json
{
  "employeeNumber": "EMP-1042",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@acme.com",
  "departmentId": "uuid",
  "managerId": "uuid",
  "hireDate": "2026-03-01",
  "jobTitle": "Software Engineer"
}
```

### GET /employees/:id/assets

Returns all assets currently assigned to employee

---

## Department APIs

### GET /departments
### POST /departments
### GET /departments/:id
### PATCH /departments/:id

**Tree response includes `children[]` for hierarchy**

---

## Vendor APIs

### GET /vendors
### POST /vendors
### GET /vendors/:id
### PATCH /vendors/:id

---

## Dashboard APIs

### GET /dashboard/summary

**Response:**
```json
{
  "assets": {
    "total": 50,
    "byStatus": { "deployed": 35, "in_stock": 10, "in_repair": 3, "retired": 2 },
    "byCategory": { "laptop": 30, "desktop": 10, "server": 5, "other": 5 }
  },
  "warranty": {
    "expiringIn30Days": 4,
    "expiringIn90Days": 12,
    "expired": 2
  },
  "employees": { "total": 20, "withAssets": 18 },
  "recentActivity": []
}
```

### GET /dashboard/warranty-report

Query: `?days=90`

---

## Audit APIs

### GET /audit-logs

**Query:** `entityType`, `entityId`, `userId`, `action`, `from`, `to`

**Permission:** `audit:read`

---

## Monitoring APIs (Phase 2+)

### GET /devices
### GET /devices/:id
### GET /devices/:id/metrics?from=&to=&metric=cpu
### GET /devices/:id/software
### GET /devices/:id/services
### GET /devices/:id/event-logs

### POST /devices/:id/commands

**Request:**
```json
{
  "type": "powershell",
  "script": "Get-Process | Select-Object -First 10",
  "timeoutSeconds": 60
}
```

---

## Ticket APIs (Phase 5+)

### GET /tickets
### POST /tickets
### GET /tickets/:id
### PATCH /tickets/:id
### POST /tickets/:id/comments
### POST /tickets/:id/escalate

**POST /tickets request:**
```json
{
  "type": "incident",
  "priority": "high",
  "subject": "Laptop not booting",
  "description": "User reports blue screen on startup",
  "assignedToId": "uuid",
  "relatedAssetId": "uuid",
  "slaPolicyId": "uuid"
}
```

---

## Alert APIs (Phase 2+)

### GET /alert-rules
### POST /alert-rules
### GET /alerts
### PATCH /alerts/:id/acknowledge

---

## WebSocket APIs

### WS /ws/notifications

**Auth:** JWT in query param or first message

**Server → Client messages:**
```json
{
  "type": "alert.triggered",
  "payload": { "alertId": "uuid", "severity": "critical", "message": "..." }
}
```

### WS /ws/agent (Phase 2)

**Agent → Server:**
```json
{ "type": "heartbeat", "agentId": "uuid", "timestamp": "...", "version": "1.0.0" }
{ "type": "metrics", "deviceId": "uuid", "cpu": 45.2, "memory": 72.1, "disk": 60.0 }
{ "type": "inventory", "software": [...] }
```

**Server → Agent:**
```json
{ "type": "command", "commandId": "uuid", "action": "execute_script", "payload": {...} }
{ "type": "update", "version": "1.0.1", "downloadUrl": "..." }
```

### WS /ws/remote (Phase 3)

Streams command stdout/stderr in real time

### WS /ws/rdp (Phase 6)

WebRTC signaling for browser-based remote desktop

---

## Rate Limits

| Plan | API req/min | WebSocket connections |
|------|-------------|----------------------|
| Starter | 300 | 10 |
| Professional | 1,000 | 50 |
| Enterprise | 5,000 | 500 |
| MSP | 10,000 | 1,000 |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## OpenAPI

Full OpenAPI 3.1 spec will be generated at `/api/docs` (Swagger) when NestJS `@nestjs/swagger` is configured.
