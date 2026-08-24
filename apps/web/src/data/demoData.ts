import type {
  Asset,
  AssetAssignment,
  AssetRequest,
  AuditLog,
  Department,
  Employee,
  NetworkDevice,
  OwnershipEvent,
  Tenant,
  User,
  Vendor,
} from '../types';
import { COMPANY_EMAIL_DOMAIN, COMPANY_NAME, COMPANY_SLUG } from '../constants/brand';

export const DEMO_TENANT: Tenant = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Solum Technologies',
  slug: 'solum-technologies',
  plan: 'Professional',
};

export const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'sysadmin@assetly.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-sysadmin',
      tenantId: 'system',
      email: 'sysadmin@assetly.com',
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'platform_admin',
    },
  },
  'admin@solumtechnologies.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-admin',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'admin@solumtechnologies.com',
      firstName: 'Vasanth',
      lastName: '',
      role: 'tenant_admin',
    },
  },
  'itadmin@solumtechnologies.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-itadmin',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'itadmin@solumtechnologies.com',
      firstName: 'Pavan',
      lastName: '',
      role: 'it_admin',
    },
  },
  'viewer@solumtechnologies.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-viewer',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'viewer@solumtechnologies.com',
      firstName: 'Lisa',
      lastName: 'Viewer',
      role: 'viewer',
    },
  },
  'hradmin@solumtechnologies.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-hradmin',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'hradmin@solumtechnologies.com',
      firstName: 'Emily',
      lastName: 'Davis',
      role: 'hr_admin',
    },
  },
  'financeadmin@solumtechnologies.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-financeadmin',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'financeadmin@solumtechnologies.com',
      firstName: 'Priya',
      lastName: 'Patel',
      role: 'finance_admin',
    },
  },
  'sarah.chen@solumtechnologies.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-employee-sarah',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'sarah.chen@solumtechnologies.com',
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'employee',
      employeeId: 'emp-001',
    },
  },
  'itadmin2@solumtechnologies.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-itadmin-2',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'itadmin2@solumtechnologies.com',
      firstName: 'Alex',
      lastName: 'Thompson',
      role: 'it_admin',
    },
  },
  'hradmin2@solumtechnologies.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-hradmin-2',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'hradmin2@solumtechnologies.com',
      firstName: 'Jordan',
      lastName: 'Smith',
      role: 'hr_admin',
    },
  },
  'mike.johnson@solumtechnologies.com': {
    password: 'Demo@123456',
    user: {
      id: 'user-employee-mike',
      tenantId: '11111111-1111-1111-1111-111111111111',
      email: 'mike.johnson@solumtechnologies.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'employee',
      employeeId: 'emp-002',
    },
  },
};

