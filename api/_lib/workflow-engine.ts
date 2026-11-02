import { error } from './db';
import type { AuthUser } from './auth';

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  module: string;
  name: string;
  description: string;
  isActive: boolean;
  fallbackApproverId?: string;
  fallbackApproverRole: string;
  alternateApproverId?: string;
  alternateApproverRole: string;
  steps?: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  stepName: string;
  approverType: 'manager' | 'role' | 'user';
  approverRole?: string;
  approverUserId?: string;
  isRequired: boolean;
  autoSkipIfSubmitter: boolean;
  createdAt?: string;
}

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  workflowId?: string;
  entityType: string;
  entityId: string;
  requesterId: string;
  requesterEmployeeId?: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  currentStepOrder: number;
  totalSteps: number;
  currentStepName: string;
  currentApproverType: string;
  currentApproverId?: string;
  currentApproverRole?: string;
  currentApproverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  history?: ApprovalHistoryItem[];
}

export interface ApprovalHistoryItem {
  id: string;
  tenantId: string;
  approvalRequestId: string;
  stepOrder: number;
  stepName: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'auto_skipped';
  comment?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'action_required' | 'approved' | 'rejected';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export async function ensureWorkflowTables(sql: any): Promise<void> {
  // 1. Employee manager relationship
  try {
    await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(tenant_id, manager_id)`;
  } catch {}

  // 2. Workflow definitions
  await sql`
    CREATE TABLE IF NOT EXISTS workflow_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      module TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      fallback_approver_id UUID,
      fallback_approver_role TEXT NOT NULL DEFAULT 'tenant_admin',
      alternate_approver_id UUID,
      alternate_approver_role TEXT NOT NULL DEFAULT 'tenant_admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, module)
    );
  `;

  // 3. Workflow steps
  await sql`
    CREATE TABLE IF NOT EXISTS workflow_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
      step_order INT NOT NULL,
      step_name TEXT NOT NULL,
      approver_type TEXT NOT NULL,
      approver_role TEXT,
      approver_user_id UUID,
      is_required BOOLEAN NOT NULL DEFAULT true,
      auto_skip_if_submitter BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(workflow_id, step_order)
    );
  `;

  // 4. Approval requests
  await sql`
    CREATE TABLE IF NOT EXISTS approval_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      workflow_id UUID REFERENCES workflow_definitions(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      requester_id UUID NOT NULL,
      requester_employee_id UUID,
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      requester_role TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      metadata JSONB,
      current_step_order INT NOT NULL DEFAULT 1,
      total_steps INT NOT NULL DEFAULT 1,
      current_step_name TEXT NOT NULL DEFAULT '',
      current_approver_type TEXT NOT NULL DEFAULT 'manager',
      current_approver_id UUID,
      current_approver_role TEXT,
      current_approver_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_approval_req_tenant_status ON approval_requests(tenant_id, status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_approval_req_entity ON approval_requests(tenant_id, entity_type, entity_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_approval_req_approver ON approval_requests(tenant_id, current_approver_id, status)`;
  } catch {}

  // 5. Approval history
  await sql`
    CREATE TABLE IF NOT EXISTS approval_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
      step_order INT NOT NULL,
      step_name TEXT NOT NULL,
      actor_id UUID NOT NULL,
      actor_name TEXT NOT NULL,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_approval_history_req ON approval_history(approval_request_id, created_at ASC)`;
  } catch {}

  // 6. In-app notifications
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      user_id UUID NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      link TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(tenant_id, user_id, is_read, created_at DESC)`;
  } catch {}
}

export async function checkCircularManager(
  sql: any,
  tenantId: string,
  employeeId: string,
  targetManagerId: string | null | undefined
): Promise<boolean> {
  if (!targetManagerId) return false;
  if (employeeId === targetManagerId) return true;

  let currentId: string | null = targetManagerId;
  const visited = new Set<string>([employeeId]);

  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);

    const rows = (await sql`
      SELECT manager_id FROM employees
      WHERE id = ${currentId} AND tenant_id = ${tenantId}
      LIMIT 1
    `) as { manager_id: string | null }[];

    currentId = rows[0]?.manager_id ?? null;
  }

