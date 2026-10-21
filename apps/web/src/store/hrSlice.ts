import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';

export interface LeaveRequest {
  id: string;
  tenantId?: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  departmentId?: string;
  departmentName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  dayType?: 'full' | 'first_half' | 'second_half';
  reason: string | null;
  status: 'pending' | 'pending_manager' | 'pending_hr' | 'approved' | 'rejected' | 'cancelled';
  managerId?: string | null;
  managerName?: string | null;
  managerStatus?: 'pending' | 'approved' | 'rejected' | null;
  managerComment?: string | null;
  reviewedByManagerAt?: string | null;
  approvedBy?: string | null; // HR reviewer ID
  hrStatus?: 'pending' | 'approved' | 'rejected' | null;
  hrComment?: string | null;
  reviewedByHrAt?: string | null;
  backupEmployeeId?: string | null;
  backupEmployeeName?: string | null;
  handoverNotes?: string | null;
  contactNumber?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface EmployeeLeaveBalance {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  year: number;
  casualTotal: number;
  casualUsed: number;
  casualPending: number;
  sickTotal: number;
  sickUsed: number;
  sickPending: number;
  earnedTotal: number;
  earnedUsed: number;
  earnedPending: number;
  compOffTotal: number;
  compOffUsed: number;
  compOffPending: number;
  maternityTotal: number;
  maternityUsed: number;
  maternityPending: number;
  optionalTotal?: number;
  optionalUsed?: number;
  optionalPending?: number;
  paternityTotal?: number;
  paternityUsed?: number;
  paternityPending?: number;
}

export interface LeaveTypeConfig {
  id: string;
  name: string;
  code: string;
  daysPerYear: number;
  carryForwardMax: number;
  paid: boolean;
  requiresProof: boolean;
  description: string;
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
  leaveBalances: EmployeeLeaveBalance[];
  leaveTypes: LeaveTypeConfig[];
  policies: LeavePolicy[];
  companyPolicies: CompanyPolicy[];
}

export const initialLeaveTypes: LeaveTypeConfig[] = [
  { id: 'lt-1', name: 'Casual Leave (CL)', code: 'CL', daysPerYear: 12, carryForwardMax: 0, paid: true, requiresProof: false, description: 'Short unplanned time-off for personal commitments and urgent domestic matters.' },
  { id: 'lt-2', name: 'Privilege Leave (PL / EL)', code: 'PL', daysPerYear: 18, carryForwardMax: 30, paid: true, requiresProof: false, description: 'Accrued annual vacation and privilege quota, eligible for year-end carry forward & encashment.' },
  { id: 'lt-3', name: 'Optional Leave / Floating Holiday (OL)', code: 'OL', daysPerYear: 3, carryForwardMax: 0, paid: true, requiresProof: false, description: 'Flexible floating holiday for regional festivals, cultural days, or personal religious observances.' },
  { id: 'lt-4', name: 'Compensatory Off (Compensation Leave)', code: 'COMP', daysPerYear: 10, carryForwardMax: 0, paid: true, requiresProof: false, description: 'Credited compensation leave for weekend deployment, client emergency, or overtime duty.' },
  { id: 'lt-5', name: 'Maternity Leave (ML)', code: 'ML', daysPerYear: 182, carryForwardMax: 0, paid: true, requiresProof: true, description: 'Statutory 26-week maternal care leave for expectant and new mothers.' },
  { id: 'lt-6', name: 'Paternity Leave (PL)', code: 'PAT', daysPerYear: 15, carryForwardMax: 0, paid: true, requiresProof: false, description: 'Paid support time-off for new fathers within 6 months of childbirth or legal adoption.' },
  { id: 'lt-7', name: 'Sick / Medical Leave (SL)', code: 'SL', daysPerYear: 12, carryForwardMax: 6, paid: true, requiresProof: true, description: 'Medical recovery leave; doctor certificate required for absences exceeding 2 consecutive days.' },
  { id: 'lt-8', name: 'Bereavement / Compassionate Leave (BL)', code: 'BL', daysPerYear: 5, carryForwardMax: 0, paid: true, requiresProof: false, description: 'Compassionate paid support leave for immediate family bereavement.' },
  { id: 'lt-9', name: 'Marriage / Wedding Leave (WL)', code: 'WL', daysPerYear: 5, carryForwardMax: 0, paid: true, requiresProof: true, description: 'Special celebratory paid leave granted once in tenure for employee’s own wedding.' },
  { id: 'lt-10', name: 'Adoption Leave (AL)', code: 'AL', daysPerYear: 60, carryForwardMax: 0, paid: true, requiresProof: true, description: 'Childcare leave granted upon legal adoption of a child under one year of age.' },
  { id: 'lt-11', name: 'Leave Without Pay / Loss of Pay (LWP)', code: 'LWP', daysPerYear: 30, carryForwardMax: 0, paid: false, requiresProof: true, description: 'Approved unpaid time-off availed after exhausting all accrued annual quotas.' },
  { id: 'lt-12', name: 'Sabbatical / Study Leave (SAB)', code: 'SAB', daysPerYear: 90, carryForwardMax: 0, paid: false, requiresProof: true, description: 'Extended career pause for advanced educational qualifications, research, or public service.' },
];

export const initialLeaveBalances: EmployeeLeaveBalance[] = [
  {
    employeeId: '44444444-4444-4444-4444-444444444401', // Sarah Chen
    employeeName: 'Sarah Chen',
    jobTitle: 'Senior Software Engineer',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    year: 2026,
    casualTotal: 12, casualUsed: 4, casualPending: 2,
    sickTotal: 12, sickUsed: 2, sickPending: 0,
    earnedTotal: 18, earnedUsed: 6, earnedPending: 0,
    compOffTotal: 5, compOffUsed: 1, compOffPending: 0,
    maternityTotal: 180, maternityUsed: 0, maternityPending: 0,
  },
  {
    employeeId: '44444444-4444-4444-4444-444444444402', // Mike Johnson
    employeeName: 'Mike Johnson',
    jobTitle: 'DevOps Engineer',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    year: 2026,
    casualTotal: 12, casualUsed: 3, casualPending: 3,
    sickTotal: 12, sickUsed: 1, sickPending: 0,
    earnedTotal: 18, earnedUsed: 4, earnedPending: 0,
    compOffTotal: 5, compOffUsed: 2, compOffPending: 0,
    maternityTotal: 0, maternityUsed: 0, maternityPending: 0,
  },
  {
    employeeId: '44444444-4444-4444-4444-444444444403', // Emily Davis
    employeeName: 'Emily Davis',
    jobTitle: 'HR Manager',
    departmentId: '22222222-2222-2222-2222-222222222202',
    departmentName: 'Human Resources',
    year: 2026,
    casualTotal: 12, casualUsed: 2, casualPending: 0,
    sickTotal: 12, sickUsed: 0, sickPending: 0,
    earnedTotal: 18, earnedUsed: 5, earnedPending: 0,
    compOffTotal: 5, compOffUsed: 0, compOffPending: 0,
    maternityTotal: 180, maternityUsed: 0, maternityPending: 0,
  },
  {
    employeeId: '44444444-4444-4444-4444-444444444406', // David Brown
    employeeName: 'David Brown',
    jobTitle: 'Backend Developer',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    year: 2026,
    casualTotal: 12, casualUsed: 5, casualPending: 0,
    sickTotal: 12, sickUsed: 3, sickPending: 0,
    earnedTotal: 18, earnedUsed: 8, earnedPending: 0,
    compOffTotal: 5, compOffUsed: 1, compOffPending: 0,
    maternityTotal: 0, maternityUsed: 0, maternityPending: 0,
  },
  {
    employeeId: '44444444-4444-4444-4444-444444444407', // Anna Martinez
    employeeName: 'Anna Martinez',
    jobTitle: 'Frontend Developer',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    year: 2026,
    casualTotal: 12, casualUsed: 2, casualPending: 0,
    sickTotal: 12, sickUsed: 1, sickPending: 0,
    earnedTotal: 18, earnedUsed: 5, earnedPending: 0,
    compOffTotal: 5, compOffUsed: 0, compOffPending: 0,
    maternityTotal: 180, maternityUsed: 0, maternityPending: 0,
  },
  {
    employeeId: '44444444-4444-4444-4444-444444444408', // Robert Taylor
    employeeName: 'Robert Taylor',
    jobTitle: 'Account Executive',
    departmentId: '22222222-2222-2222-2222-222222222203',
    departmentName: 'Sales',
    year: 2026,
    casualTotal: 12, casualUsed: 6, casualPending: 0,
    sickTotal: 12, sickUsed: 2, sickPending: 0,
    earnedTotal: 18, earnedUsed: 10, earnedPending: 0,
    compOffTotal: 5, compOffUsed: 0, compOffPending: 0,
    maternityTotal: 0, maternityUsed: 0, maternityPending: 0,
  },
  {
    employeeId: '44444444-4444-4444-4444-444444444409', // Jennifer Lee
    employeeName: 'Jennifer Lee',
    jobTitle: 'Operations Manager',
    departmentId: '22222222-2222-2222-2222-222222222205',
    departmentName: 'Operations',
    year: 2026,
    casualTotal: 12, casualUsed: 3, casualPending: 0,
    sickTotal: 12, sickUsed: 0, sickPending: 0,
    earnedTotal: 18, earnedUsed: 4, earnedPending: 0,
    compOffTotal: 5, compOffUsed: 0, compOffPending: 0,
    maternityTotal: 180, maternityUsed: 0, maternityPending: 0,
  },
  {
    employeeId: '44444444-4444-4444-4444-444444444410', // Chris Anderson
    employeeName: 'Chris Anderson',
    jobTitle: 'QA Engineer',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    year: 2026,
    casualTotal: 12, casualUsed: 2, casualPending: 1,
    sickTotal: 12, sickUsed: 0, sickPending: 0,
    earnedTotal: 18, earnedUsed: 2, earnedPending: 0,
    compOffTotal: 5, compOffUsed: 0, compOffPending: 0,
    maternityTotal: 0, maternityUsed: 0, maternityPending: 0,
  },
  {
    employeeId: '44444444-4444-4444-4444-444444444411', // Tom Reed
    employeeName: 'Tom Reed',
    jobTitle: 'Junior Developer',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    year: 2026,
    casualTotal: 12, casualUsed: 1, casualPending: 0,
    sickTotal: 12, sickUsed: 1, sickPending: 1,
    earnedTotal: 18, earnedUsed: 0, earnedPending: 0,
    compOffTotal: 5, compOffUsed: 0, compOffPending: 0,
    maternityTotal: 0, maternityUsed: 0, maternityPending: 0,
  },
];

export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'req-1',
    employeeId: '44444444-4444-4444-4444-444444444401', // Sarah Chen
    employeeName: 'Sarah Chen',
    employeeEmail: 'sarah.chen@solumtechnologies.com',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    leaveType: 'Casual Leave (CL)',
    startDate: '2026-10-28',
    endDate: '2026-10-29',
    daysCount: 2,
    dayType: 'full',
    reason: 'Family celebration and personal commitments',
    status: 'pending_manager',
    managerId: 'user-itadmin-2',
    managerName: 'Alex Thompson (Principal Architect / Lead)',
    managerStatus: 'pending',
    managerComment: null,
    reviewedByManagerAt: null,
    approvedBy: null,
    hrStatus: 'pending',
    hrComment: null,
    reviewedByHrAt: null,
    backupEmployeeId: '44444444-4444-4444-4444-444444444406',
    backupEmployeeName: 'David Brown',
    handoverNotes: 'David will handle urgent API PR reviews and triage oncall alerts.',
    contactNumber: '+1 555-019-2834',
    createdAt: '2026-10-20T10:15:00Z',
  },
  {
    id: 'req-2',
    employeeId: '44444444-4444-4444-4444-444444444402', // Mike Johnson
    employeeName: 'Mike Johnson',
    employeeEmail: 'mike.johnson@solumtechnologies.com',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    leaveType: 'Casual Leave (CL)',
    startDate: '2026-10-28',
    endDate: '2026-10-30',
    daysCount: 3,
    dayType: 'full',
    reason: 'Attending technical conference out of city',
    status: 'pending_manager',
    managerId: 'user-itadmin-2',
    managerName: 'Alex Thompson (Principal Architect / Lead)',
    managerStatus: 'pending',
    managerComment: null,
    reviewedByManagerAt: null,
    approvedBy: null,
    hrStatus: 'pending',
    hrComment: null,
    reviewedByHrAt: null,
    backupEmployeeId: '44444444-4444-4444-4444-444444444401',
    backupEmployeeName: 'Sarah Chen',
    handoverNotes: 'CI/CD pipeline monitoring delegated to backend team.',
    contactNumber: '+1 555-019-8821',
    createdAt: '2026-10-20T14:30:00Z',
  },
  {
    id: 'req-3',
    employeeId: '44444444-4444-4444-4444-444444444407', // Anna Martinez
    employeeName: 'Anna Martinez',
    employeeEmail: 'anna.martinez@solumtechnologies.com',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    leaveType: 'Earned / Privilege Leave (EL)',
    startDate: '2026-10-15',
    endDate: '2026-10-18',
    daysCount: 4,
    dayType: 'full',
    reason: 'Planned vacation trip with family',
    status: 'approved',
    managerId: 'user-itadmin-2',
    managerName: 'Alex Thompson',
    managerStatus: 'approved',
    managerComment: 'Approved. Frontend deliverables for sprint 42 are wrapped up.',
    reviewedByManagerAt: '2026-10-10T09:00:00Z',
    approvedBy: 'Emily Davis',
    hrStatus: 'approved',
    hrComment: 'Sanctioned against EL quota balance.',
    reviewedByHrAt: '2026-10-10T11:20:00Z',
    backupEmployeeId: '44444444-4444-4444-4444-444444444401',
    backupEmployeeName: 'Sarah Chen',
    handoverNotes: 'All UI components merged into main branch.',
    contactNumber: '+1 555-017-4491',
    createdAt: '2026-10-08T16:00:00Z',
  },
  {
    id: 'req-4',
    employeeId: '44444444-4444-4444-4444-444444444411', // Tom Reed
    employeeName: 'Tom Reed',
    employeeEmail: 'tom.reed.joining@example.com',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    leaveType: 'Sick Leave (SL)',
    startDate: '2026-10-24',
    endDate: '2026-10-24',
    daysCount: 1,
    dayType: 'full',
    reason: 'Wisdom tooth extraction surgery and recovery',
    status: 'pending_hr',
    managerId: 'user-itadmin-2',
    managerName: 'Alex Thompson',
    managerStatus: 'approved',
    managerComment: 'Recommended. Take rest Tom.',
    reviewedByManagerAt: '2026-10-21T08:30:00Z',
    approvedBy: null,
    hrStatus: 'pending',
    hrComment: null,
    reviewedByHrAt: null,
    backupEmployeeId: '44444444-4444-4444-4444-444444444406',
    backupEmployeeName: 'David Brown',
    handoverNotes: 'No blocker tickets pending.',
    contactNumber: '+1 555-012-3344',
    createdAt: '2026-10-20T17:00:00Z',
  },
  {
    id: 'req-5',
    employeeId: '44444444-4444-4444-4444-444444444408', // Robert Taylor
    employeeName: 'Robert Taylor',
    employeeEmail: 'robert.taylor@solumtechnologies.com',
    departmentId: '22222222-2222-2222-2222-222222222203',
    departmentName: 'Sales',
    leaveType: 'Compensatory Off (Comp-Off)',
    startDate: '2026-10-12',
    endDate: '2026-10-12',
    daysCount: 1,
    dayType: 'full',
    reason: 'Comp-off against Sunday enterprise client demo',
    status: 'approved',
    managerId: 'EMP-004',
    managerName: 'James Wilson (Sales Director)',
    managerStatus: 'approved',
    managerComment: 'Verified Sunday presentation attendance.',
    reviewedByManagerAt: '2026-10-09T14:10:00Z',
    approvedBy: 'Emily Davis',
    hrStatus: 'approved',
    hrComment: 'Approved comp-off credit utilization.',
    reviewedByHrAt: '2026-10-10T10:00:00Z',
    backupEmployeeId: null,
    backupEmployeeName: null,
    handoverNotes: null,
    contactNumber: '+1 555-019-3388',
    createdAt: '2026-10-08T11:00:00Z',
  },
];

