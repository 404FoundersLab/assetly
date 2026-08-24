import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ReviewStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';
export type RatingScale = 1 | 2 | 3 | 4 | 5;

export interface Goal {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  dueDate: string;
  progress: number; // 0-100
  status: GoalStatus;
  createdAt: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  period: string; // e.g. "Q2 2026"
  rating: RatingScale | null;
  selfRating: RatingScale | null;
  strengths: string;
  improvements: string;
  managerFeedback: string;
  status: ReviewStatus;
  scheduledDate: string;
  completedDate: string | null;
  createdAt: string;
}

interface PerformanceState {
  reviews: PerformanceReview[];
  goals: Goal[];
}

const now = new Date();
const fmt = (d: Date) => d.toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000);

const initialGoals: Goal[] = [
  { id: 'goal-001', employeeId: 'emp-001', title: 'Complete AWS Solutions Architect certification', description: 'Obtain AWS SAA-C03 certification by Q3 end.', dueDate: daysAhead(45).toISOString().split('T')[0], progress: 65, status: 'in_progress', createdAt: fmt(daysAgo(30)) },
  { id: 'goal-002', employeeId: 'emp-001', title: 'Migrate 3 legacy services to microservices', description: 'Decompose monolith services into containerized micro-services.', dueDate: daysAhead(90).toISOString().split('T')[0], progress: 30, status: 'in_progress', createdAt: fmt(daysAgo(20)) },
  { id: 'goal-003', employeeId: 'emp-002', title: 'Implement automated test coverage >80%', description: 'Increase unit and integration test coverage across all modules.', dueDate: daysAgo(5).toISOString().split('T')[0], progress: 45, status: 'overdue', createdAt: fmt(daysAgo(60)) },
  { id: 'goal-004', employeeId: 'emp-003', title: 'Lead Q3 design system overhaul', description: 'Redesign component library, establish design tokens.', dueDate: daysAhead(20).toISOString().split('T')[0], progress: 80, status: 'in_progress', createdAt: fmt(daysAgo(45)) },
  { id: 'goal-005', employeeId: 'emp-004', title: 'Reduce onboarding time by 40%', description: 'Streamline HR onboarding workflows and automate checklist delivery.', dueDate: daysAhead(60).toISOString().split('T')[0], progress: 55, status: 'in_progress', createdAt: fmt(daysAgo(15)) },
  { id: 'goal-006', employeeId: 'emp-005', title: 'Achieve 95% customer satisfaction score', description: 'Improve NPS and CSAT through proactive support practices.', dueDate: daysAhead(30).toISOString().split('T')[0], progress: 88, status: 'in_progress', createdAt: fmt(daysAgo(25)) },
  { id: 'goal-007', employeeId: 'emp-006', title: 'Launch new product analytics dashboard', description: 'Build real-time analytics for product usage tracking.', dueDate: daysAhead(10).toISOString().split('T')[0], progress: 100, status: 'completed', createdAt: fmt(daysAgo(90)) },
  { id: 'goal-008', employeeId: 'emp-007', title: 'Complete PMP certification', description: 'Project Management Professional certification.', dueDate: daysAhead(120).toISOString().split('T')[0], progress: 0, status: 'not_started', createdAt: fmt(daysAgo(5)) },
];

