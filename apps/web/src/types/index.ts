/** Asset / device type slug. Built-in values plus tenant-defined types. */
export type AssetCategory = string;

export type DeviceFamily = 'it_asset' | 'peripheral' | 'network' | 'store';

export interface AssetDeviceType {
  id: string;
  tenantId?: string;
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  showInRequests: boolean;
  isPeripheral: boolean;
  family: DeviceFamily;
}
export type AssetStatus = 'in_stock' | 'deployed' | 'in_repair' | 'retired' | 'lost' | 'disposed';
export type LifecycleStage = 'procurement' | 'active' | 'maintenance' | 'end_of_life';
export type EmployeeStatus = 'active' | 'terminated' | 'on_leave';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'RETURN' | 'LOGIN' | 'LOGOUT';
export type UserRole = 'platform_admin' | 'tenant_admin' | 'it_admin' | 'hr_admin' | 'finance_admin' | 'viewer' | 'employee';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  domain?: string;
  infrastructureStrategy?: 'shared' | 'dedicated';
  adminEmail?: string;
  adminName?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string;
  billingRegion?: 'IN' | 'GLOBAL';
  hasStripeBilling?: boolean;
  hasRazorpayBilling?: boolean;
  createdAt?: string;
}

export type BillingRegion = 'IN' | 'GLOBAL';
export type BillingProvider = 'razorpay' | 'stripe';
export type BillingMode = 'demo' | 'stripe' | 'razorpay' | 'dual';

export type PlanTier = 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';

export interface SubscriptionPlan {
  tier: PlanTier;
  name: string;
  maxAssets: number;
  maxAdmins: number;
  maxEndpoints: number;
  pricePerUnit: number;
  featureLabels: string[];
  currency?: string;
  displayPrice?: number;
  priceLabel?: string;
}

export interface SubscriptionUsage {
  assets: number;
  admins: number;
  endpoints: number;
}

export interface BillingSubscription {
  tenantId: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  billingRegion: BillingRegion;
  provider: BillingProvider;
  stripeCustomerId: string | null;
  hasStripeSubscription: boolean;
  hasRazorpaySubscription: boolean;
  plan: SubscriptionPlan;
  usage: SubscriptionUsage;
}

export interface BillingOverview {
  mode: BillingMode;
  provider: BillingProvider;
  billingRegion: BillingRegion;
  currency: string;
  plans: SubscriptionPlan[];
  subscription: BillingSubscription;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeId?: string;
  generatedPassword?: string;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  costCenter: string;
}

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  contactEmail: string;
  website: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  /** Active sign-in email (official when assigned, otherwise joining email). */
  email: string;
  /** Email provided when the employee joined — used for sign-in until official email is set. */
  joiningEmail: string;
  /** Company email assigned by HR; replaces joining email for sign-in when set. */
  officialEmail?: string;
  jobTitle: string;
  departmentId: string;
  status: EmployeeStatus;
  hireDate: string;
}

export interface AssetAssignment {
  id: string;
  tenantId: string;
  assetId: string;
  employeeId: string;
  assignedAt: string;
  returnedAt?: string;
  assignedBy: string;
  notes?: string;
  returnCondition?: string;
}

export interface OwnershipEvent {
  id: string;
  tenantId: string;
  assetId: string;
  eventType: string;
  description: string;
  performedBy: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  tenantId: string;
  assetTag: string;
  name: string;
  category: AssetCategory;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  lifecycleStage: LifecycleStage;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  repairCost: number;
  location: string;
  vendorId: string;
  assignedEmployeeId?: string;
  assignedAssetId?: string;
  warrantyExpiresAt: string;
  activationKey?: string;
  notes?: string;
  specs?: string;
  department?: string;
  imageUrl?: string;
  createdAt: string;
}

export type AssetRequestType = 'new' | 'replacement' | 'accessory' | 'return';
export type AssetRequestStatus = 'submitted' | 'approved' | 'rejected' | 'fulfilled';

export interface AssetRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  requestType: AssetRequestType;
  category: AssetCategory;
  description: string;
  assetIds?: string[];
  neededBy?: string;
  status: AssetRequestStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  employeeName?: string;
  employeeEmail?: string;
  departmentName?: string;
}

export type TicketCategory = 'hardware' | 'software' | 'access' | 'network' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id:               string;
  tenantId:         string;
  employeeId:       string;
  title:            string;
  description:      string;
  category:         TicketCategory;
  priority:         TicketPriority;
  status:           TicketStatus;
  assignedTo?:      string;
  resolutionNotes?: string;
  createdAt:        string;
  updatedAt:        string;
  // joined
  employeeName?:    string;
  employeeEmail?:   string;
  departmentName?:  string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityLabel: string;
  details: string;
  createdAt: string;
}

