import { hasPermission, requirePermission, ALL_ROLES } from '../api/_lib/roles';
import { checkCircularManager } from '../api/_lib/workflow-engine';

interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

const tests: TestCase[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// 1. RBAC & Permissions Matrix Tests
// ---------------------------------------------------------------------------
test('Role Hierarchy: All 8 roles must exist', () => {
  const expectedRoles = [
    'platform_admin',
    'tenant_admin',
    'manager',
    'hr_admin',
    'it_admin',
    'finance_admin',
    'employee',
    'viewer',
  ];
  for (const r of expectedRoles) {
    assert(ALL_ROLES.includes(r as any), `Role ${r} is missing from ALL_ROLES`);
  }
  assert(ALL_ROLES.length === 8, `Expected 8 roles, found ${ALL_ROLES.length}`);
});

test('RBAC: Platform Admin and Tenant Admin have comprehensive permissions', () => {
  assert(hasPermission('platform_admin', 'manage', 'assets'), 'Platform admin should manage assets');
  assert(hasPermission('platform_admin', 'approve', 'workflows'), 'Platform admin should approve workflows');
  assert(hasPermission('tenant_admin', 'manage', 'users'), 'Tenant admin should manage users');
  assert(hasPermission('tenant_admin', 'approve', 'leave'), 'Tenant admin should approve leave');
  assert(hasPermission('tenant_admin', 'manage', 'hierarchy'), 'Tenant admin should manage hierarchy');
});

test('RBAC: Manager role has review & approve permissions for team', () => {
  assert(hasPermission('manager', 'approve', 'approvals'), 'Manager must be able to approve approvals');
  assert(hasPermission('manager', 'approve', 'leave'), 'Manager must be able to approve leave requests');
  assert(hasPermission('manager', 'reject', 'approvals'), 'Manager must be able to reject approvals');
  assert(hasPermission('manager', 'view', 'hierarchy'), 'Manager must be able to view hierarchy');
  assert(!hasPermission('manager', 'delete', 'users'), 'Manager should not delete users');
});

test('RBAC: Functional Admins have specific domain permissions', () => {
  // HR Admin
  assert(hasPermission('hr_admin', 'manage', 'employees'), 'HR Admin manages employees');
  assert(hasPermission('hr_admin', 'manage', 'leave'), 'HR Admin manages leave requests');
  assert(!hasPermission('hr_admin', 'delete', 'assets'), 'HR Admin cannot delete assets');

  // IT Admin
  assert(hasPermission('it_admin', 'manage', 'assets'), 'IT Admin manages assets');
  assert(hasPermission('it_admin', 'approve', 'requests'), 'IT Admin approves requests');
  assert(!hasPermission('it_admin', 'manage', 'leave'), 'IT Admin does not manage HR leave');

  // Finance Admin
  assert(hasPermission('finance_admin', 'manage', 'finance'), 'Finance Admin manages finance');
  assert(hasPermission('finance_admin', 'approve', 'requests'), 'Finance Admin approves requests');
  assert(!hasPermission('finance_admin', 'delete', 'employees'), 'Finance Admin does not delete employees');
});

test('RBAC: Employee role has self-service permissions', () => {
  assert(hasPermission('employee', 'create', 'leave'), 'Employee can create leave request');
  assert(hasPermission('employee', 'create', 'requests'), 'Employee can create asset/service request');
  assert(hasPermission('employee', 'view', 'leave'), 'Employee can view leave requests');
  assert(!hasPermission('employee', 'approve', 'leave'), 'Employee cannot approve leave requests');
  assert(!hasPermission('employee', 'delete', 'employees'), 'Employee cannot delete employee');
  assert(!hasPermission('employee', 'manage', 'hierarchy'), 'Employee cannot manage hierarchy');
});

test('RBAC: Viewer role is strictly read-only', () => {
  assert(hasPermission('viewer', 'view', 'assets'), 'Viewer can view assets');
  assert(hasPermission('viewer', 'view', 'hierarchy'), 'Viewer can view hierarchy');
  assert(!hasPermission('viewer', 'create', 'assets'), 'Viewer cannot create asset');
  assert(!hasPermission('viewer', 'edit', 'assets'), 'Viewer cannot edit asset');
  assert(!hasPermission('viewer', 'delete', 'assets'), 'Viewer cannot delete asset');
  assert(!hasPermission('viewer', 'approve', 'approvals'), 'Viewer cannot approve approvals');
});

// ---------------------------------------------------------------------------
// 2. Organization Hierarchy Circular Reporting Prevention Tests
// ---------------------------------------------------------------------------
test('Cycle Detection: Self-manager reporting is circular', async () => {
  const dummySql = async () => [];
  const isSelf = await checkCircularManager(dummySql, 'tenant-1', 'emp-A', 'emp-A');
  assert(isSelf === true, 'A reporting to A must be circular');
});

test('Cycle Detection: Direct loop (A -> B and B -> A) is circular', async () => {
  // Current database state: B reports to A
  const mockDb: Record<string, string | null> = {
    'emp-B': 'emp-A',
  };
  const mockSql = async (_strings: any, ...values: any[]) => {
    const id = values[0];
    const mgrId = mockDb[id] ?? null;
    return mgrId ? [{ manager_id: mgrId }] : [];
  };

  // Attempting to assign B as manager for A:
  // Chain from candidate manager B: B -> A (visited A!) -> circular!
  const isCircular = await checkCircularManager(mockSql, 'tenant-1', 'emp-A', 'emp-B');
  assert(isCircular === true, 'Assigning B as manager of A when B reports to A must be detected as circular');
});

test('Cycle Detection: Multi-level indirect loop (A -> B -> C -> A) is circular', async () => {
  // Current hierarchy: C reports to B, B reports to A
  const mockDb: Record<string, string | null> = {
    'emp-C': 'emp-B',
    'emp-B': 'emp-A',
  };
  const mockSql = async (_strings: any, ...values: any[]) => {
    const id = values[0];
    const mgrId = mockDb[id] ?? null;
    return mgrId ? [{ manager_id: mgrId }] : [];
  };

  // Attempting to assign C as manager for A:
  // Chain from candidate manager C: C -> B -> A (visited A!) -> cycle!
  const isCircular = await checkCircularManager(mockSql, 'tenant-1', 'emp-A', 'emp-C');
  assert(isCircular === true, 'Multi-level loop A -> B -> C -> A must be detected as circular');
});

test('Cycle Detection: Valid linear chain is permitted', async () => {
  // Current hierarchy: D reports to C, C reports to B
  const mockDb: Record<string, string | null> = {
    'emp-D': 'emp-C',
    'emp-C': 'emp-B',
    'emp-B': null,
  };
  const mockSql = async (_strings: any, ...values: any[]) => {
    const id = values[0];
    const mgrId = mockDb[id] ?? null;
    return mgrId ? [{ manager_id: mgrId }] : [];
  };

  // Assigning D as manager for a new employee E (E -> D -> C -> B): no cycle
  const isCircular = await checkCircularManager(mockSql, 'tenant-1', 'emp-E', 'emp-D');
  assert(isCircular === false, 'Valid linear reporting chain must not be flagged as circular');
});

// ---------------------------------------------------------------------------
// 3. Multi-Level Approval Engine & Resolution Rules
// ---------------------------------------------------------------------------
import { resolveStepApprover, type WorkflowStep, type WorkflowDefinition } from '../api/_lib/workflow-engine';

const defaultWorkflowDef: WorkflowDefinition = {
  id: 'wf-1',
  tenantId: 'tenant-1',
  module: 'leave_request',
  name: 'Leave Request Workflow',
  description: 'Employee -> Manager -> Tenant Admin',
  isActive: true,
  fallbackApproverRole: 'tenant_admin',
  alternateApproverRole: 'tenant_admin',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const managerStep: WorkflowStep = {
  id: 'step-1',
  workflowId: 'wf-1',
  stepOrder: 1,
  stepName: 'Manager Review (Level 1)',
  approverType: 'manager',
  isRequired: true,
  autoSkipIfSubmitter: true,
};

const adminStep: WorkflowStep = {
  id: 'step-2',
  workflowId: 'wf-1',
  stepOrder: 2,
  stepName: 'Tenant Admin Final Approval (Level 2)',
  approverType: 'role',
  approverRole: 'tenant_admin',
  isRequired: true,
  autoSkipIfSubmitter: true,
};

test('Workflow Engine: Resolves assigned manager for standard employee', async () => {
  const mockSql = async (strings: any, ...values: any[]) => {
    const query = strings.join('?');
    if (query.includes('FROM employees e')) {
      return [{
        manager_id: 'mgr-emp-1',
        mgr_first: 'John',
        mgr_last: 'Doe',
        mgr_email: 'john.doe@company.com',
      }];
    }
    if (query.includes('FROM users')) {
      return [{
        id: 'user-mgr-1',
        email: 'john.doe@company.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'manager',
      }];
    }
    return [];
  };

  const approver = await resolveStepApprover(
    mockSql,
    'tenant-1',
    managerStep,
    defaultWorkflowDef,
    { userId: 'user-emp-1', employeeId: 'emp-1', role: 'employee' }
  );

  assert(approver.approverId === 'user-mgr-1', 'Should resolve manager user ID');
  assert(approver.approverName === 'John Doe', 'Should resolve manager display name');
  assert(!approver.isAutoSkip, 'Should not auto-skip for regular employee');
});

test('Workflow Engine: Resolves fallback approver when employee has no manager', async () => {
  const mockSql = async () => []; // No employee or manager record returned

  const approver = await resolveStepApprover(
    mockSql,
    'tenant-1',
    managerStep,
    defaultWorkflowDef,
    { userId: 'user-emp-2', employeeId: 'emp-2', role: 'employee' }
  );

  assert(approver.approverRole === 'tenant_admin', 'Should fall back to tenant admin role');
  assert(approver.approverName?.includes('Fallback') === true, 'Should indicate fallback approver');
});

test('Workflow Engine: Auto-skips Manager Level 1 for administrative submitters', async () => {
  const adminRoles = ['manager', 'hr_admin', 'it_admin', 'finance_admin'];

  for (const role of adminRoles) {
    const approver = await resolveStepApprover(
      async () => [],
      'tenant-1',
      managerStep,
      defaultWorkflowDef,
      { userId: `user-${role}`, role }
    );

    assert(approver.isAutoSkip === true, `${role} submitting leave request must auto-skip Level 1 to Tenant Admin`);
  }
});

test('Workflow Engine: Prevents Tenant Admin self-approval by routing to alternate approver', async () => {
  const mockSql = async (strings: any) => {
    const q = strings.join('?');
    if (q.includes('FROM users')) {
      return [{
        id: 'user-alt-admin',
        email: 'alt.admin@company.com',
        first_name: 'Alternate',
        last_name: 'Admin',
        role: 'tenant_admin',
      }];
    }
    return [];
  };

  const approver = await resolveStepApprover(
    mockSql,
    'tenant-1',
    adminStep,
    defaultWorkflowDef,
    { userId: 'user-tenant-admin-1', role: 'tenant_admin' }
  );

  assert(approver.approverId !== 'user-tenant-admin-1', 'Approver must not be the submitter');
  assert(approver.approverName === 'Alternate Admin', 'Routes to alternate approver');
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
async function run() {
  console.log('====================================================');
  console.log('   Assetly RBAC & Approval Engine Test Suite        ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`[PASS] ${t.name}`);
      passed++;
    } catch (e: any) {
      console.error(`[FAIL] ${t.name}:`, e.message);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tests.length} tests.`);
  if (failed > 0) {
    process.exit(1);
  }
}

void run();
