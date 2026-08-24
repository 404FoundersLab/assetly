import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  createdAt: string;
}

export interface LeavePolicy {
  id: string;
  name: string;
  code: string;
  maxDays: number;
  description: string;
}

export type PolicyCategory = 'general' | 'conduct' | 'safety' | 'leave' | 'it' | 'finance' | 'remote_work';

export interface PolicyAcknowledgement {
  employeeId: string;
  acknowledgedAt: string;
}

export interface CompanyPolicy {
  id: string;
  title: string;
  category: PolicyCategory;
  version: string;
  effectiveDate: string;
  content: string;
  requiresAcknowledgement: boolean;
  acknowledgements: PolicyAcknowledgement[];
  status: 'active' | 'archived';
  createdAt: string;
}

interface HRState {
  leaveRequests: LeaveRequest[];
  policies: LeavePolicy[];
  companyPolicies: CompanyPolicy[];
}

const initialPolicies: LeavePolicy[] = [
  { id: 'pol-1', name: 'Annual Leave', code: 'AL', maxDays: 25, description: 'Paid vacation days allocated yearly.' },
  { id: 'pol-2', name: 'Sick Leave', code: 'SL', maxDays: 12, description: 'Paid leave for medical recovery and doctor appointments.' },
  { id: 'pol-3', name: 'Casual Leave', code: 'CL', maxDays: 10, description: 'Short-term leaves for personal matters.' },
  { id: 'pol-4', name: 'Maternity Leave', code: 'ML', maxDays: 180, description: 'Paid parental leave for mothers.' },
  { id: 'pol-5', name: 'Paternity Leave', code: 'PL', maxDays: 15, description: 'Paid parental leave for fathers.' },
];

const initialCompanyPolicies: CompanyPolicy[] = [];

const initialLeaveRequests: LeaveRequest[] = [];

const initialState: HRState = {
  leaveRequests: initialLeaveRequests,
  policies: initialPolicies,
  companyPolicies: initialCompanyPolicies,
};

const hrSlice = createSlice({
  name: 'hr',
  initialState,
  reducers: {
    setLeaveRequests: (state, action: PayloadAction<LeaveRequest[]>) => {
      if (action.payload.length > 0) {
        state.leaveRequests = action.payload;
      }
    },
    addLeaveRequest: (state, action: PayloadAction<LeaveRequest>) => {
      state.leaveRequests.unshift(action.payload);
    },
    deleteLeaveRequest: (state, action: PayloadAction<string>) => {
      state.leaveRequests = state.leaveRequests.filter(r => r.id !== action.payload);
    },
    updateLeaveRequestStatus: (
      state,
      action: PayloadAction<{ id: string; status: 'approved' | 'rejected'; approvedBy: string }>
    ) => {
      const idx = state.leaveRequests.findIndex(r => r.id === action.payload.id);
      if (idx !== -1) {
        state.leaveRequests[idx].status = action.payload.status;
        state.leaveRequests[idx].approvedBy = action.payload.approvedBy;
      }
    },
    addPolicy: (state, action: PayloadAction<Omit<LeavePolicy, 'id'>>) => {
      state.policies.push({ ...action.payload, id: `pol-${Date.now()}` });
    },
    updatePolicy: (state, action: PayloadAction<LeavePolicy>) => {
      const idx = state.policies.findIndex(p => p.id === action.payload.id);
      if (idx >= 0) state.policies[idx] = action.payload;
    },
    deletePolicy: (state, action: PayloadAction<string>) => {
      state.policies = state.policies.filter(p => p.id !== action.payload);
    },
    addCompanyPolicy: (state, action: PayloadAction<Omit<CompanyPolicy, 'id' | 'createdAt' | 'acknowledgements'>>) => {
      state.companyPolicies.unshift({ ...action.payload, id: `cpol-${Date.now()}`, acknowledgements: [], createdAt: new Date().toISOString() });
    },
    updateCompanyPolicy: (state, action: PayloadAction<CompanyPolicy>) => {
      const idx = state.companyPolicies.findIndex(p => p.id === action.payload.id);
      if (idx >= 0) state.companyPolicies[idx] = action.payload;
    },
    archiveCompanyPolicy: (state, action: PayloadAction<string>) => {
      const idx = state.companyPolicies.findIndex(p => p.id === action.payload);
      if (idx >= 0) state.companyPolicies[idx].status = 'archived';
    },
    acknowledgePolicy: (state, action: PayloadAction<{ policyId: string; employeeId: string }>) => {
      const policy = state.companyPolicies.find(p => p.id === action.payload.policyId);
      if (!policy) return;
      const exists = policy.acknowledgements.some(a => a.employeeId === action.payload.employeeId);
      if (!exists) {
        policy.acknowledgements.push({ employeeId: action.payload.employeeId, acknowledgedAt: new Date().toISOString() });
      }
    },
  },
});

export const {
  setLeaveRequests,
  addLeaveRequest,
  deleteLeaveRequest,
  updateLeaveRequestStatus,
  addPolicy,
  updatePolicy,
  deletePolicy,
  addCompanyPolicy,
  updateCompanyPolicy,
  archiveCompanyPolicy,
  acknowledgePolicy,
} = hrSlice.actions;
export default hrSlice.reducer;
