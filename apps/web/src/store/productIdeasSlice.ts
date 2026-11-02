import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initialOpportunities, ProductOpportunity, ProductOpportunityAssignment, ProjectTodo } from '../features/tasks/productIdeasData';

const OPPORTUNITIES_STORAGE_KEY = 'assetly_product_opportunities_v2';
const SHARED_ASSIGNMENTS_STORAGE_KEY = 'assetly_shared_opportunity_assignments';
const TODOS_STORAGE_KEY = 'assetly_product_todos_v1';
const DUMMY_TODO_IDS = new Set(['todo-01', 'todo-02', 'todo-03', 'todo-04', 'todo-05']);

function loadPersistedOpportunities(): ProductOpportunity[] {
  if (typeof window === 'undefined') return initialOpportunities;
  try {
    const raw = localStorage.getItem(OPPORTUNITIES_STORAGE_KEY);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    // First time initialization: persist default initial opportunities
    savePersistedOpportunities(initialOpportunities);
    return initialOpportunities;
  } catch {
    return initialOpportunities;
  }
}

function savePersistedOpportunities(opportunities: ProductOpportunity[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OPPORTUNITIES_STORAGE_KEY, JSON.stringify(opportunities));
  } catch {
    // ignore
  }
}

function loadPersistedAssignments(): ProductOpportunityAssignment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SHARED_ASSIGNMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePersistedAssignments(assignments: ProductOpportunityAssignment[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SHARED_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // ignore
  }
}

function loadPersistedTodos(): ProjectTodo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TODOS_STORAGE_KEY);
    if (!raw) return [];
    const list: ProjectTodo[] = JSON.parse(raw);
    return list.filter((t) => !DUMMY_TODO_IDS.has(t.id));
  } catch {
    return [];
  }
}

function savePersistedTodos(todos: ProjectTodo[]) {
  if (typeof window === 'undefined') return;
  try {
    const clean = todos.filter((t) => !DUMMY_TODO_IDS.has(t.id));
    localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // ignore
  }
}

interface ProductIdeasState {
  opportunities: ProductOpportunity[];
  todos: ProjectTodo[];
  assignments: ProductOpportunityAssignment[];
}

const initialAssignments = loadPersistedAssignments();
const loadedOpportunities = loadPersistedOpportunities();
const initialOpportunitiesWithAssignments = loadedOpportunities.map((opp) => {
  const oppAssignments = initialAssignments.filter((a) => a.opportunityId === opp.id);
  if (oppAssignments.length > 0) {
    return {
      ...opp,
      assigneeIds: oppAssignments.map((a) => a.userId),
      workStatus: oppAssignments[0].workStatus,
      workStartedAt: oppAssignments[0].workStartedAt ?? undefined,
      nextStep: oppAssignments[0].nextStep,
    };
  }
  return opp;
});

const initialState: ProductIdeasState = {
  opportunities: initialOpportunitiesWithAssignments,
  todos: loadPersistedTodos(),
  assignments: initialAssignments,
};