export const DEMO_DEPARTMENTS: Department[] = [
  { id: '22222222-2222-2222-2222-222222222201', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Engineering',     costCenter: 'CC-100' },
  { id: '22222222-2222-2222-2222-222222222202', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Human Resources',  costCenter: 'CC-200' },
  { id: '22222222-2222-2222-2222-222222222203', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Sales',            costCenter: 'CC-300' },
  { id: '22222222-2222-2222-2222-222222222204', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Finance',          costCenter: 'CC-400' },
  { id: '22222222-2222-2222-2222-222222222205', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Operations',       costCenter: 'CC-500' },
];

export const DEMO_VENDORS: Vendor[] = [
  { id: '33333333-3333-3333-3333-333333333301', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Dell Technologies', contactEmail: 'sales@dell.com',        website: 'https://dell.com' },
  { id: '33333333-3333-3333-3333-333333333302', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Apple Inc',         contactEmail: 'enterprise@apple.com',  website: 'https://apple.com' },
  { id: '33333333-3333-3333-3333-333333333303', tenantId: '11111111-1111-1111-1111-111111111111', name: 'HP Inc',            contactEmail: 'business@hp.com',       website: 'https://hp.com' },
  { id: '33333333-3333-3333-3333-333333333304', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Logitech',          contactEmail: 'business@logitech.com', website: 'https://logitech.com' },
  { id: '33333333-3333-3333-3333-333333333305', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Cisco Systems',     contactEmail: 'sales@cisco.com',       website: 'https://cisco.com' },
  { id: '33333333-3333-3333-3333-333333333306', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Ubiquiti',          contactEmail: 'sales@ubnt.com',        website: 'https://ui.com' },
  { id: '33333333-3333-3333-3333-333333333307', tenantId: '11111111-1111-1111-1111-111111111111', name: 'Hikvision',         contactEmail: 'sales@hikvision.com',   website: 'https://hikvision.com' },
];

const employeeData: Omit<Employee, 'id' | 'tenantId'>[] = [
  { employeeNumber: 'EMP-001', firstName: 'Sarah',    lastName: 'Chen',     joiningEmail: 'sarah.chen@solumtechnologies.com',    email: 'sarah.chen@solumtechnologies.com',    jobTitle: 'Senior Software Engineer', departmentId: '22222222-2222-2222-2222-222222222201', status: 'active', hireDate: '2023-07-24' },
  { employeeNumber: 'EMP-002', firstName: 'Mike',     lastName: 'Johnson',  joiningEmail: 'mike.johnson@solumtechnologies.com',   email: 'mike.johnson@solumtechnologies.com',   jobTitle: 'DevOps Engineer',          departmentId: '22222222-2222-2222-2222-222222222201', status: 'active', hireDate: '2023-06-01' },
  { employeeNumber: 'EMP-003', firstName: 'Emily',    lastName: 'Davis',    joiningEmail: 'emily.davis@solumtechnologies.com',    email: 'emily.davis@solumtechnologies.com',    jobTitle: 'HR Manager',               departmentId: '22222222-2222-2222-2222-222222222202', status: 'active', hireDate: '2022-03-10' },
  { employeeNumber: 'EMP-004', firstName: 'James',    lastName: 'Wilson',   joiningEmail: 'james.wilson@solumtechnologies.com',   email: 'james.wilson@solumtechnologies.com',   jobTitle: 'Sales Director',           departmentId: '22222222-2222-2222-2222-222222222203', status: 'active', hireDate: '2021-08-20' },
  { employeeNumber: 'EMP-005', firstName: 'Priya',    lastName: 'Patel',    joiningEmail: 'priya.patel@solumtechnologies.com',    email: 'priya.patel@solumtechnologies.com',    jobTitle: 'Financial Analyst',        departmentId: '22222222-2222-2222-2222-222222222204', status: 'active', hireDate: '2024-02-01' },
  { employeeNumber: 'EMP-006', firstName: 'David',    lastName: 'Brown',    joiningEmail: 'david.brown@solumtechnologies.com',    email: 'david.brown@solumtechnologies.com',    jobTitle: 'Backend Developer',        departmentId: '22222222-2222-2222-2222-222222222201', status: 'active', hireDate: '2023-11-15' },
  { employeeNumber: 'EMP-007', firstName: 'Anna',     lastName: 'Martinez', joiningEmail: 'anna.martinez@solumtechnologies.com',  email: 'anna.martinez@solumtechnologies.com',  jobTitle: 'Frontend Developer',       departmentId: '22222222-2222-2222-2222-222222222201', status: 'active', hireDate: '2024-04-01' },
  { employeeNumber: 'EMP-008', firstName: 'Robert',   lastName: 'Taylor',   joiningEmail: 'robert.taylor@solumtechnologies.com',  email: 'robert.taylor@solumtechnologies.com',  jobTitle: 'Account Executive',        departmentId: '22222222-2222-2222-2222-222222222203', status: 'active', hireDate: '2023-01-10' },
  { employeeNumber: 'EMP-009', firstName: 'Jennifer', lastName: 'Lee',      joiningEmail: 'jennifer.lee@solumtechnologies.com',   email: 'jennifer.lee@solumtechnologies.com',   jobTitle: 'Operations Manager',       departmentId: '22222222-2222-2222-2222-222222222205', status: 'active', hireDate: '2022-07-01' },
  { employeeNumber: 'EMP-010', firstName: 'Chris',    lastName: 'Anderson', joiningEmail: 'chris.anderson@solumtechnologies.com', email: 'chris.anderson@solumtechnologies.com', jobTitle: 'QA Engineer',              departmentId: '22222222-2222-2222-2222-222222222201', status: 'active', hireDate: '2024-06-15' },
  { employeeNumber: 'EMP-011', firstName: 'Tom',      lastName: 'Reed',     joiningEmail: 'tom.reed.joining@example.com',           email: 'tom.reed.joining@example.com',           jobTitle: 'Junior Developer',         departmentId: '22222222-2222-2222-2222-222222222201', status: 'active', hireDate: '2026-07-01' },
];

export const DEMO_EMPLOYEES: Employee[] = employeeData.map((e, i) => ({
  ...e,
  id: `44444444-4444-4444-4444-4444444444${String(i + 1).padStart(2, '0')}`,
  tenantId: '11111111-1111-1111-1111-111111111111',
}));

const assetNames = ['Dell Latitude 5540', 'MacBook Pro 14', 'HP EliteBook 840', 'Dell OptiPlex 7090', 'iPhone 15 Pro'];
const categories: Asset['category'][] = ['laptop', 'laptop', 'laptop', 'desktop', 'mobile'];
const manufacturers = ['Dell', 'Apple', 'HP'];
const vendorIds = ['33333333-3333-3333-3333-333333333301', '33333333-3333-3333-3333-333333333302', '33333333-3333-3333-3333-333333333303'];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export function generateDemoAssets(): Asset[] {
  return [...generateItAssets(), ...generatePeripheralAssets()];
}

function generateItAssets(): Asset[] {
  const assets: Asset[] = [];
  for (let i = 1; i <= 50; i++) {
    const idx = (i - 1) % 5;
    const status: Asset['status'] =
      i <= 35 ? 'deployed' : i <= 45 ? 'in_stock' : i <= 48 ? 'in_repair' : 'retired';
    const purchaseCost = 800 + i * 50;
    assets.push({
      id: `55555555-5555-5555-5555-${String(i).padStart(12, '0')}`,
      tenantId: '11111111-1111-1111-1111-111111111111',
      assetTag: `AST-${String(i).padStart(3, '0')}`,
      name: assetNames[idx],
      category: categories[idx],
      manufacturer: manufacturers[i % 3],
      model: `Model-${i}`,
      serialNumber: `SN-${i.toString(16).padStart(8, '0')}`,
      status,
      lifecycleStage: 'active',
      purchaseDate: daysAgo(i * 30),
      purchaseCost,
      currentValue: Math.round(purchaseCost * 0.75),
      repairCost: status === 'in_repair' ? 150 : (status === 'retired' ? 250 : (i % 7 === 0 ? 75 : 0)),
      location: `HQ Floor ${(i % 5) + 1}`,
      vendorId: vendorIds[i % 3],
      assignedEmployeeId: i <= 35 ? DEMO_EMPLOYEES[(i - 1) % DEMO_EMPLOYEES.length].id : undefined,
      warrantyExpiresAt: i <= 4 ? daysFromNow(15) : i <= 12 ? daysFromNow(60) : daysFromNow(365),
      createdAt: daysAgo(i * 30),
    });
  }
  return assets;
}

const peripheralCatalog: {
  category: Asset['category'];
  name: string;
  manufacturer: string;
  vendorId: string;
  cost: number;
}[] = [
  { category: 'monitor',  name: 'Dell UltraSharp 27" U2723QE',  manufacturer: 'Dell',     vendorId: '33333333-3333-3333-3333-333333333301', cost: 549 },
  { category: 'monitor',  name: 'LG 27UK850-W 4K',              manufacturer: 'LG',       vendorId: '33333333-3333-3333-3333-333333333301', cost: 399 },
  { category: 'monitor',  name: 'Samsung Odyssey G5 32"',        manufacturer: 'Samsung',  vendorId: '33333333-3333-3333-3333-333333333303', cost: 329 },
  { category: 'monitor',  name: 'HP E24 G5',                     manufacturer: 'HP',       vendorId: '33333333-3333-3333-3333-333333333303', cost: 219 },
  { category: 'monitor',  name: 'Apple Studio Display',          manufacturer: 'Apple',    vendorId: '33333333-3333-3333-3333-333333333302', cost: 1599 },
  { category: 'keyboard', name: 'Logitech MX Keys',              manufacturer: 'Logitech', vendorId: '33333333-3333-3333-3333-333333333304', cost: 119 },
  { category: 'keyboard', name: 'Dell KB216 Wired',              manufacturer: 'Dell',     vendorId: '33333333-3333-3333-3333-333333333301', cost: 25 },
  { category: 'keyboard', name: 'Apple Magic Keyboard',          manufacturer: 'Apple',    vendorId: '33333333-3333-3333-3333-333333333302', cost: 149 },
  { category: 'keyboard', name: 'Logitech K780 Multi-Device',    manufacturer: 'Logitech', vendorId: '33333333-3333-3333-3333-333333333304', cost: 79 },
  { category: 'mouse',    name: 'Logitech MX Master 3S',         manufacturer: 'Logitech', vendorId: '33333333-3333-3333-3333-333333333304', cost: 99 },
  { category: 'mouse',    name: 'Dell MS116 Optical',            manufacturer: 'Dell',     vendorId: '33333333-3333-3333-3333-333333333301', cost: 15 },
  { category: 'mouse',    name: 'Apple Magic Mouse',             manufacturer: 'Apple',    vendorId: '33333333-3333-3333-3333-333333333302', cost: 79 },
  { category: 'mouse',    name: 'Logitech M720 Triathlon',       manufacturer: 'Logitech', vendorId: '33333333-3333-3333-3333-333333333304', cost: 49 },
  { category: 'webcam',   name: 'Logitech C920 HD Pro',          manufacturer: 'Logitech', vendorId: '33333333-3333-3333-3333-333333333304', cost: 79 },
  { category: 'headset',  name: 'Logitech Zone Wired 2',         manufacturer: 'Logitech', vendorId: '33333333-3333-3333-3333-333333333304', cost: 129 },
  { category: 'headset',  name: 'Jabra Evolve2 65',              manufacturer: 'Jabra',    vendorId: '33333333-3333-3333-3333-333333333304', cost: 249 },
];

function generatePeripheralAssets(): Asset[] {
  return peripheralCatalog.map((item, i) => {
    const num = 51 + i;
    const deployed = i < 12;
    return {
      id: `55555555-5555-5555-5556-${String(i + 1).padStart(12, '0')}`,
      tenantId: '11111111-1111-1111-1111-111111111111',
      assetTag: `DEV-${String(i + 1).padStart(3, '0')}`,
      name: item.name,
      category: item.category,
      manufacturer: item.manufacturer,
      model: item.name.split(' ').slice(-1)[0],
      serialNumber: `SN-DEV-${String(num).padStart(5, '0')}`,
      status: deployed ? 'deployed' : 'in_stock',
      lifecycleStage: 'active',
      purchaseDate: daysAgo(90 + i * 5),
      purchaseCost: item.cost,
      currentValue: Math.round(item.cost * 0.8),
      repairCost: 0,
      location: `HQ Floor ${(i % 5) + 1}`,
      vendorId: item.vendorId,
      assignedEmployeeId: deployed ? DEMO_EMPLOYEES[i % DEMO_EMPLOYEES.length].id : undefined,
      warrantyExpiresAt: daysFromNow(180 + i * 30),
      createdAt: daysAgo(90 + i * 5),
    };
  });
}

export function generateDemoNetworkDevices(): NetworkDevice[] {
  const catalog: Omit<NetworkDevice, 'id' | 'deviceTag' | 'tenantId'>[] = [
    { name: 'Lobby CCTV — Main Entrance', type: 'cctv', manufacturer: 'Hikvision', model: 'DS-2CD2143G2', serialNumber: 'HK-CCTV-001', ipAddress: '10.0.10.101', macAddress: '00:18:AE:01:01:01', location: 'HQ Lobby', status: 'online', firmwareVersion: '5.7.3', lastSeenAt: new Date().toISOString(), uptimePercent: 99.8, vlan: 'VLAN-100' },
    { name: 'Parking Lot Camera A', type: 'cctv', manufacturer: 'Hikvision', model: 'DS-2CD2387G2', serialNumber: 'HK-CCTV-002', ipAddress: '10.0.10.102', macAddress: '00:18:AE:01:01:02', location: 'Parking Lot A', status: 'online', firmwareVersion: '5.7.3', lastSeenAt: new Date().toISOString(), uptimePercent: 98.5, vlan: 'VLAN-100' },
    { name: 'Server Room CCTV', type: 'cctv', manufacturer: 'Hikvision', model: 'DS-2CD2183G2', serialNumber: 'HK-CCTV-003', ipAddress: '10.0.10.103', macAddress: '00:18:AE:01:01:03', location: 'Server Room', status: 'warning', firmwareVersion: '5.6.1', lastSeenAt: daysAgo(0) + 'T08:00:00.000Z', uptimePercent: 92.0, notes: 'Firmware update pending' },
    { name: 'Floor 3 Corridor Camera', type: 'cctv', manufacturer: 'Hikvision', model: 'DS-2CD2043G2', serialNumber: 'HK-CCTV-004', ipAddress: '10.0.10.104', macAddress: '00:18:AE:01:01:04', location: 'HQ Floor 3', status: 'online', firmwareVersion: '5.7.3', lastSeenAt: new Date().toISOString(), uptimePercent: 99.1, vlan: 'VLAN-100' },
    { name: 'Core WiFi Router — Floor 1', type: 'wifi_router', manufacturer: 'Ubiquiti', model: 'Dream Machine Pro', serialNumber: 'UBNT-WIFI-001', ipAddress: '10.0.1.1', macAddress: '74:AC:B9:01:01:01', location: 'HQ Floor 1 IDF', status: 'online', firmwareVersion: '3.2.7', lastSeenAt: new Date().toISOString(), uptimePercent: 99.9 },
    { name: 'WiFi Router — Floor 2', type: 'wifi_router', manufacturer: 'Ubiquiti', model: 'Dream Machine', serialNumber: 'UBNT-WIFI-002', ipAddress: '10.0.2.1', macAddress: '74:AC:B9:01:02:01', location: 'HQ Floor 2 IDF', status: 'online', firmwareVersion: '3.2.7', lastSeenAt: new Date().toISOString(), uptimePercent: 99.5 },
    { name: 'Guest WiFi Router', type: 'wifi_router', manufacturer: 'Cisco', model: 'Meraki MR46', serialNumber: 'CSCO-WIFI-001', ipAddress: '10.0.50.1', macAddress: '00:18:0A:50:01:01', location: 'HQ Floor 1', status: 'online', firmwareVersion: '28.7.1', lastSeenAt: new Date().toISOString(), uptimePercent: 99.7, vlan: 'VLAN-50' },
    { name: 'Core Switch — 48 Port', type: 'switch', manufacturer: 'Cisco', model: 'Catalyst 9300-48P', serialNumber: 'CSCO-SW-001', ipAddress: '10.0.0.10', macAddress: '00:1E:BD:00:01:01', location: 'Server Room', status: 'online', firmwareVersion: '17.9.4', lastSeenAt: new Date().toISOString(), uptimePercent: 99.99 },
    { name: 'Floor 2 Access Switch', type: 'switch', manufacturer: 'Cisco', model: 'Catalyst 9200-24P', serialNumber: 'CSCO-SW-002', ipAddress: '10.0.0.11', macAddress: '00:1E:BD:00:02:01', location: 'HQ Floor 2 IDF', status: 'online', firmwareVersion: '17.9.4', lastSeenAt: new Date().toISOString(), uptimePercent: 99.8 },
    { name: 'Floor 3 Access Switch', type: 'switch', manufacturer: 'Aruba', model: '2930F-24G', serialNumber: 'ARUB-SW-001', ipAddress: '10.0.0.12', macAddress: '00:1A:1E:00:01:01', location: 'HQ Floor 3 IDF', status: 'online', firmwareVersion: 'WC.16.11.0014', lastSeenAt: new Date().toISOString(), uptimePercent: 99.6 },
    { name: 'DMZ Edge Switch', type: 'switch', manufacturer: 'Cisco', model: 'Nexus 93180YC', serialNumber: 'CSCO-SW-003', ipAddress: '10.0.0.13', macAddress: '00:1E:BD:00:03:01', location: 'Server Room', status: 'maintenance', firmwareVersion: '10.3(2)', lastSeenAt: daysAgo(1) + 'T14:00:00.000Z', uptimePercent: 0, notes: 'Scheduled maintenance window' },
    { name: 'Primary Internet Gateway', type: 'gateway', manufacturer: 'Fortinet', model: 'FortiGate 100F', serialNumber: 'FTNT-GW-001', ipAddress: '10.0.0.1', macAddress: '00:09:0F:00:01:01', location: 'Server Room', status: 'online', firmwareVersion: '7.4.3', lastSeenAt: new Date().toISOString(), uptimePercent: 99.95 },
    { name: 'Backup Internet Gateway', type: 'gateway', manufacturer: 'Fortinet', model: 'FortiGate 60F', serialNumber: 'FTNT-GW-002', ipAddress: '10.0.0.2', macAddress: '00:09:0F:00:02:01', location: 'Server Room', status: 'online', firmwareVersion: '7.4.3', lastSeenAt: new Date().toISOString(), uptimePercent: 99.9 },
    { name: 'SD-WAN Gateway — Branch', type: 'gateway', manufacturer: 'Cisco', model: 'ISR 4331', serialNumber: 'CSCO-GW-001', ipAddress: '10.1.0.1', macAddress: '00:1E:13:01:01:01', location: 'Branch Office', status: 'online', firmwareVersion: '17.3.5', lastSeenAt: new Date().toISOString(), uptimePercent: 98.8 },
    { name: 'Perimeter Firewall', type: 'firewall', manufacturer: 'Fortinet', model: 'FortiGate 200F', serialNumber: 'FTNT-FW-001', ipAddress: '10.0.0.5', macAddress: '00:09:0F:00:05:01', location: 'Server Room', status: 'online', firmwareVersion: '7.4.3', lastSeenAt: new Date().toISOString(), uptimePercent: 99.99 },
    { name: 'Internal Segmentation Firewall', type: 'firewall', manufacturer: 'SonicWall', model: 'NSa 2700', serialNumber: 'SNWL-FW-001', ipAddress: '10.0.0.6', macAddress: 'C0:EA:E4:00:01:01', location: 'Server Room', status: 'online', firmwareVersion: '7.0.1', lastSeenAt: new Date().toISOString(), uptimePercent: 99.7 },
    { name: 'Floor 1 WiFi AP — Lobby', type: 'access_point', manufacturer: 'Ubiquiti', model: 'U6 Pro', serialNumber: 'UBNT-AP-001', ipAddress: '10.0.1.50', macAddress: '74:AC:B9:AP:01:01', location: 'HQ Lobby', status: 'online', firmwareVersion: '6.5.28', lastSeenAt: new Date().toISOString(), uptimePercent: 99.4 },
    { name: 'Floor 2 WiFi AP — Open Office', type: 'access_point', manufacturer: 'Ubiquiti', model: 'U6 Enterprise', serialNumber: 'UBNT-AP-002', ipAddress: '10.0.2.50', macAddress: '74:AC:B9:AP:02:01', location: 'HQ Floor 2', status: 'online', firmwareVersion: '6.5.28', lastSeenAt: new Date().toISOString(), uptimePercent: 99.2 },
    { name: 'Floor 3 WiFi AP — Conference', type: 'access_point', manufacturer: 'Cisco', model: 'Meraki MR57', serialNumber: 'CSCO-AP-001', ipAddress: '10.0.3.50', macAddress: '00:18:0A:AP:03:01', location: 'HQ Floor 3', status: 'offline', firmwareVersion: '28.7.1', lastSeenAt: daysAgo(2) + 'T22:00:00.000Z', uptimePercent: 0, notes: 'Power issue reported' },
    { name: 'Warehouse WiFi AP', type: 'access_point', manufacturer: 'Ubiquiti', model: 'U6 Mesh', serialNumber: 'UBNT-AP-003', ipAddress: '10.0.4.50', macAddress: '74:AC:B9:AP:04:01', location: 'Warehouse', status: 'online', firmwareVersion: '6.5.28', lastSeenAt: new Date().toISOString(), uptimePercent: 97.5 },
  ];

  return catalog.map((item, i) => ({
    ...item,
    id: `55555555-5555-5555-5556-${String(i + 1).padStart(12, '0')}`,
    tenantId: '11111111-1111-1111-1111-111111111111',
    deviceTag: `NET-${String(i + 1).padStart(3, '0')}`,
  }));
}

export function generateDemoAssignments(assets: Asset[]): AssetAssignment[] {
  return assets
    .filter((a) => a.status === 'deployed' && a.assignedEmployeeId)
    .map((a) => ({
      id: `66666666-6666-6666-${a.id.slice(-4)}-${a.id.slice(-12)}`,
      tenantId: '11111111-1111-1111-1111-111111111111',
      assetId: a.id,
      employeeId: a.assignedEmployeeId!,
      assignedAt: daysAgo(60) + 'T10:00:00.000Z',
      assignedBy: 'Vasanth',
      notes: 'Initial deployment',
    }));
}

export function generateDemoOwnershipHistory(assets: Asset[]): OwnershipEvent[] {
  return assets
    .filter((a) => a.assignedEmployeeId)
    .map((a) => ({
      id: `77777777-7777-7777-${a.id.slice(-4)}-${a.id.slice(-12)}`,
      tenantId: '11111111-1111-1111-1111-111111111111',
      assetId: a.id,
      eventType: 'ASSIGNED',
      description: `Assigned to employee`,
      performedBy: 'Vasanth',
      createdAt: daysAgo(60) + 'T10:00:00.000Z',
    }));
}

export const DEMO_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    tenantId: 'tenant-solum',
    userId: 'user-admin',
    userName: 'Vasanth',
    action: 'LOGIN',
    entityType: 'user',
    entityId: 'user-admin',
    entityLabel: 'Vasanth',
    details: 'Successful login',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'audit-2',
    tenantId: 'tenant-solum',
    userId: 'user-itadmin',
    userName: 'Pavan',
    action: 'ASSIGN',
    entityType: 'asset',
    entityId: 'asset-001',
    entityLabel: 'AST-001',
    details: 'Assigned to Sarah Chen',
    createdAt: daysAgo(2) + 'T14:30:00.000Z',
  },
  {
    id: 'audit-3',
    tenantId: 'tenant-solum',
    userId: 'user-itadmin',
    userName: 'Pavan',
    action: 'RETURN',
    entityType: 'asset',
    entityId: 'asset-042',
    entityLabel: 'AST-042',
    details: 'Returned from Mike Johnson — Good condition',
    createdAt: daysAgo(5) + 'T09:15:00.000Z',
  },
  {
    id: 'audit-4',
    tenantId: 'tenant-solum',
    userId: 'user-admin',
    userName: 'Vasanth',
    action: 'CREATE',
    entityType: 'asset',
    entityId: 'asset-050',
    entityLabel: 'AST-050',
    details: 'Created Dell Latitude 5540',
    createdAt: daysAgo(7) + 'T11:00:00.000Z',
  },
  {
    id: 'audit-5',
    tenantId: 'tenant-solum',
    userId: 'user-admin',
    userName: 'Vasanth',
    action: 'UPDATE',
    entityType: 'employee',
    entityId: 'emp-002',
    entityLabel: 'Mike Johnson',
    details: 'Updated department assignment',
    createdAt: daysAgo(10) + 'T16:45:00.000Z',
  },
];

export const DEMO_ASSET_REQUESTS: AssetRequest[] = [
  {
    id: 'req-001',
    tenantId: 'tenant-solum',
    employeeId: 'emp-001',
    requestType: 'accessory',
    category: 'monitor',
    description: 'Need a second monitor for development work — current single 24" is limiting productivity.',
    neededBy: daysFromNow(14),
    status: 'submitted',
    createdAt: daysAgo(1) + 'T09:00:00.000Z',
    employeeName: 'Sarah Chen',
    employeeEmail: 'sarah.chen@solumtechnologies.com',
    departmentName: 'Engineering',
  },
  {
    id: 'req-002',
    tenantId: 'tenant-solum',
    employeeId: 'emp-006',
    requestType: 'replacement',
    category: 'laptop',
    description: 'Current laptop battery no longer holds charge. Requesting replacement unit.',
    status: 'approved',
    reviewNotes: 'Approved — assign from in-stock inventory.',
    reviewedBy: 'Pavan',
    reviewedAt: daysAgo(2) + 'T11:00:00.000Z',
    createdAt: daysAgo(5) + 'T14:00:00.000Z',
    employeeName: 'David Brown',
    employeeEmail: 'david.brown@solumtechnologies.com',
    departmentName: 'Engineering',
  },
];

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  new: 'New Device',
  replacement: 'Replacement',
  accessory: 'Accessory',
  return: 'Return',
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled',
};

export const REQUEST_STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  submitted: 'info',
  approved: 'success',
  rejected: 'error',
  fulfilled: 'default',
};

export const STATUS_LABELS: Record<string, string> = {
  in_stock: 'In Stock',
  deployed: 'Deployed',
  in_repair: 'In Repair',
  retired: 'Retired',
  lost: 'Lost',
  disposed: 'Disposed',
};

export const CATEGORY_LABELS: Record<string, string> = {
  laptop: 'Laptop',
  desktop: 'Desktop',
  server: 'Server',
  mobile: 'Mobile',
  monitor: 'Monitor',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  webcam: 'Webcam',
  headset: 'Headset',
  peripheral: 'Peripheral',
  network: 'Network',
  software: 'Software',
  other: 'Other',
};

export const NETWORK_DEVICE_TYPE_LABELS: Record<string, string> = {
  cctv: 'CCTV Camera',
  wifi_router: 'WiFi Router',
  switch: 'Switch',
  gateway: 'Gateway',
  firewall: 'Firewall',
  access_point: 'Access Point',
};

export const NETWORK_STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  offline: 'Offline',
  warning: 'Warning',
  maintenance: 'Maintenance',
};

export const NETWORK_STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  online: 'success',
  offline: 'error',
  warning: 'warning',
  maintenance: 'info',
};

export const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  in_stock: 'info',
  deployed: 'success',
  in_repair: 'warning',
  retired: 'default',
  lost: 'error',
  disposed: 'default',
};
