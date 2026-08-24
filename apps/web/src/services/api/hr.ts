import { apiFetch } from './client';
import { LeaveRequest } from '../../store/hrSlice';

export async function fetchLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
  const url = employeeId ? `/api/hr/leave?employeeId=${employeeId}` : '/api/hr/leave';
  return apiFetch<LeaveRequest[]>(url);
}

export async function createLeaveRequest(payload: {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
}): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>('/api/hr/leave', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLeaveRequestStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>(`/api/hr/leave/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function deleteLeaveRequestApi(id: string): Promise<void> {
  return apiFetch<void>(`/api/hr/leave/${id}`, {
    method: 'DELETE',
  });
}
