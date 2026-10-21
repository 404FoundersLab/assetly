import { apiFetch } from './client';
import type { LeaveRequest, EmployeeLeaveBalance } from '../../store/hrSlice';

export async function fetchLeaveRequests(params?: {
  employeeId?: string;
  view?: 'team' | 'team_requests' | 'my' | 'all';
}): Promise<LeaveRequest[]> {
  const query = new URLSearchParams();
  if (params?.employeeId) query.set('employeeId', params.employeeId);
  if (params?.view) query.set('view', params.view);
  const qStr = query.toString();
  return apiFetch<LeaveRequest[]>(`/api/hr/leave${qStr ? `?${qStr}` : ''}`);
}

export async function createLeaveRequest(payload: {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  dayType?: 'full' | 'first_half' | 'second_half';
  reason?: string;
  backupEmployeeId?: string | null;
  handoverNotes?: string | null;
  contactNumber?: string | null;
}): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>('/api/hr/leave', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function managerReviewLeaveRequest(
  id: string,
  status: 'approved' | 'rejected',
  comment?: string,
): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>(`/api/hr/leave/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'manager_review', status, comment }),
  });
}

export async function updateLeaveRequestStatus(
  id: string,
  status: 'approved' | 'rejected',
  comment?: string,
): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>(`/api/hr/leave/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'hr_review', status, comment }),
  });
}

export async function cancelLeaveRequestApi(id: string): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>(`/api/hr/leave/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'cancel' }),
  });
}

export async function deleteLeaveRequestApi(id: string): Promise<void> {
  return apiFetch<void>(`/api/hr/leave/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchLeaveBalances(employeeId?: string): Promise<EmployeeLeaveBalance[]> {
  const q = employeeId ? `?employeeId=${employeeId}` : '';
  return apiFetch<EmployeeLeaveBalance[]>(`/api/hr/balances${q}`);
}

export async function adjustLeaveBalanceApi(payload: {
  employeeId: string;
  leaveType: string;
  allocatedDays: number;
  reason?: string;
}): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/api/hr/balances', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