  return false;
}

export async function createNotification(
  sql: any,
  item: {
    tenantId: string;
    userId: string;
    title: string;
    message: string;
    type?: 'info' | 'action_required' | 'approved' | 'rejected';
    link?: string;
  }
): Promise<void> {
  try {
    await sql`
      INSERT INTO notifications (
        tenant_id, user_id, title, message, type, link
      ) VALUES (
        ${item.tenantId}, ${item.userId}, ${item.title}, ${item.message},
        ${item.type || 'info'}, ${item.link || null}
      )
    `;
  } catch (e) {
    console.warn('Failed to insert notification:', e);
  }
}

export async function getOrCreateWorkflowDefinition(
  sql: any,
  tenantId: string,
  module: string
): Promise<{ definition: WorkflowDefinition; steps: WorkflowStep[] }> {
  await ensureWorkflowTables(sql);

  let defRows = (await sql`
    SELECT * FROM workflow_definitions
    WHERE tenant_id = ${tenantId} AND module = ${module}
    LIMIT 1
  `) as any[];

  if (defRows.length === 0) {
    // Seed default workflow definitions per module
    let name = 'Approval Workflow';
    let description = 'Default multi-level approval workflow';
    let stepsData: Array<{
      stepOrder: number;
      stepName: string;
      approverType: 'manager' | 'role' | 'user';
      approverRole?: string;
    }> = [];

    if (module === 'leave_request') {
      name = 'Leave Request Workflow';
      description = 'Employee → Manager (Level 1) → Tenant Admin (Level 2) → Approved';
      stepsData = [
        { stepOrder: 1, stepName: 'Manager Review (Level 1)', approverType: 'manager' },
        { stepOrder: 2, stepName: 'Tenant Admin Final Approval (Level 2)', approverType: 'role', approverRole: 'tenant_admin' },
      ];
    } else if (module === 'asset_request') {
      name = 'IT Asset Request Workflow';
      description = 'Employee → Manager (Level 1) → IT Admin (Level 2) → Approved';
      stepsData = [
        { stepOrder: 1, stepName: 'Manager Review (Level 1)', approverType: 'manager' },
        { stepOrder: 2, stepName: 'IT Admin Review (Level 2)', approverType: 'role', approverRole: 'it_admin' },
      ];
    } else if (module === 'purchase_request') {
      name = 'Purchase Request Workflow';
      description = 'Manager → Finance Admin → Tenant Admin';
      stepsData = [
        { stepOrder: 1, stepName: 'Manager Review (Level 1)', approverType: 'manager' },
        { stepOrder: 2, stepName: 'Finance Admin Review (Level 2)', approverType: 'role', approverRole: 'finance_admin' },
        { stepOrder: 3, stepName: 'Tenant Admin Final Approval (Level 3)', approverType: 'role', approverRole: 'tenant_admin' },
      ];
    } else {
      stepsData = [
        { stepOrder: 1, stepName: 'Manager Review', approverType: 'manager' },
        { stepOrder: 2, stepName: 'Admin Approval', approverType: 'role', approverRole: 'tenant_admin' },
      ];
    }

    const inserted = (await sql`
      INSERT INTO workflow_definitions (
        tenant_id, module, name, description, is_active,
        fallback_approver_role, alternate_approver_role
      ) VALUES (
        ${tenantId}, ${module}, ${name}, ${description}, true,
        'tenant_admin', 'tenant_admin'
      )
      RETURNING *
    `) as any[];

    const defId = inserted[0].id;
    for (const step of stepsData) {
      await sql`
        INSERT INTO workflow_steps (
          workflow_id, step_order, step_name, approver_type, approver_role,
          is_required, auto_skip_if_submitter
        ) VALUES (
          ${defId}, ${step.stepOrder}, ${step.stepName}, ${step.approverType},
          ${step.approverRole || null}, true, true
        )
      `;
    }

    defRows = inserted;
  }

  const defRow = defRows[0];
  const stepRows = (await sql`
    SELECT * FROM workflow_steps
    WHERE workflow_id = ${defRow.id}
    ORDER BY step_order ASC
  `) as any[];

  const steps: WorkflowStep[] = stepRows.map((s) => ({
    id: s.id,
    workflowId: s.workflow_id,
    stepOrder: s.step_order,
    stepName: s.step_name,
    approverType: s.approver_type,
    approverRole: s.approver_role ?? undefined,
    approverUserId: s.approver_user_id ?? undefined,
    isRequired: s.is_required,
    autoSkipIfSubmitter: s.auto_skip_if_submitter,
    createdAt: s.created_at,
  }));

  const definition: WorkflowDefinition = {
    id: defRow.id,
    tenantId: defRow.tenant_id,
    module: defRow.module,
    name: defRow.name,
    description: defRow.description,
    isActive: defRow.is_active,
    fallbackApproverId: defRow.fallback_approver_id ?? undefined,
    fallbackApproverRole: defRow.fallback_approver_role || 'tenant_admin',
    alternateApproverId: defRow.alternate_approver_id ?? undefined,
    alternateApproverRole: defRow.alternate_approver_role || 'tenant_admin',
    steps,
    createdAt: defRow.created_at,
    updatedAt: defRow.updated_at,
  };

  return { definition, steps };
}

