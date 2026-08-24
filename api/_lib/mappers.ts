
import { activeEmployeeLoginEmail } from './employee-auth';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export interface DbTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  domain: string | null;
  infrastructure_strategy: string | null;
  admin_email: string | null;
  admin_name: string | null;
  subscription_status?: string | null;
  subscription_plan_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  razorpay_subscription_id?: string | null;
  billing_region?: string | null;
  trial_ends_at?: string | null;
  created_at: string;
}

export interface DbUser {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role: string;
  created_at: string;
}

export interface DbAsset {
  id: string;
  tenant_id: string;
  asset_tag: string;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  status: string;
  lifecycle_stage: string;
  purchase_date: string | null;
  purchase_cost: string | number | null;
  current_value: string | number | null;
  repair_cost: string | number | null;
  location: string | null;
  department: string | null;
  specs: string | null;
  image_url: string | null;
  vendor_id: string | null;
  assigned_employee_id: string | null;
  warranty_expires_at: string | null;
  notes: string | null;
  qr_code_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbEmployee {
  id: string;
  tenant_id: string;
  employee_number: string | null;
  first_name: string;
  last_name: string;
  email: string;
  joining_email?: string | null;
  official_email?: string | null;
  job_title: string | null;
  department_id: string | null;
  status: string;
  hire_date: string | null;
  created_at: string;
}

export interface DbDepartment {
  id: string;
  tenant_id: string;
  name: string;
  cost_center: string | null;
  created_at: string;
}

export interface DbVendor {
  id: string;
  tenant_id: string;
  name: string;
  contact_email: string | null;
  website: string | null;
  created_at: string;
}

export interface DbAssignment {
  id: string;
  tenant_id: string;
  asset_id: string;
  employee_id: string;
  assigned_at: string;
  returned_at: string | null;
  assigned_by: string | null;
  notes: string | null;
  return_condition: string | null;
}

export interface DbOwnershipEvent {
  id: string;
  tenant_id: string;
  asset_id: string;
  event_type: string;
  description: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  details: string | null;
  created_at: string;
}

export interface DbAssetRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  request_type: string;
  category: string;
  description: string;
  needed_by: string | null;
  status: string;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  asset_ids?: string[] | null;
  employee_first_name?: string | null;
  employee_last_name?: string | null;
  employee_email?: string | null;
  department_name?: string | null;
}

export function mapAsset(row: DbAsset) {
  return {
    id: row.id,
    assetTag: row.asset_tag,
    name: row.name,
    category: row.category,
    manufacturer: row.manufacturer ?? '',
    model: row.model ?? '',
    serialNumber: row.serial_number ?? '',
    status: row.status,
    lifecycleStage: row.lifecycle_stage,
    purchaseDate: row.purchase_date ?? '',
    purchaseCost: Number(row.purchase_cost ?? 0),
    currentValue: Number(row.current_value ?? 0),
    repairCost: Number(row.repair_cost ?? 0),
    location: row.location ?? '',
    department: row.department ?? undefined,
    specs: row.specs ?? undefined,
    imageUrl: row.image_url ?? undefined,
    vendorId: row.vendor_id ?? '',
    assignedEmployeeId: row.assigned_employee_id ?? undefined,
    warrantyExpiresAt: row.warranty_expires_at ?? '',
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapTenant(row: DbTenant) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    domain: row.domain ?? undefined,
    infrastructureStrategy: row.infrastructure_strategy ?? 'shared',
    adminEmail: row.admin_email ?? undefined,
    adminName: row.admin_name ?? undefined,
    subscriptionStatus: row.subscription_status ?? undefined,
    trialEndsAt: row.trial_ends_at ?? undefined,
    billingRegion: row.billing_region === 'GLOBAL' ? 'GLOBAL' : 'IN',
    hasStripeBilling: Boolean(row.stripe_customer_id),
    hasRazorpayBilling: Boolean(row.razorpay_subscription_id),
    createdAt: row.created_at,
  };
}

export function mapUser(row: DbUser) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    role: row.role as any,
    createdAt: row.created_at,
  };
}