export interface DemoUserCredential {
  email: string;
  password: string;
  user: User;
}

// ── Endpoint Security ──────────────────────────────────────────────────────────

export interface ActivePort {
  protocol: string;
  local_port: number;
  peer_address: string | null;
  state: string;
}

export interface Endpoint {
  id: string;
  hostname: string;
  serial_number: string | null;
  os_version: string;
  ip_address: string;
  mac_address: string;
  status: string;
  last_seen_at: string;
  cpu_model: string | null;
  ram_total_gb: number | null;
  storage_total_gb: number | null;
  windows_updates: string[] | null;
  firewall_status: string | null;
  defender_status: string | null;
  antivirus_updated_at: string | null;
  active_ports: ActivePort[] | null;
  assigned_employee_name: string | null;
  last_logged_user?: string | null;
  uptime_seconds?: number | null;
  last_reboot_at?: string | null;
  agent_version?: string | null;
  bitlocker_status?: string | null;
  bitlocker_drive?: string | null;
}

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface EndpointThreat {
  id: string;
  threat_type: string;
  severity: ThreatSeverity;
  description: string;
  detected_at: string;
  resolved: boolean;
}

export interface InstalledApp {
  id: string;
  app_name: string;
  version: string | null;
  publisher: string | null;
  install_date: string | null;
  cve_count: number;
  cve_ids: string[];
}

export interface DeviceContextData {
  last_logged_user: string | null;
  uptime_seconds: number | null;
  last_reboot_at: string | null;
  agent_version: string | null;
  bitlocker_status: string | null;
  bitlocker_drive: string | null;
  serial_number: string | null;
}

export const PERMISSIONS = {
  'module:assets': ['platform_admin', 'tenant_admin', 'it_admin', 'viewer'],
  'module:hr': ['platform_admin', 'tenant_admin', 'hr_admin'],
  'module:finance': ['platform_admin', 'tenant_admin', 'finance_admin'],
  'module:docs': ['platform_admin', 'tenant_admin', 'hr_admin', 'it_admin', 'finance_admin', 'viewer'],
  'asset:read': ['platform_admin', 'tenant_admin', 'it_admin', 'viewer'],
  'asset:write': ['platform_admin', 'tenant_admin', 'it_admin'],
  'asset:delete': ['platform_admin', 'tenant_admin'],
  'asset:assign': ['platform_admin', 'tenant_admin', 'it_admin'],
  'asset_type:write': ['platform_admin', 'tenant_admin', 'it_admin'],
  'employee:read': ['platform_admin', 'tenant_admin', 'hr_admin', 'it_admin', 'viewer'],
  'employee:write': ['platform_admin', 'tenant_admin', 'hr_admin'],
  'employee:delete': ['platform_admin', 'tenant_admin'],
  'vendor:write': ['platform_admin', 'tenant_admin', 'it_admin', 'finance_admin'],
  'audit:read': ['platform_admin', 'tenant_admin', 'it_admin', 'hr_admin', 'finance_admin', 'viewer'],
  'settings:write': ['platform_admin', 'tenant_admin'],
  'user:manage': ['platform_admin', 'tenant_admin'],
  'request:create': ['employee'],
  'request:read-own': ['employee'],
  'request:read': ['platform_admin', 'tenant_admin', 'it_admin'],
  'request:review': ['platform_admin', 'tenant_admin', 'it_admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export type NetworkDeviceType =
  | 'cctv'
  | 'wifi_router'
  | 'switch'
  | 'gateway'
  | 'firewall'
  | 'access_point';

export type NetworkDeviceStatus = 'online' | 'offline' | 'warning' | 'maintenance';

export interface NetworkDevice {
  id: string;
  tenantId: string;
  deviceTag: string;
  name: string;
  type: NetworkDeviceType;
  manufacturer: string;
  model: string;
  serialNumber: string;
  ipAddress: string;
  macAddress: string;
  location: string;
  status: NetworkDeviceStatus;
  firmwareVersion: string;
  lastSeenAt: string;
  uptimePercent: number;
  vlan?: string;
  notes?: string;
}

/** Categories employees can request */
export const REQUEST_CATEGORIES: AssetCategory[] = [
  'laptop',
  'desktop',
  'mobile',
  'monitor',
  'keyboard',
  'mouse',
  'webcam',
  'headset',
  'peripheral',
  'other',
];

/** Categories shown under the Devices menu (peripherals) */
export const PERIPHERAL_CATEGORIES: AssetCategory[] = [
  'monitor',
  'keyboard',
  'mouse',
  'webcam',
  'headset',
];
