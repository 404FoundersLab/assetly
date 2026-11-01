import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initialOpportunities, initialTodos, ProductOpportunity, ProductOpportunityAssignment, ProjectTodo } from '../features/tasks/productIdeasData';

const SHARED_ASSIGNMENTS_STORAGE_KEY = 'assetly_shared_opportunity_assignments';

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

interface ProductIdeasState {
  opportunities: ProductOpportunity[];
  todos: ProjectTodo[];
  assignments: ProductOpportunityAssignment[];
}

const initialAssignments = loadPersistedAssignments();
const initialOpportunitiesWithAssignments = initialOpportunities.map((opp) => {
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
  todos: initialTodos,
  assignments: initialAssignments,
};

const productIdeasSlice = createSlice({
  name: 'productIdeas',
  initialState,
  reducers: {
    addOpportunity: (state, action: PayloadAction<Omit<ProductOpportunity, 'id'>>) => {
      state.opportunities.unshift({ ...action.payload, id: `opp-${Date.now()}` });
    },
    updateOpportunity: (state, action: PayloadAction<ProductOpportunity>) => {
      const index = state.opportunities.findIndex((item) => item.id === action.payload.id);
      if (index >= 0) state.opportunities[index] = action.payload;
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
        state.assignments = assignments;
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
    },
    addTodo: (state, action: PayloadAction<{ title: string; dueDate: string }>) => {
      state.todos.push({ ...action.payload, id: `todo-${Date.now()}`, status: 'todo' });
    },
    updateTodoStatus: (state, action: PayloadAction<{ id: string; status: ProjectTodo['status'] }>) => {
      const todo = state.todos.find((item) => item.id === action.payload.id);
      if (todo) todo.status = action.payload.status;
    },
    deleteTodo: (state, action: PayloadAction<string>) => {
      state.todos = state.todos.filter((item) => item.id !== action.payload);
    },
  },
});

export const { addOpportunity, updateOpportunity, assignOpportunityAndStart, replaceOpportunityAssignments, addTodo, updateTodoStatus, deleteTodo } = productIdeasSlice.actions;
export default productIdeasSlice.reducer;