const initialState: HRState = {
  leaveRequests: initialLeaveRequests,
  leaveBalances: initialLeaveBalances,
  leaveTypes: initialLeaveTypes,
  policies: [
    { id: 'pol-1', name: 'Annual Leave', code: 'AL', maxDays: 25, description: 'Paid vacation days allocated yearly.' },
    { id: 'pol-2', name: 'Sick Leave', code: 'SL', maxDays: 12, description: 'Paid leave for medical recovery and doctor appointments.' },
    { id: 'pol-3', name: 'Casual Leave', code: 'CL', maxDays: 10, description: 'Short-term leaves for personal matters.' },
    { id: 'pol-4', name: 'Maternity Leave', code: 'ML', maxDays: 180, description: 'Paid parental leave for mothers.' },
    { id: 'pol-5', name: 'Paternity Leave', code: 'PL', maxDays: 15, description: 'Paid parental leave for fathers.' },
  ],
  companyPolicies: [],
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
      // Update pending balance
      const bal = state.leaveBalances.find(b => b.employeeId === action.payload.employeeId);
      if (bal) {
        const typeLower = action.payload.leaveType.toLowerCase();
        if (typeLower.includes('casual')) bal.casualPending += action.payload.daysCount;
        else if (typeLower.includes('sick')) bal.sickPending += action.payload.daysCount;
        else if (typeLower.includes('earned') || typeLower.includes('privilege')) bal.earnedPending += action.payload.daysCount;
        else if (typeLower.includes('comp')) bal.compOffPending += action.payload.daysCount;
        else if (typeLower.includes('option') || typeLower.includes('floating')) bal.optionalPending = (bal.optionalPending || 0) + action.payload.daysCount;
        else if (typeLower.includes('matern')) bal.maternityPending += action.payload.daysCount;
        else if (typeLower.includes('patern')) bal.paternityPending = (bal.paternityPending || 0) + action.payload.daysCount;
      }
    },
    managerReviewLeaveRequest: (
      state,
      action: PayloadAction<{ id: string; status: 'approved' | 'rejected'; managerName: string; comment?: string }>
    ) => {
      const idx = state.leaveRequests.findIndex(r => r.id === action.payload.id);
      if (idx !== -1) {
        const req = state.leaveRequests[idx];
        req.managerStatus = action.payload.status;
        req.managerName = action.payload.managerName;
        req.managerComment = action.payload.comment || null;
        req.reviewedByManagerAt = new Date().toISOString();
        if (action.payload.status === 'approved') {
          req.status = 'pending_hr';
        } else {
          req.status = 'rejected';
        }
      }
    },
    updateLeaveRequestStatus: (
      state,
      action: PayloadAction<{ id: string; status: 'approved' | 'rejected'; approvedBy: string; hrComment?: string }>
    ) => {
      const idx = state.leaveRequests.findIndex(r => r.id === action.payload.id);
      if (idx !== -1) {
        const req = state.leaveRequests[idx];
        req.status = action.payload.status;
        req.hrStatus = action.payload.status;
        req.approvedBy = action.payload.approvedBy;
        req.hrComment = action.payload.hrComment || null;
        req.reviewedByHrAt = new Date().toISOString();

        // Adjust employee balance upon approval
        if (action.payload.status === 'approved') {
          const bal = state.leaveBalances.find(b => b.employeeId === req.employeeId);
          if (bal) {
            const typeLower = req.leaveType.toLowerCase();
            if (typeLower.includes('casual')) {
              bal.casualPending = Math.max(0, bal.casualPending - req.daysCount);
              bal.casualUsed += req.daysCount;
            } else if (typeLower.includes('sick')) {
              bal.sickPending = Math.max(0, bal.sickPending - req.daysCount);
              bal.sickUsed += req.daysCount;
            } else if (typeLower.includes('earned') || typeLower.includes('privilege')) {
              bal.earnedPending = Math.max(0, bal.earnedPending - req.daysCount);
              bal.earnedUsed += req.daysCount;
            } else if (typeLower.includes('comp')) {
              bal.compOffPending = Math.max(0, bal.compOffPending - req.daysCount);
              bal.compOffUsed += req.daysCount;
            } else if (typeLower.includes('option') || typeLower.includes('floating')) {
              bal.optionalPending = Math.max(0, (bal.optionalPending || 0) - req.daysCount);
              bal.optionalUsed = (bal.optionalUsed || 0) + req.daysCount;
            } else if (typeLower.includes('matern')) {
              bal.maternityPending = Math.max(0, bal.maternityPending - req.daysCount);
              bal.maternityUsed += req.daysCount;
            } else if (typeLower.includes('patern')) {
              bal.paternityPending = Math.max(0, (bal.paternityPending || 0) - req.daysCount);
              bal.paternityUsed = (bal.paternityUsed || 0) + req.daysCount;
            }
          }
        }
      }
    },
    cancelLeaveRequest: (state, action: PayloadAction<{ id: string }>) => {
      const idx = state.leaveRequests.findIndex(r => r.id === action.payload.id);
      if (idx !== -1) {
        const req = state.leaveRequests[idx];
        req.status = 'cancelled';
        const bal = state.leaveBalances.find(b => b.employeeId === req.employeeId);
        if (bal) {
          const typeLower = req.leaveType.toLowerCase();
          if (typeLower.includes('casual')) bal.casualPending = Math.max(0, bal.casualPending - req.daysCount);
          else if (typeLower.includes('sick')) bal.sickPending = Math.max(0, bal.sickPending - req.daysCount);
          else if (typeLower.includes('earned') || typeLower.includes('privilege')) bal.earnedPending = Math.max(0, bal.earnedPending - req.daysCount);
          else if (typeLower.includes('comp')) bal.compOffPending = Math.max(0, bal.compOffPending - req.daysCount);
          else if (typeLower.includes('option') || typeLower.includes('floating')) bal.optionalPending = Math.max(0, (bal.optionalPending || 0) - req.daysCount);
          else if (typeLower.includes('matern')) bal.maternityPending = Math.max(0, bal.maternityPending - req.daysCount);
          else if (typeLower.includes('patern')) bal.paternityPending = Math.max(0, (bal.paternityPending || 0) - req.daysCount);
        }
      }
    },
    deleteLeaveRequest: (state, action: PayloadAction<string>) => {
      state.leaveRequests = state.leaveRequests.filter(r => r.id !== action.payload);
    },
    setLeaveBalances: (state, action: PayloadAction<EmployeeLeaveBalance[]>) => {
      if (action.payload.length > 0) {
        state.leaveBalances = action.payload;
      }
    },
    adjustEmployeeBalance: (
      state,
      action: PayloadAction<{ employeeId: string; leaveType: string; deltaDays: number }>
    ) => {
      const bal = state.leaveBalances.find(b => b.employeeId === action.payload.employeeId);
      if (bal) {
        const typeLower = action.payload.leaveType.toLowerCase();
        if (typeLower.includes('casual')) bal.casualTotal = Math.max(0, bal.casualTotal + action.payload.deltaDays);
        else if (typeLower.includes('sick')) bal.sickTotal = Math.max(0, bal.sickTotal + action.payload.deltaDays);
        else if (typeLower.includes('earned') || typeLower.includes('privilege')) bal.earnedTotal = Math.max(0, bal.earnedTotal + action.payload.deltaDays);
        else if (typeLower.includes('comp')) bal.compOffTotal = Math.max(0, bal.compOffTotal + action.payload.deltaDays);
        else if (typeLower.includes('option') || typeLower.includes('floating')) bal.optionalTotal = Math.max(0, (bal.optionalTotal || 3) + action.payload.deltaDays);
        else if (typeLower.includes('matern')) bal.maternityTotal = Math.max(0, bal.maternityTotal + action.payload.deltaDays);
        else if (typeLower.includes('patern')) bal.paternityTotal = Math.max(0, (bal.paternityTotal || 15) + action.payload.deltaDays);
      }
    },
    setLeaveTypes: (state, action: PayloadAction<LeaveTypeConfig[]>) => {
      if (action.payload.length > 0) {
        state.leaveTypes = action.payload;
      }
    },
    addLeaveType: (state, action: PayloadAction<LeaveTypeConfig>) => {
      state.leaveTypes.push(action.payload);
    },
    updateLeaveType: (state, action: PayloadAction<LeaveTypeConfig>) => {
      const idx = state.leaveTypes.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) state.leaveTypes[idx] = action.payload;
    },
    deleteLeaveType: (state, action: PayloadAction<string>) => {
      state.leaveTypes = state.leaveTypes.filter(t => t.id !== action.payload);
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
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action: any) => {
      if (action.payload?.hr) {
        return {
          ...initialState,
          ...action.payload.hr,
          leaveBalances: action.payload.hr.leaveBalances?.length ? action.payload.hr.leaveBalances : initialLeaveBalances,
          leaveTypes: action.payload.hr.leaveTypes?.length ? action.payload.hr.leaveTypes : initialLeaveTypes,
          leaveRequests: action.payload.hr.leaveRequests?.length ? action.payload.hr.leaveRequests : initialLeaveRequests,
        };
      }
      return state;
    });
  },
});

export const {
  setLeaveRequests,
  addLeaveRequest,
  managerReviewLeaveRequest,
  updateLeaveRequestStatus,
  cancelLeaveRequest,
  deleteLeaveRequest,
  setLeaveBalances,
  adjustEmployeeBalance,
  setLeaveTypes,
  addLeaveType,
  updateLeaveType,
  deleteLeaveType,
  addPolicy,
  updatePolicy,
  deletePolicy,
  addCompanyPolicy,
  updateCompanyPolicy,
  archiveCompanyPolicy,
  acknowledgePolicy,
} = hrSlice.actions;

export default hrSlice.reducer;