export async function resolveStepApprover(
  sql: any,
  tenantId: string,
  step: WorkflowStep,
  workflowDef: WorkflowDefinition,
  requester: {
    userId: string;
    employeeId?: string;
    role: string;
  }
): Promise<{
  approverId?: string;
  approverRole?: string;
  approverName?: string;
  approverEmail?: string;
  isAutoSkip?: boolean;
}> {
  // If requester is Tenant Admin, prevent self-approval by routing to alternate approver
  if (requester.role === 'tenant_admin') {
    if (workflowDef.alternateApproverId) {
      const altUser = (await sql`
        SELECT id, email, first_name, last_name, role FROM users
        WHERE id = ${workflowDef.alternateApproverId} AND tenant_id = ${tenantId}
        LIMIT 1
      `) as any[];
      if (altUser.length > 0 && altUser[0].id !== requester.userId) {
        return {
          approverId: altUser[0].id,
          approverRole: altUser[0].role,
          approverName: `${altUser[0].first_name} ${altUser[0].last_name}`.trim(),
          approverEmail: altUser[0].email,
        };
      }
    }

    // Fallback alternate approver (another admin or manager)
    const otherAdmin = (await sql`
      SELECT id, email, first_name, last_name, role FROM users
      WHERE tenant_id = ${tenantId} AND id != ${requester.userId}
        AND role IN ('tenant_admin', 'manager', 'hr_admin')
      ORDER BY role = 'tenant_admin' DESC, created_at ASC
      LIMIT 1
    `) as any[];

    if (otherAdmin.length > 0) {
      return {
        approverId: otherAdmin[0].id,
        approverRole: otherAdmin[0].role,
        approverName: `${otherAdmin[0].first_name} ${otherAdmin[0].last_name}`.trim(),
        approverEmail: otherAdmin[0].email,
      };
    }
  }

  // 1. Manager step
  if (step.approverType === 'manager') {
    // If submitter is an administrative role (manager, hr_admin, it_admin, finance_admin)
    // auto-skip manager review and route directly to next step (Tenant Admin)
    const adminRoles = new Set(['manager', 'hr_admin', 'it_admin', 'finance_admin']);
    if (adminRoles.has(requester.role)) {
      return { isAutoSkip: true };
    }

    if (requester.employeeId) {
      const empRows = (await sql`
        SELECT e.manager_id, m.first_name as mgr_first, m.last_name as mgr_last, m.email as mgr_email
        FROM employees e
        LEFT JOIN employees m ON e.manager_id = m.id
        WHERE e.id = ${requester.employeeId} AND e.tenant_id = ${tenantId}
        LIMIT 1
      `) as any[];

      const emp = empRows[0];
      if (emp?.manager_id) {
        // Resolve manager's user account
        const mgrUser = (await sql`
          SELECT id, email, first_name, last_name, role FROM users
          WHERE tenant_id = ${tenantId}
            AND (lower(email) = lower(${emp.mgr_email}) OR employee_id = ${emp.manager_id})
          LIMIT 1
        `) as any[];

        const mgrName = `${emp.mgr_first || ''} ${emp.mgr_last || ''}`.trim() || 'Reporting Manager';
        return {
          approverId: mgrUser[0]?.id ?? undefined,
          approverRole: mgrUser[0]?.role ?? 'manager',
          approverName: mgrName,
          approverEmail: emp.mgr_email || mgrUser[0]?.email,
        };
      }
    }

    // No manager assigned -> use fallback approver
    if (workflowDef.fallbackApproverId) {
      const fbUser = (await sql`
        SELECT id, email, first_name, last_name, role FROM users
        WHERE id = ${workflowDef.fallbackApproverId} AND tenant_id = ${tenantId}
        LIMIT 1
      `) as any[];
      if (fbUser.length > 0) {
        return {
          approverId: fbUser[0].id,
          approverRole: fbUser[0].role,
          approverName: `${fbUser[0].first_name} ${fbUser[0].last_name}`.trim(),
          approverEmail: fbUser[0].email,
        };
      }
    }

    return {
      approverRole: workflowDef.fallbackApproverRole || 'tenant_admin',
      approverName: 'Tenant Admin (Fallback)',
    };
  }

  // 2. User specific step
  if (step.approverType === 'user' && step.approverUserId) {
    const userRows = (await sql`
      SELECT id, email, first_name, last_name, role FROM users
      WHERE id = ${step.approverUserId} AND tenant_id = ${tenantId}
      LIMIT 1
    `) as any[];
    if (userRows.length > 0) {
      return {
        approverId: userRows[0].id,
        approverRole: userRows[0].role,
        approverName: `${userRows[0].first_name} ${userRows[0].last_name}`.trim(),
        approverEmail: userRows[0].email,
      };
    }
  }

  // 3. Role based step
  const role = step.approverRole || 'tenant_admin';
  return {
    approverRole: role,
    approverName: role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

export async function startWorkflow(
  sql: any,
  params: {
    tenantId: string;
    module: string;
    entityId: string;
    requesterUser: AuthUser;
    requesterEmployeeId?: string;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
  }
): Promise<ApprovalRequest> {
  const { tenantId, module, entityId, requesterUser, requesterEmployeeId, title, description, metadata } = params;
  const { definition, steps } = await getOrCreateWorkflowDefinition(sql, tenantId, module);

  const requester = {
    userId: requesterUser.sub,
    employeeId: requesterEmployeeId || requesterUser.employeeId,
    role: requesterUser.role,
  };

  let currentStepIdx = 0;
  let resolvedApprover = await resolveStepApprover(sql, tenantId, steps[0], definition, requester);

  // If first step was auto-skipped (e.g. manager submitting request), record it and proceed to step 2
  const skippedSteps: WorkflowStep[] = [];
  while (resolvedApprover.isAutoSkip && currentStepIdx < steps.length - 1) {
    skippedSteps.push(steps[currentStepIdx]);
    currentStepIdx++;
    resolvedApprover = await resolveStepApprover(sql, tenantId, steps[currentStepIdx], definition, requester);
  }

  const activeStep = steps[currentStepIdx] || steps[0];
  const requesterName = `${requesterUser.firstName || ''} ${requesterUser.lastName || ''}`.trim() || requesterUser.email || 'Employee';

  const rows = (await sql`
    INSERT INTO approval_requests (
      tenant_id, workflow_id, entity_type, entity_id,
      requester_id, requester_employee_id, requester_name, requester_email, requester_role,
      title, description, metadata,
      current_step_order, total_steps, current_step_name, current_approver_type,
      current_approver_id, current_approver_role, current_approver_name,
      status
    ) VALUES (
      ${tenantId}, ${definition.id}, ${module}, ${entityId},
      ${requester.userId}, ${requester.employeeId || null}, ${requesterName}, ${requesterUser.email || ''}, ${requester.role},
      ${title}, ${description || null}, ${metadata ? JSON.stringify(metadata) : null},
      ${activeStep.stepOrder}, ${steps.length}, ${activeStep.stepName}, ${activeStep.approverType},
      ${resolvedApprover.approverId || null}, ${resolvedApprover.approverRole || null}, ${resolvedApprover.approverName || null},
      'pending'
    )
    RETURNING *
  `) as any[];

  const request = rows[0];

  // Log initial submission to history
  await sql`
    INSERT INTO approval_history (
      tenant_id, approval_request_id, step_order, step_name,
      actor_id, actor_name, actor_email, actor_role, action, comment
    ) VALUES (
      ${tenantId}, ${request.id}, 0, 'Submission',
      ${requester.userId}, ${requesterName}, ${requesterUser.email || ''}, ${requester.role},
      'submitted', ${description || 'Request submitted'}
    )
  `;

  // Log any auto-skipped steps
  for (const skipped of skippedSteps) {
    await sql`
      INSERT INTO approval_history (
        tenant_id, approval_request_id, step_order, step_name,
        actor_id, actor_name, actor_email, actor_role, action, comment
      ) VALUES (
        ${tenantId}, ${request.id}, ${skipped.stepOrder}, ${skipped.stepName},
        ${requester.userId}, 'System', 'system@assetly.internal', 'system',
        'auto_skipped', 'Auto-routed to next approval level for administrative submitter'
      )
    `;
  }

  // Send notification to approver if specific user is resolved
  if (resolvedApprover.approverId && resolvedApprover.approverId !== requester.userId) {
    await createNotification(sql, {
      tenantId,
      userId: resolvedApprover.approverId,
      title: 'Action Required: Pending Approval',
      message: `${requesterName} submitted '${title}' which awaits your review.`,
      type: 'action_required',
      link: '/approvals',
    });
  }

  return {
    id: request.id,
    tenantId: request.tenant_id,
    workflowId: request.workflow_id,
    entityType: request.entity_type,
    entityId: request.entity_id,
    requesterId: request.requester_id,
    requesterEmployeeId: request.requester_employee_id,
    requesterName: request.requester_name,
    requesterEmail: request.requester_email,
    requesterRole: request.requester_role,
    title: request.title,
    description: request.description,
    metadata: request.metadata,
    currentStepOrder: request.current_step_order,
    totalSteps: request.total_steps,
    currentStepName: request.current_step_name,
    currentApproverType: request.current_approver_type,
    currentApproverId: request.current_approver_id,
    currentApproverRole: request.current_approver_role,
    currentApproverName: request.current_approver_name,
    status: request.status,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  };
}

export async function processApprovalAction(
  sql: any,
  params: {
    tenantId: string;
    approvalRequestId: string;
    actor: AuthUser;
    action: 'approve' | 'reject';
    comment?: string;
  }
): Promise<{ success: boolean; status: string; message: string; approvalRequest: ApprovalRequest }> {
  const { tenantId, approvalRequestId, actor, action, comment } = params;

  const reqRows = (await sql`
    SELECT * FROM approval_requests
    WHERE id = ${approvalRequestId} AND tenant_id = ${tenantId}
    LIMIT 1
  `) as any[];

  if (reqRows.length === 0) {
    throw new Error('Approval request not found');
  }

  const req = reqRows[0];
  if (req.status !== 'pending') {
    throw new Error(`This request is already finalized with status '${req.status}'`);
  }

  // Security check: Prevent self-approval
  if (req.requester_id === actor.sub) {
    throw new Error('Self-approval is strictly prevented. Another authorized administrator or manager must review this request.');
  }

  // Security check: Verify actor has permission to review this step
  const isPlatformAdmin = actor.role === 'platform_admin';
  const isTenantAdmin = actor.role === 'tenant_admin';
  const isDirectApprover = req.current_approver_id === actor.sub;
  const isRoleMatch = req.current_approver_role && actor.role === req.current_approver_role;

  if (!isPlatformAdmin && !isTenantAdmin && !isDirectApprover && !isRoleMatch) {
    throw new Error('Forbidden — you are not an authorized approver for this request stage');
  }

  const actorName = `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || 'Approver';
  const { definition, steps } = await getOrCreateWorkflowDefinition(sql, tenantId, req.entity_type);

  // If rejected: terminate workflow
  if (action === 'reject') {
    await sql`
      INSERT INTO approval_history (
        tenant_id, approval_request_id, step_order, step_name,
        actor_id, actor_name, actor_email, actor_role, action, comment
      ) VALUES (
        ${tenantId}, ${req.id}, ${req.current_step_order}, ${req.current_step_name},
        ${actor.sub}, ${actorName}, ${actor.email || ''}, ${actor.role},
        'rejected', ${comment || 'Rejected'}
      )
    `;

    const updatedRows = (await sql`
      UPDATE approval_requests
      SET status = 'rejected', updated_at = NOW()
      WHERE id = ${req.id} AND tenant_id = ${tenantId}
      RETURNING *
    `) as any[];

    // Notify requester
    await createNotification(sql, {
      tenantId,
      userId: req.requester_id,
      title: 'Request Rejected',
      message: `Your request '${req.title}' was rejected by ${actorName}.${comment ? ` Reason: ${comment}` : ''}`,
      type: 'rejected',
      link: '/my-requests',
    });

    // Update entity
    if (req.entity_type === 'leave_request') {
      await sql`
        UPDATE hr_leave_requests
        SET status = 'rejected', updated_at = NOW()
        WHERE id = ${req.entity_id} AND tenant_id = ${tenantId}
      `;
    } else if (req.entity_type === 'asset_request') {
      await sql`
        UPDATE asset_requests
        SET status = 'rejected', reviewed_by = ${actor.sub}, reviewed_at = NOW(), review_notes = ${comment || null}
        WHERE id = ${req.entity_id} AND tenant_id = ${tenantId}
      `;
    }

    return {
      success: true,
      status: 'rejected',
      message: 'Request rejected',
      approvalRequest: updatedRows[0],
    };
  }

  // Action is 'approve'
  await sql`
    INSERT INTO approval_history (
      tenant_id, approval_request_id, step_order, step_name,
      actor_id, actor_name, actor_email, actor_role, action, comment
    ) VALUES (
      ${tenantId}, ${req.id}, ${req.current_step_order}, ${req.current_step_name},
      ${actor.sub}, ${actorName}, ${actor.email || ''}, ${actor.role},
      'approved', ${comment || 'Approved'}
    )
  `;

  // Check if there are subsequent steps
  const nextSteps = steps.filter((s) => s.stepOrder > req.current_step_order).sort((a, b) => a.stepOrder - b.stepOrder);

  if (nextSteps.length > 0) {
    // Advance to next step
    const nextStep = nextSteps[0];
    const requester = {
      userId: req.requester_id,
      employeeId: req.requester_employee_id,
      role: req.requester_role,
    };
    const nextApprover = await resolveStepApprover(sql, tenantId, nextStep, definition, requester);

    const updatedRows = (await sql`
      UPDATE approval_requests
      SET
        current_step_order = ${nextStep.stepOrder},
        current_step_name = ${nextStep.stepName},
        current_approver_type = ${nextStep.approverType},
        current_approver_id = ${nextApprover.approverId || null},
        current_approver_role = ${nextApprover.approverRole || null},
        current_approver_name = ${nextApprover.approverName || null},
        updated_at = NOW()
      WHERE id = ${req.id} AND tenant_id = ${tenantId}
      RETURNING *
    `) as any[];

    // Notify next approver
    if (nextApprover.approverId && nextApprover.approverId !== req.requester_id) {
      await createNotification(sql, {
        tenantId,
        userId: nextApprover.approverId,
        title: 'Action Required: Pending Final Approval',
        message: `${req.requester_name}'s request '${req.title}' was approved by ${actorName} and now requires your approval.`,
        type: 'action_required',
        link: '/approvals',
      });
    }

    // Notify requester
    await createNotification(sql, {
      tenantId,
      userId: req.requester_id,
      title: 'Request Progressed',
      message: `Your request '${req.title}' was approved by ${actorName} and has moved to '${nextStep.stepName}'.`,
      type: 'info',
      link: '/my-requests',
    });

    return {
      success: true,
      status: 'pending',
      message: `Approved stage. Advanced to ${nextStep.stepName}.`,
      approvalRequest: updatedRows[0],
    };
  }

  // All approval levels completed! Final sanction
  const updatedRows = (await sql`
    UPDATE approval_requests
    SET status = 'approved', updated_at = NOW()
    WHERE id = ${req.id} AND tenant_id = ${tenantId}
    RETURNING *
  `) as any[];

  // Update underlying entity to approved
  if (req.entity_type === 'leave_request') {
    await sql`
      UPDATE hr_leave_requests
      SET status = 'approved', approved_by = ${actor.sub}, updated_at = NOW()
      WHERE id = ${req.entity_id} AND tenant_id = ${tenantId}
    `;

    // Deduct leave balance if daysCount and leaveType are present
    try {
      const leaveRows = (await sql`
        SELECT employee_id, leave_type, days_count FROM hr_leave_requests
        WHERE id = ${req.entity_id} AND tenant_id = ${tenantId}
        LIMIT 1
      `) as any[];

      if (leaveRows.length > 0) {
        const l = leaveRows[0];
        const days = Number(l.days_count || 1);
        const lType = String(l.leave_type || 'casual').toLowerCase();
        await sql`
          UPDATE hr_leave_balances
          SET
            used_days = used_days + ${days},
            pending_days = GREATEST(0, pending_days - ${days}),
            updated_at = NOW()
          WHERE tenant_id = ${tenantId}
            AND employee_id = ${l.employee_id}
            AND lower(leave_type) = ${lType}
            AND year = EXTRACT(YEAR FROM CURRENT_DATE)::int
        `;
      }
    } catch (balErr) {
      console.warn('Failed to deduct leave balance:', balErr);
    }
  } else if (req.entity_type === 'asset_request') {
    await sql`
      UPDATE asset_requests
      SET status = 'approved', reviewed_by = ${actor.sub}, reviewed_at = NOW(), review_notes = ${comment || 'Approved'}
      WHERE id = ${req.entity_id} AND tenant_id = ${tenantId}
    `;
  }

  // Notify requester
  await createNotification(sql, {
    tenantId,
    userId: req.requester_id,
    title: 'Request Approved!',
    message: `Congratulations! Your request '${req.title}' has completed all approval stages and is fully approved.`,
    type: 'approved',
    link: '/my-requests',
  });

  return {
    success: true,
    status: 'approved',
    message: 'Request fully approved',
    approvalRequest: updatedRows[0],
  };
}

