import { apiFetch } from './client';

export interface WorkflowStepDto {
  id?: string;
  stepOrder: number;
  stepName: string;
  approverType: 'manager' | 'role' | 'user';
  approverRole?: string;
  approverUserId?: string;
  isRequired?: boolean;
  autoSkipIfSubmitter?: boolean;
}

export interface WorkflowDefinitionDto {
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
  steps: WorkflowStepDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalHistoryItemDto {
  id: string;
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

export interface ApprovalRequestDto {
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
  history?: ApprovalHistoryItemDto[];
}

export interface NotificationDto {
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

export interface HierarchyNodeDto {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  departmentId?: string;
  departmentName?: string;
  managerId?: string | null;
  status: string;
  directReportsCount: number;
  children: HierarchyNodeDto[];
}

export interface HierarchyResponseDto {
  totalEmployees: number;
  managersCount: number;
  tree: HierarchyNodeDto[];
  flat: HierarchyNodeDto[];
}

export async function fetchWorkflowDefinitions(): Promise<WorkflowDefinitionDto[]> {
  return apiFetch<WorkflowDefinitionDto[]>('/api/workflows/definitions');
}

export async function saveWorkflowDefinition(
  module: string,
  payload: {
    name?: string;
    description?: string;
    fallbackApproverRole?: string;
    fallbackApproverId?: string;
    alternateApproverRole?: string;
    alternateApproverId?: string;
    steps?: WorkflowStepDto[];
  }
): Promise<{ success: boolean; definition: WorkflowDefinitionDto }> {
  return apiFetch<{ success: boolean; definition: WorkflowDefinitionDto }>(
    `/api/workflows/definitions?module=${encodeURIComponent(module)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchMyApprovals(status: 'pending' | 'all' = 'pending'): Promise<ApprovalRequestDto[]> {
  return apiFetch<ApprovalRequestDto[]>(`/api/approvals/my-approvals?status=${encodeURIComponent(status)}`);
}

export async function fetchMyRequests(): Promise<ApprovalRequestDto[]> {
  return apiFetch<ApprovalRequestDto[]>('/api/approvals/my-requests');
}

export async function submitApprovalAction(
  approvalRequestId: string,
  action: 'approve' | 'reject',
  comment?: string
): Promise<{ success: boolean; status: string; message: string; approvalRequest: ApprovalRequestDto }> {
  return apiFetch<{ success: boolean; status: string; message: string; approvalRequest: ApprovalRequestDto }>(
    '/api/approvals/action',
    {
      method: 'POST',
      body: JSON.stringify({ approvalRequestId, action, comment }),
    }
  );
}

export async function fetchNotifications(unreadOnly = false): Promise<NotificationDto[]> {
  try {
    const res = await apiFetch<any>(`/api/notifications?unreadOnly=${unreadOnly}`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.notifications)) return res.notifications;
    return [];
  } catch {
    return [];
  }
}

export async function markNotificationsRead(ids?: string[]): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/api/notifications', {
    method: 'PUT',
    body: JSON.stringify(ids ? { ids } : { markAll: true }),
  });
}

export async function fetchOrgHierarchy(): Promise<HierarchyResponseDto> {
  const res = await apiFetch<any>('/api/hierarchy');
  const tree = Array.isArray(res?.tree) ? res.tree : Array.isArray(res?.topLevel) ? res.topLevel : [];
  const flat = Array.isArray(res?.flat) ? res.flat : Array.isArray(res?.employees) ? res.employees : [];
  const totalEmployees = res?.totalEmployees ?? res?.totalCount ?? flat.length ?? tree.length ?? 0;
  const managersCount = res?.managersCount ?? (Array.isArray(res?.managers) ? res.managers.length : 0);
  return {
    totalEmployees,
    managersCount,
    tree,
    flat,
  };
}