const productIdeasSlice = createSlice({
  name: 'productIdeas',
  initialState,
  reducers: {
    setOpportunities: (state, action: PayloadAction<ProductOpportunity[]>) => {
      state.opportunities = action.payload;
      savePersistedOpportunities(state.opportunities);
    },
    addOpportunity: (state, action: PayloadAction<ProductOpportunity | Omit<ProductOpportunity, 'id'>>) => {
      const id = 'id' in action.payload && action.payload.id ? action.payload.id : `opp-${Date.now()}`;
      const newOpp: ProductOpportunity = {
        ...action.payload,
        id,
      };
      state.opportunities.unshift(newOpp);
      savePersistedOpportunities(state.opportunities);
    },
    updateOpportunity: (state, action: PayloadAction<ProductOpportunity>) => {
      const index = state.opportunities.findIndex((item) => item.id === action.payload.id);
      if (index >= 0) state.opportunities[index] = action.payload;
      savePersistedOpportunities(state.opportunities);
      const opp = action.payload;
      if (opp.assigneeIds) {
        state.assignments = [
          ...state.assignments.filter((a) => a.opportunityId !== opp.id),
          ...opp.assigneeIds.map((uId) => {
            const existing = state.assignments.find((a) => a.opportunityId === opp.id && a.userId === uId);
            return {
              opportunityId: opp.id,
              userId: uId,
              userName: existing?.userName || '',
              userEmail: existing?.userEmail || '',
              workStatus: opp.workStatus || 'not_started',
              workStartedAt: opp.workStartedAt || null,
              nextStep: opp.nextStep || '',
            };
          }),
        ];
        savePersistedAssignments(state.assignments);
      }
    },
    deleteOpportunity: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.opportunities = state.opportunities.filter((item) => item.id !== id);
      state.assignments = state.assignments.filter((item) => item.opportunityId !== id);
      savePersistedOpportunities(state.opportunities);
      savePersistedAssignments(state.assignments);
    },
    assignOpportunityAndStart: (state, action: PayloadAction<{ opportunityId: string; userId: string; userName?: string; userEmail?: string }>) => {
      const opportunity = state.opportunities.find((item) => item.id === action.payload.opportunityId);
      if (!opportunity) return;
      opportunity.assigneeIds = [...new Set([...(opportunity.assigneeIds ?? []), action.payload.userId])];
      if (opportunity.workStatus !== 'in_progress') {
        opportunity.workStatus = 'in_progress';
        opportunity.workStartedAt = new Date().toISOString();
      }
      const existing = state.assignments.find((a) => a.opportunityId === action.payload.opportunityId && a.userId === action.payload.userId);
      if (existing) {
        existing.workStatus = 'in_progress';
        if (action.payload.userName) existing.userName = action.payload.userName;
        if (action.payload.userEmail) existing.userEmail = action.payload.userEmail;
      } else {
        state.assignments.push({
          opportunityId: action.payload.opportunityId,
          userId: action.payload.userId,
          userName: action.payload.userName || '',
          userEmail: action.payload.userEmail || '',
          workStatus: 'in_progress',
          workStartedAt: opportunity.workStartedAt ?? new Date().toISOString(),
          nextStep: opportunity.nextStep ?? '',
        });
      }
      savePersistedOpportunities(state.opportunities);
      savePersistedAssignments(state.assignments);
    },
    replaceOpportunityAssignments: (state, action: PayloadAction<{ assignments: ProductOpportunityAssignment[]; opportunityId?: string }>) => {
      const { assignments, opportunityId } = action.payload;
      if (opportunityId) {
        state.assignments = [
          ...state.assignments.filter((assignment) => assignment.opportunityId !== opportunityId),
          ...assignments,
        ];
      } else {
        if (Array.isArray(assignments) && assignments.length > 0) {
          state.assignments = assignments;
        } else if (state.assignments.length === 0) {
          state.assignments = [];
        }
      }
      savePersistedAssignments(state.assignments);

      const affectedIds = opportunityId ? [opportunityId] : state.opportunities.map((item) => item.id);
      for (const id of affectedIds) {
        const opportunity = state.opportunities.find((item) => item.id === id);
        if (!opportunity) continue;
        const relatedAssignments = state.assignments.filter((assignment) => assignment.opportunityId === id);
        opportunity.assigneeIds = relatedAssignments.map((assignment) => assignment.userId);
        if (relatedAssignments.length > 0) {
          opportunity.workStatus = relatedAssignments[0].workStatus;
          opportunity.workStartedAt = relatedAssignments[0].workStartedAt ?? undefined;
          opportunity.nextStep = relatedAssignments[0].nextStep;
        } else {
          opportunity.workStatus = 'not_started';
          opportunity.workStartedAt = undefined;
        }
      }
      savePersistedOpportunities(state.opportunities);
    },
    addTodo: (state, action: PayloadAction<{ title: string; dueDate: string }>) => {
      state.todos.push({ ...action.payload, id: `todo-${Date.now()}`, status: 'todo' });
      savePersistedTodos(state.todos);
    },
    updateTodoStatus: (state, action: PayloadAction<{ id: string; status: ProjectTodo['status'] }>) => {
      const todo = state.todos.find((item) => item.id === action.payload.id);
      if (todo) {
        todo.status = action.payload.status;
        savePersistedTodos(state.todos);
      }
    },
    deleteTodo: (state, action: PayloadAction<string>) => {
      state.todos = state.todos.filter((item) => item.id !== action.payload);
      savePersistedTodos(state.todos);
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: any) => {
      if (action.payload?.productIdeas) {
        if (Array.isArray(action.payload.productIdeas.opportunities)) {
          state.opportunities = action.payload.productIdeas.opportunities;
          savePersistedOpportunities(state.opportunities);
        }
        const storedTodos = (action.payload.productIdeas.todos || []).filter((t: ProjectTodo) => !DUMMY_TODO_IDS.has(t.id));
        if (storedTodos.length > 0) {
          state.todos = storedTodos;
        }
        savePersistedTodos(state.todos);

        const storedAssignments = action.payload.productIdeas.assignments;
        if (Array.isArray(storedAssignments) && storedAssignments.length > 0) {
          state.assignments = storedAssignments;
          savePersistedAssignments(state.assignments);
        }
      }
    });
  },
});

export const {
  setOpportunities,
  addOpportunity,
  updateOpportunity,
  deleteOpportunity,
  assignOpportunityAndStart,
  replaceOpportunityAssignments,
  addTodo,
  updateTodoStatus,
  deleteTodo,
} = productIdeasSlice.actions;

export default productIdeasSlice.reducer;
