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

const STORAGE_KEY = 'assetly_expense_claims';

const loadStoredClaims = (): ExpenseClaim[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
};

const saveClaims = (claims: ExpenseClaim[]) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
    }
  } catch {
    // ignore
  }
};

const initialState: ExpensesState = {
  claims: loadStoredClaims(),
};

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    addExpenseClaim: (state, action: PayloadAction<Omit<ExpenseClaim, 'id' | 'createdAt'>>) => {
      const newClaim: ExpenseClaim = {
        ...action.payload,
        id: `exp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      state.claims.unshift(newClaim);
      saveClaims(state.claims);
    },
    updateExpenseClaim: (state, action: PayloadAction<ExpenseClaim>) => {
      const idx = state.claims.findIndex((c) => c.id === action.payload.id);
      if (idx >= 0) {
        state.claims[idx] = action.payload;
        saveClaims(state.claims);
      }
    },
    updateExpenseStatus: (
      state,
      action: PayloadAction<{ id: string; status: ExpenseStatus; approvedBy?: string; rejectionReason?: string }>,
    ) => {
      const idx = state.claims.findIndex((c) => c.id === action.payload.id);
      if (idx >= 0) {
        state.claims[idx].status = action.payload.status;
        if (action.payload.approvedBy) state.claims[idx].approvedBy = action.payload.approvedBy;
        if (action.payload.rejectionReason) state.claims[idx].rejectionReason = action.payload.rejectionReason;
        if (action.payload.status === 'paid') state.claims[idx].paidAt = new Date().toISOString();
        saveClaims(state.claims);
      }
    },
    deleteExpenseClaim: (state, action: PayloadAction<string>) => {
      state.claims = state.claims.filter((c) => c.id !== action.payload);
      saveClaims(state.claims);
    },
    clearAllExpenseClaims: (state) => {
      state.claims = [];
      saveClaims([]);
    },
  },
});

export const {
  addExpenseClaim,
  updateExpenseClaim,
  updateExpenseStatus,
  deleteExpenseClaim,
  clearAllExpenseClaims,
} = expensesSlice.actions;
export default expensesSlice.reducer;
