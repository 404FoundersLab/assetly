import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed';
export type OffboardingStatus = 'pending' | 'in_progress' | 'completed';
export type TaskCategory = 'documentation' | 'it_setup' | 'training' | 'administrative' | 'introductions';

export interface OnboardingTaskTemplate {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  dueOffsetDays: number; // days after start date
  required: boolean;
}

export interface OnboardingTaskStatus {
  templateId: string;
  completed: boolean;
  completedAt: string | null;
  notes: string;
}

export interface EmployeeOnboarding {
  id: string;
  employeeId: string;
  startDate: string;
  status: OnboardingStatus;
  tasks: OnboardingTaskStatus[];
  buddyId: string | null;
  welcomeKitSent: boolean;
  createdAt: string;
}

export interface OffboardingRecord {
  id: string;
  employeeId: string;
  exitDate: string;
  reason: 'resignation' | 'termination' | 'retirement' | 'contract_end';
  exitInterviewDone: boolean;
  assetsReturned: boolean;
  accessRevoked: boolean;
  finalSettlementDone: boolean;
  docsCleared: boolean;
  notes: string;
  createdAt: string;
}

interface OnboardingState {
  templates: OnboardingTaskTemplate[];
  onboardings: EmployeeOnboarding[];
  offboardings: OffboardingRecord[];
}

const defaultTemplates: OnboardingTaskTemplate[] = [
  { id: 'tmpl-001', title: 'Complete ID & payroll forms', description: 'Submit government ID, PAN, bank details for payroll setup.', category: 'administrative', dueOffsetDays: 1, required: true },
  { id: 'tmpl-002', title: 'IT equipment setup', description: 'Laptop provisioned, email configured, software installed.', category: 'it_setup', dueOffsetDays: 1, required: true },
  { id: 'tmpl-003', title: 'HR policy acknowledgement', description: 'Read and sign company policies, code of conduct.', category: 'documentation', dueOffsetDays: 2, required: true },
  { id: 'tmpl-004', title: 'Meet the team introduction', description: 'Team lunch and 1:1 introductions with department colleagues.', category: 'introductions', dueOffsetDays: 3, required: false },
  { id: 'tmpl-005', title: 'Security & compliance training', description: 'Complete mandatory cybersecurity awareness training.', category: 'training', dueOffsetDays: 5, required: true },
  { id: 'tmpl-006', title: 'System access provisioned', description: 'All required tools access granted (Jira, Slack, GitHub, etc.).', category: 'it_setup', dueOffsetDays: 2, required: true },
  { id: 'tmpl-007', title: 'Benefits enrollment', description: 'Enroll in health insurance, leave balance configured.', category: 'administrative', dueOffsetDays: 7, required: true },
  { id: 'tmpl-008', title: 'Product & domain training', description: 'Complete product walkthrough and domain knowledge sessions.', category: 'training', dueOffsetDays: 10, required: true },
  { id: 'tmpl-009', title: '30-day check-in meeting', description: 'Manager check-in to review progress and address any concerns.', category: 'introductions', dueOffsetDays: 30, required: false },
];

const allTasks = (overrides: Partial<OnboardingTaskStatus>[]): OnboardingTaskStatus[] =>
  defaultTemplates.map((t, i) => ({
    templateId: t.id,
    completed: overrides[i]?.completed ?? false,
    completedAt: overrides[i]?.completedAt ?? null,
    notes: overrides[i]?.notes ?? '',
  }));

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

const initialOnboardings: EmployeeOnboarding[] = [
  {
    id: 'ob-001', employeeId: 'emp-007', startDate: daysAhead(-5), status: 'in_progress', buddyId: 'emp-001', welcomeKitSent: true,
    tasks: allTasks([
      { completed: true, completedAt: daysAgo(4), notes: '' },
      { completed: true, completedAt: daysAgo(4), notes: '' },
      { completed: true, completedAt: daysAgo(3), notes: '' },
      { completed: true, completedAt: daysAgo(2), notes: '' },
      { completed: false }, { completed: false }, { completed: false }, { completed: false }, { completed: false },
    ]),
    createdAt: daysAgo(7),
  },
  {
    id: 'ob-002', employeeId: 'emp-006', startDate: daysAhead(-30), status: 'completed', buddyId: 'emp-002', welcomeKitSent: true,
    tasks: allTasks(defaultTemplates.map(() => ({ completed: true, completedAt: daysAgo(10), notes: '' }))),
    createdAt: daysAgo(32),
  },
];

const initialOffboardings: OffboardingRecord[] = [
  {
    id: 'off-001', employeeId: 'emp-008', exitDate: daysAhead(15), reason: 'resignation',
    exitInterviewDone: false, assetsReturned: false, accessRevoked: false, finalSettlementDone: false, docsCleared: false,
    notes: 'Resigning for a senior role elsewhere. Notice period ends in 2 weeks.', createdAt: daysAgo(3),
  },
];

const initialState: OnboardingState = {
  templates: defaultTemplates,
  onboardings: initialOnboardings,
  offboardings: initialOffboardings,
};

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    addOnboarding: (state, action: PayloadAction<Omit<EmployeeOnboarding, 'id' | 'createdAt'>>) => {
      state.onboardings.unshift({ ...action.payload, id: `ob-${Date.now()}`, createdAt: new Date().toISOString() });
    },
    updateOnboardingTask: (state, action: PayloadAction<{ onboardingId: string; templateId: string; completed: boolean; notes?: string }>) => {
      const ob = state.onboardings.find(o => o.id === action.payload.onboardingId);
      if (!ob) return;
      const task = ob.tasks.find(t => t.templateId === action.payload.templateId);
      if (!task) return;
      task.completed = action.payload.completed;
      task.completedAt = action.payload.completed ? new Date().toISOString() : null;
      if (action.payload.notes !== undefined) task.notes = action.payload.notes;
      ob.status = ob.tasks.every(t => t.completed) ? 'completed' : 'in_progress';
    },
    addOffboarding: (state, action: PayloadAction<Omit<OffboardingRecord, 'id' | 'createdAt'>>) => {
      state.offboardings.unshift({ ...action.payload, id: `off-${Date.now()}`, createdAt: new Date().toISOString() });
    },
    updateOffboarding: (state, action: PayloadAction<OffboardingRecord>) => {
      const idx = state.offboardings.findIndex(o => o.id === action.payload.id);
      if (idx >= 0) state.offboardings[idx] = action.payload;
    },
    addTemplate: (state, action: PayloadAction<Omit<OnboardingTaskTemplate, 'id'>>) => {
      state.templates.push({ ...action.payload, id: `tmpl-${Date.now()}` });
    },
    updateTemplate: (state, action: PayloadAction<OnboardingTaskTemplate>) => {
      const idx = state.templates.findIndex(t => t.id === action.payload.id);
      if (idx >= 0) state.templates[idx] = action.payload;
    },
    deleteTemplate: (state, action: PayloadAction<string>) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
    },
  },
});

export const { addOnboarding, updateOnboardingTask, addOffboarding, updateOffboarding, addTemplate, updateTemplate, deleteTemplate } = onboardingSlice.actions;
export default onboardingSlice.reducer;