const initialReviews: PerformanceReview[] = [
  {
    id: 'rev-001', employeeId: 'emp-001', reviewerId: 'emp-admin',
    period: 'Q2 2026', rating: 4, selfRating: 4,
    strengths: 'Excellent problem-solving skills. Consistently delivers high-quality code on time.',
    improvements: 'Could improve documentation practices and knowledge sharing with team.',
    managerFeedback: 'Arjun is a key contributor. Ready for Senior Engineer role.',
    status: 'completed', scheduledDate: fmt(daysAgo(10)), completedDate: fmt(daysAgo(5)), createdAt: fmt(daysAgo(20)),
  },
  {
    id: 'rev-002', employeeId: 'emp-002', reviewerId: 'emp-admin',
    period: 'Q2 2026', rating: 3, selfRating: 4,
    strengths: 'Strong domain knowledge and reliable delivery.',
    improvements: 'Test coverage needs improvement. Communication with stakeholders can be clearer.',
    managerFeedback: 'Priya shows solid work but needs to focus on quality metrics.',
    status: 'completed', scheduledDate: fmt(daysAgo(15)), completedDate: fmt(daysAgo(8)), createdAt: fmt(daysAgo(25)),
  },
  {
    id: 'rev-003', employeeId: 'emp-003', reviewerId: 'emp-admin',
    period: 'Q2 2026', rating: 5, selfRating: 5,
    strengths: 'Outstanding UX research and design execution. Elevated the entire product quality.',
    improvements: 'None significant this quarter.',
    managerFeedback: 'Kavya is our top performer this quarter. Exceptional output.',
    status: 'completed', scheduledDate: fmt(daysAgo(12)), completedDate: fmt(daysAgo(6)), createdAt: fmt(daysAgo(22)),
  },
  {
    id: 'rev-004', employeeId: 'emp-004', reviewerId: 'emp-admin',
    period: 'Q2 2026', rating: null, selfRating: null,
    strengths: '', improvements: '', managerFeedback: '',
    status: 'in_progress', scheduledDate: daysAhead(3).toISOString(), completedDate: null, createdAt: fmt(daysAgo(5)),
  },
  {
    id: 'rev-005', employeeId: 'emp-005', reviewerId: 'emp-admin',
    period: 'Q2 2026', rating: null, selfRating: null,
    strengths: '', improvements: '', managerFeedback: '',
    status: 'in_progress', scheduledDate: daysAhead(7).toISOString(), completedDate: null, createdAt: fmt(daysAgo(3)),
  },
  {
    id: 'rev-006', employeeId: 'emp-006', reviewerId: 'emp-admin',
    period: 'Q1 2026', rating: 4, selfRating: 3,
    strengths: 'Great project delivery and stakeholder management.',
    improvements: 'Delegation could be improved.',
    managerFeedback: 'Nisha delivered the analytics dashboard ahead of schedule.',
    status: 'completed', scheduledDate: fmt(daysAgo(70)), completedDate: fmt(daysAgo(65)), createdAt: fmt(daysAgo(75)),
  },
];

const initialState: PerformanceState = {
  reviews: initialReviews,
  goals: initialGoals,
};

const performanceSlice = createSlice({
  name: 'performance',
  initialState,
  reducers: {
    addGoal: (state, action: PayloadAction<Omit<Goal, 'id' | 'createdAt'>>) => {
      state.goals.unshift({ ...action.payload, id: `goal-${Date.now()}`, createdAt: new Date().toISOString() });
    },
    updateGoal: (state, action: PayloadAction<Goal>) => {
      const idx = state.goals.findIndex(g => g.id === action.payload.id);
      if (idx >= 0) state.goals[idx] = action.payload;
    },
    deleteGoal: (state, action: PayloadAction<string>) => {
      state.goals = state.goals.filter(g => g.id !== action.payload);
    },
    addReview: (state, action: PayloadAction<Omit<PerformanceReview, 'id' | 'createdAt'>>) => {
      state.reviews.unshift({ ...action.payload, id: `rev-${Date.now()}`, createdAt: new Date().toISOString() });
    },
    updateReview: (state, action: PayloadAction<PerformanceReview>) => {
      const idx = state.reviews.findIndex(r => r.id === action.payload.id);
      if (idx >= 0) state.reviews[idx] = action.payload;
    },
    deleteReview: (state, action: PayloadAction<string>) => {
      state.reviews = state.reviews.filter(r => r.id !== action.payload);
    },
  },
});

export const { addGoal, updateGoal, deleteGoal, addReview, updateReview, deleteReview } = performanceSlice.actions;
export default performanceSlice.reducer;
