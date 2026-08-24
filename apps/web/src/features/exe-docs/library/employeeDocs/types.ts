export type EmployeeDocStatus = 'Approved' | 'Draft' | 'Confidential';
export type EmployeeDocCategory =
  | 'Resume'
  | 'Offer Letter'
  | 'Contract'
  | 'ID Proof'
  | 'Performance Review'
  | 'Onboarding'
  | 'Policy Acknowledgment'
  | 'Other';

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  title: string;
  category: EmployeeDocCategory;
  fileType: string;
  status: EmployeeDocStatus;
  description?: string;
  accessRoles: string[];
  ownerName: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export const DOC_CATEGORIES: EmployeeDocCategory[] = [
  'Resume',
  'Offer Letter',
  'Contract',
  'ID Proof',
  'Performance Review',
  'Onboarding',
  'Policy Acknowledgment',
  'Other',
];

export const ACCESS_ROLE_OPTIONS = [
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'it_admin', label: 'IT Admin' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'employee', label: 'Employee (self)' },
];
