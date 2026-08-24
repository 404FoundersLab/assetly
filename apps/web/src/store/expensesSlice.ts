import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ExpenseCategory = 'travel' | 'meals' | 'equipment' | 'training' | 'accommodation' | 'communication' | 'other';
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  description: string;
  receiptUrl: string | null;
  status: ExpenseStatus;
  approvedBy: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface ExpensesState {
  claims: ExpenseClaim[];
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const dateStr = (daysOffset: number) => new Date(Date.now() - daysOffset * 86400000).toISOString().split('T')[0];

const initialClaims: ExpenseClaim[] = [
  { id: 'exp-001', employeeId: 'emp-001', title: 'AWS re:Invent Conference Travel', category: 'travel', amount: 45000, currency: 'INR', date: dateStr(20), description: 'Flight + hotel for AWS re:Invent conference, Las Vegas.', receiptUrl: null, status: 'approved', approvedBy: 'emp-admin', rejectionReason: null, paidAt: daysAgo(5), createdAt: daysAgo(22) },
  { id: 'exp-002', employeeId: 'emp-001', title: 'Team dinner — Sprint retrospective', category: 'meals', amount: 3200, currency: 'INR', date: dateStr(5), description: 'Team dinner at The Spice Route for Q2 retrospective.', receiptUrl: null, status: 'submitted', approvedBy: null, rejectionReason: null, paidAt: null, createdAt: daysAgo(6) },
  { id: 'exp-003', employeeId: 'emp-002', title: 'IntelliJ IDEA Annual License', category: 'equipment', amount: 8500, currency: 'INR', date: dateStr(12), description: 'Annual IDE license renewal for development work.', receiptUrl: null, status: 'approved', approvedBy: 'emp-admin', rejectionReason: null, paidAt: daysAgo(3), createdAt: daysAgo(14) },
  { id: 'exp-004', employeeId: 'emp-003', title: 'Figma Professional Plan', category: 'equipment', amount: 5200, currency: 'INR', date: dateStr(8), description: 'Figma professional subscription for design work.', receiptUrl: null, status: 'paid', approvedBy: 'emp-admin', rejectionReason: null, paidAt: daysAgo(2), createdAt: daysAgo(10) },
  { id: 'exp-005', employeeId: 'emp-003', title: 'UX Research conference', category: 'training', amount: 12000, currency: 'INR', date: dateStr(30), description: 'Registration for UX Bangalore 2026 conference.', receiptUrl: null, status: 'approved', approvedBy: 'emp-admin', rejectionReason: null, paidAt: daysAgo(15), createdAt: daysAgo(32) },
  { id: 'exp-006', employeeId: 'emp-004', title: 'HR Summit 2026 — Mumbai', category: 'travel', amount: 18500, currency: 'INR', date: dateStr(45), description: 'Train + hotel for HR Summit conference.', receiptUrl: null, status: 'paid', approvedBy: 'emp-admin', rejectionReason: null, paidAt: daysAgo(30), createdAt: daysAgo(47) },
  { id: 'exp-007', employeeId: 'emp-005', title: 'Customer visit — Bengaluru', category: 'travel', amount: 6800, currency: 'INR', date: dateStr(3), description: 'Cab + meals for on-site client visit.', receiptUrl: null, status: 'submitted', approvedBy: null, rejectionReason: null, paidAt: null, createdAt: daysAgo(4) },
  { id: 'exp-008', employeeId: 'emp-005', title: 'Udemy — React Advanced course', category: 'training', amount: 2100, currency: 'INR', date: dateStr(10), description: 'Online course for advanced React patterns.', receiptUrl: null, status: 'rejected', approvedBy: 'emp-admin', rejectionReason: 'Duplicate request. Already enrolled via LMS.', paidAt: null, createdAt: daysAgo(12) },
  { id: 'exp-009', employeeId: 'emp-006', title: 'Mobile data plan — project travel', category: 'communication', amount: 999, currency: 'INR', date: dateStr(15), description: 'International SIM card for client travel to Singapore.', receiptUrl: null, status: 'approved', approvedBy: 'emp-admin', rejectionReason: null, paidAt: daysAgo(5), createdAt: daysAgo(17) },
  { id: 'exp-010', employeeId: 'emp-007', title: 'Office supplies — new joiner kit', category: 'equipment', amount: 1850, currency: 'INR', date: dateStr(1), description: 'Notepad, pens, mouse pad for workspace setup.', receiptUrl: null, status: 'draft', approvedBy: null, rejectionReason: null, paidAt: null, createdAt: daysAgo(2) },
  { id: 'exp-011', employeeId: 'emp-002', title: 'Client lunch meeting', category: 'meals', amount: 2800, currency: 'INR', date: dateStr(6), description: 'Business lunch with XYZ Corp client.', receiptUrl: null, status: 'submitted', approvedBy: null, rejectionReason: null, paidAt: null, createdAt: daysAgo(7) },
  { id: 'exp-012', employeeId: 'emp-001', title: 'External monitor for WFH', category: 'equipment', amount: 14500, currency: 'INR', date: dateStr(60), description: 'Dell 27" monitor for work-from-home setup.', receiptUrl: null, status: 'paid', approvedBy: 'emp-admin', rejectionReason: null, paidAt: daysAgo(40), createdAt: daysAgo(62) },
];

const initialState: ExpensesState = {
  claims: initialClaims,
};

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    addExpenseClaim: (state, action: PayloadAction<Omit<ExpenseClaim, 'id' | 'createdAt'>>) => {
      state.claims.unshift({ ...action.payload, id: `exp-${Date.now()}`, createdAt: new Date().toISOString() });
    },
    updateExpenseClaim: (state, action: PayloadAction<ExpenseClaim>) => {
      const idx = state.claims.findIndex(c => c.id === action.payload.id);
      if (idx >= 0) state.claims[idx] = action.payload;
    },
    updateExpenseStatus: (state, action: PayloadAction<{ id: string; status: ExpenseStatus; approvedBy?: string; rejectionReason?: string }>) => {
      const idx = state.claims.findIndex(c => c.id === action.payload.id);
      if (idx >= 0) {
        state.claims[idx].status = action.payload.status;
        if (action.payload.approvedBy) state.claims[idx].approvedBy = action.payload.approvedBy;
        if (action.payload.rejectionReason) state.claims[idx].rejectionReason = action.payload.rejectionReason;
        if (action.payload.status === 'paid') state.claims[idx].paidAt = new Date().toISOString();
      }
    },
    deleteExpenseClaim: (state, action: PayloadAction<string>) => {
      state.claims = state.claims.filter(c => c.id !== action.payload);
    },
  },
});

export const { addExpenseClaim, updateExpenseClaim, updateExpenseStatus, deleteExpenseClaim } = expensesSlice.actions;
export default expensesSlice.reducer;