export async function getPendingApprovals(
  sql: any,
  params: {
    tenantId: string;
    actor: AuthUser;
    actorEmployeeId?: string;
  }
): Promise<ApprovalRequest[]> {
  const { tenantId, actor, actorEmployeeId } = params;
  await ensureWorkflowTables(sql);

  const isPlatformAdmin = actor.role === 'platform_admin';
  const isTenantAdmin = actor.role === 'tenant_admin';

  let rows: any[] = [];

  if (isPlatformAdmin || isTenantAdmin) {
    // Tenant admin can review all pending requests in tenant (except their own self-submitted requests)
    rows = (await sql`
      SELECT * FROM approval_requests
      WHERE tenant_id = ${tenantId}
        AND status = 'pending'
        AND requester_id != ${actor.sub}
      ORDER BY created_at DESC
    `) as any[];
  } else {
    // Other approvers review if directly assigned or if current role matches
    rows = (await sql`
      SELECT * FROM approval_requests
      WHERE tenant_id = ${tenantId}
        AND status = 'pending'
        AND requester_id != ${actor.sub}
        AND (
          current_approver_id = ${actor.sub}
          OR (current_approver_role IS NOT NULL AND current_approver_role = ${actor.role})
          OR (
            current_approver_type = 'manager'
            AND requester_employee_id IN (
              SELECT id FROM employees WHERE manager_id = ${actorEmployeeId || actor.employeeId || '00000000-0000-0000-0000-000000000000'}
            )
          )
        )
      ORDER BY created_at DESC
    `) as any[];
  }

  // Fetch history for each
  return Promise.all(
    rows.map(async (r) => {
      const history = (await sql`
        SELECT * FROM approval_history
        WHERE approval_request_id = ${r.id}
        ORDER BY created_at ASC
      `) as any[];
      return {
        id: r.id,
        tenantId: r.tenant_id,
        workflowId: r.workflow_id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        requesterId: r.requester_id,
        requesterEmployeeId: r.requester_employee_id,
        requesterName: r.requester_name,
        requesterEmail: r.requester_email,
        requesterRole: r.requester_role,
        title: r.title,
        description: r.description,
        metadata: r.metadata,
        currentStepOrder: r.current_step_order,
        totalSteps: r.total_steps,
        currentStepName: r.current_step_name,
        currentApproverType: r.current_approver_type,
        currentApproverId: r.current_approver_id,
        currentApproverRole: r.current_approver_role,
        currentApproverName: r.current_approver_name,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        history: history.map((h) => ({
          id: h.id,
          tenantId: h.tenant_id,
          approvalRequestId: h.approval_request_id,
          stepOrder: h.step_order,
          stepName: h.step_name,
          actorId: h.actor_id,
          actorName: h.actor_name,
          actorEmail: h.actor_email,
          actorRole: h.actor_role,
          action: h.action,
          comment: h.comment,
          createdAt: h.created_at,
        })),
      };
    })
  );
}

