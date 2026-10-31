import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initialOpportunities, initialTodos, ProductOpportunity, ProductOpportunityAssignment, ProjectTodo } from '../features/tasks/productIdeasData';

interface ProductIdeasState {
  opportunities: ProductOpportunity[];
  todos: ProjectTodo[];
  assignments: ProductOpportunityAssignment[];
}

const initialState: ProductIdeasState = {
  opportunities: initialOpportunities,
  todos: initialTodos,
  assignments: [],
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
    },
    assignOpportunityAndStart: (state, action: PayloadAction<{ opportunityId: string; userId: string }>) => {
      const opportunity = state.opportunities.find((item) => item.id === action.payload.opportunityId);
      if (!opportunity) return;
      opportunity.assigneeIds = [...new Set([...(opportunity.assigneeIds ?? []), action.payload.userId])];
      if (opportunity.workStatus !== 'in_progress') {
        opportunity.workStatus = 'in_progress';
        opportunity.workStartedAt = new Date().toISOString();
      }
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