export function mapEmployee(row: DbEmployee) {
  const joiningEmail = (row.joining_email ?? row.email ?? '').trim();
  const officialEmail = row.official_email?.trim() || undefined;
  const loginEmail = activeEmployeeLoginEmail(row);

  return {
    id: row.id,
    employeeNumber: row.employee_number ?? '',
    firstName: row.first_name,
    lastName: row.last_name,
    email: loginEmail,
    joiningEmail,
    officialEmail,
    jobTitle: row.job_title ?? '',
    departmentId: row.department_id ?? '',
    status: row.status,
    hireDate: row.hire_date ?? '',
  };
}

export function mapDepartment(row: DbDepartment) {
  return {
    id: row.id,
    name: row.name,
    costCenter: row.cost_center ?? '',
  };
}

export function mapVendor(row: DbVendor) {
  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contact_email ?? '',
    website: row.website ?? '',
  };
}

export function mapAssignment(row: DbAssignment) {
  return {
    id: row.id,
    assetId: row.asset_id,
    employeeId: row.employee_id,
    assignedAt: row.assigned_at,
    returnedAt: row.returned_at ?? undefined,
    assignedBy: row.assigned_by ?? '',
    notes: row.notes ?? undefined,
    returnCondition: row.return_condition ?? undefined,
  };
}

export function mapOwnershipEvent(row: DbOwnershipEvent) {
  return {
    id: row.id,
    assetId: row.asset_id,
    eventType: row.event_type,
    description: row.description ?? '',
    performedBy: row.performed_by ?? '',
    createdAt: row.created_at,
  };
}

export function mapAuditLog(row: DbAuditLog) {
  return {
    id: row.id,
    userId: row.user_id ?? '',
    userName: row.user_name ?? '',
    action: row.action,
    entityType: row.entity_type ?? '',
    entityId: row.entity_id ?? '',
    entityLabel: row.entity_label ?? '',
    details: row.details ?? '',
    createdAt: row.created_at,
  };
}

export function mapAssetRequest(row: DbAssetRequest) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    requestType: row.request_type,
    category: row.category,
    description: row.description,
    neededBy: row.needed_by ?? undefined,
    status: row.status,
    reviewNotes: row.review_notes ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at,
    assetIds: row.asset_ids ?? undefined,
    employeeName:
      row.employee_first_name && row.employee_last_name
        ? `${row.employee_first_name} ${row.employee_last_name}`
        : undefined,
    employeeEmail: row.employee_email ?? undefined,
    departmentName: row.department_name ?? undefined,
  };
}

export function assetInsertPayload(body: Record<string, unknown>, tenantId: string) {
  const assetTag = String(body.assetTag ?? '').trim();
  const name = String(body.name ?? '').trim();
  if (!assetTag || !name) throw new Error('assetTag and name are required');

  const id = body.id ? String(body.id) : crypto.randomUUID();
  const qrOrigin = body.qrOrigin ? String(body.qrOrigin) : '';
  const qrCodeData = qrOrigin ? `${qrOrigin}/lookup/${id}` : `ASSET:${assetTag}:${id}`;

  return {
    id,
    tenantId,
    assetTag,
    name,
    category: String(body.category ?? 'other'),
    manufacturer: String(body.manufacturer ?? ''),
    model: String(body.model ?? ''),
    serialNumber: String(body.serialNumber ?? ''),
    status: String(body.status ?? 'in_stock'),
    lifecycleStage: String(body.lifecycleStage ?? 'active'),
    purchaseDate: body.purchaseDate ? String(body.purchaseDate) : null,
    purchaseCost: Number(body.purchaseCost ?? 0),
    currentValue: Number(body.currentValue ?? body.purchaseCost ?? 0),
    repairCost: Number(body.repairCost ?? 0),
    location: String(body.location ?? ''),
    department: body.department ? String(body.department) : null,
    specs: body.specs ? String(body.specs) : null,
    imageUrl: body.imageUrl ? String(body.imageUrl) : null,
    vendorId: body.vendorId && isUuid(String(body.vendorId)) ? String(body.vendorId) : null,
    assignedEmployeeId:
      body.assignedEmployeeId && isUuid(String(body.assignedEmployeeId))
        ? String(body.assignedEmployeeId)
        : null,
    warrantyExpiresAt: body.warrantyExpiresAt ? String(body.warrantyExpiresAt) : null,
    notes: body.notes ? String(body.notes) : null,
    qrCodeData,
  };
}