export async function getMyRequests(
  sql: any,
  params: {
    tenantId: string;
    userId: string;
    employeeId?: string;
  }
): Promise<ApprovalRequest[]> {
  const { tenantId, userId, employeeId } = params;
  await ensureWorkflowTables(sql);

  const rows = (await sql`
    SELECT * FROM approval_requests
    WHERE tenant_id = ${tenantId}
      AND (requester_id = ${userId} OR (requester_employee_id IS NOT NULL AND requester_employee_id = ${employeeId || '00000000-0000-0000-0000-000000000000'}))
    ORDER BY created_at DESC
  `) as any[];

  return Promise.all(
    rows.map(async (r) => {
      const history = (await sql`
        SELECT * FROM approval_history
        WHERE approval_request_id = ${r.id}
        ORDER BY created_at ASC
      `) as any[];
      return {
        id: r.id,
        tenantId: r.tenant_id,
        workflowId: r.workflow_id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        requesterId: r.requester_id,
        requesterEmployeeId: r.requester_employee_id,
        requesterName: r.requester_name,
        requesterEmail: r.requester_email,
        requesterRole: r.requester_role,
        title: r.title,
        description: r.description,
        metadata: r.metadata,
        currentStepOrder: r.current_step_order,
        totalSteps: r.total_steps,
        currentStepName: r.current_step_name,
        currentApproverType: r.current_approver_type,
        currentApproverId: r.current_approver_id,
        currentApproverRole: r.current_approver_role,
        currentApproverName: r.current_approver_name,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        history: history.map((h) => ({
          id: h.id,
          tenantId: h.tenant_id,
          approvalRequestId: h.approval_request_id,
          stepOrder: h.step_order,
          stepName: h.step_name,
          actorId: h.actor_id,
          actorName: h.actor_name,
          actorEmail: h.actor_email,
          actorRole: h.actor_role,
          action: h.action,
          comment: h.comment,
          createdAt: h.created_at,
        })),
      };
    })
  );
}

