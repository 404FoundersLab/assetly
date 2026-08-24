const DEMO_PASSWORD = 'Demo@123456';
const SOLUM_TENANT = '11111111-1111-1111-1111-111111111111';

/** Demo credentials — keep in sync with apps/web/src/data/demoData.ts */
export const DEMO_USERS: Record<
  string,
  {
    password: string;
    user: {
      id: string;
      tenantId?: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      employeeId?: string;
    };
  }
> = {
  'sysadmin@assetly.com': {
    password: DEMO_PASSWORD,
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
    password: DEMO_PASSWORD,
    user: {
      id: 'user-admin',
      tenantId: SOLUM_TENANT,
      email: 'admin@solumtechnologies.com',
      firstName: 'Vasanth',
      lastName: '',
      role: 'tenant_admin',
    },
  },
  'itadmin@solumtechnologies.com': {
    password: DEMO_PASSWORD,
    user: {
      id: 'user-itadmin',
      tenantId: SOLUM_TENANT,
      email: 'itadmin@solumtechnologies.com',
      firstName: 'Pavan',
      lastName: '',
      role: 'it_admin',
    },
  },
  'itadmin2@solumtechnologies.com': {
    password: DEMO_PASSWORD,
    user: {
      id: 'user-itadmin-2',
      tenantId: SOLUM_TENANT,
      email: 'itadmin2@solumtechnologies.com',
      firstName: 'Alex',
      lastName: 'Thompson',
      role: 'it_admin',
    },
  },
  'hradmin@solumtechnologies.com': {
    password: DEMO_PASSWORD,
    user: {
      id: 'user-hradmin',
      tenantId: SOLUM_TENANT,
      email: 'hradmin@solumtechnologies.com',
      firstName: 'Emily',
      lastName: 'Davis',
      role: 'hr_admin',
    },
  },
  'hradmin2@solumtechnologies.com': {
    password: DEMO_PASSWORD,
    user: {
      id: 'user-hradmin-2',
      tenantId: SOLUM_TENANT,
      email: 'hradmin2@solumtechnologies.com',
      firstName: 'Jordan',
      lastName: 'Smith',
      role: 'hr_admin',
    },
  },
  'financeadmin@solumtechnologies.com': {
    password: DEMO_PASSWORD,
    user: {
      id: 'user-financeadmin',
      tenantId: SOLUM_TENANT,
      email: 'financeadmin@solumtechnologies.com',
      firstName: 'Priya',
      lastName: 'Patel',
      role: 'finance_admin',
    },
  },
  'viewer@solumtechnologies.com': {
    password: DEMO_PASSWORD,
    user: {
      id: 'user-viewer',
      tenantId: SOLUM_TENANT,
      email: 'viewer@solumtechnologies.com',
      firstName: 'Lisa',
      lastName: 'Viewer',
      role: 'viewer',
    },
  },
  'sarah.chen@solumtechnologies.com': {
    password: DEMO_PASSWORD,
    user: {
      id: 'user-employee-sarah',
      tenantId: SOLUM_TENANT,
      email: 'sarah.chen@solumtechnologies.com',
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'employee',
      employeeId: 'emp-001',
    },
  },
  'mike.johnson@solumtechnologies.com': {
    password: DEMO_PASSWORD,
    user: {
      id: 'user-employee-mike',
      tenantId: SOLUM_TENANT,
      email: 'mike.johnson@solumtechnologies.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'employee',
      employeeId: 'emp-002',
    },
  },
};
