import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { EmployeeTask, TaskChecklistItem, TaskPriority, TaskStatus, TaskType } from '../types';

interface TasksState {
  items: EmployeeTask[];
  selectedTaskId: string | null;
  filterAssigneeId: string | 'all';
  filterDepartmentId: string | 'all';
  filterPriority: TaskPriority | 'all';
  filterStatus: TaskStatus | 'all';
  filterType: TaskType | 'all';
  searchQuery: string;
}

const today = new Date();
const formatDate = (offsetDays: number) => {
  const d = new Date(today.getTime() + offsetDays * 86400000);
  return d.toISOString().split('T')[0];
};

export const INITIAL_TASKS: EmployeeTask[] = [
  {
    id: 'TSK-101',
    title: 'Migrate Redis session cache cluster to High-Availability tier',
    description: 'Upgrade the active-active cluster to node version 7.2 with TLS authentication and verify automated failover behavior under test load.',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444402', // Mike Johnson
    assignedEmployeeName: 'Mike Johnson',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    reporterName: 'Vasanth (Admin)',
    status: 'in_progress',
    priority: 'high',
    type: 'operational',
    dueDate: formatDate(3),
    estimatedHours: 16,
    loggedHours: 9.5,
    tags: ['DevOps', 'Infrastructure', 'Redis'],
    checklist: [
      { id: 'chk-1', text: 'Backup production replica sets', completed: true },
      { id: 'chk-2', text: 'Provision standby cluster in secondary AZ', completed: true },
      { id: 'chk-3', text: 'Conduct DNS cutover test in staging', completed: false },
      { id: 'chk-4', text: 'Update application connection pools & secrets', completed: false },
    ],
    ticketReferenceId: 'TICK-302',
    createdAt: formatDate(-4),
    updatedAt: formatDate(-1),
  },
  {
    id: 'TSK-102',
    title: 'Resolve VPN handshake timeouts for remote European regional team',
    description: 'Diagnose intermittent OpenVPN disconnects reported on macOS Sonoma clients connecting via Frankfurt gateway tunnel.',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444402', // Mike Johnson
    assignedEmployeeName: 'Mike Johnson',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    reporterName: 'Pavan (IT Admin)',
    status: 'todo',
    priority: 'urgent',
    type: 'ticket',
    dueDate: formatDate(1),
    estimatedHours: 8,
    loggedHours: 1,
    tags: ['Network', 'VPN', 'Security'],
    checklist: [
      { id: 'chk-1', text: 'Analyze gateway packet loss logs during peak hours', completed: true },
      { id: 'chk-2', text: 'Patch WireGuard/OpenVPN daemon config MTU size to 1360', completed: false },
      { id: 'chk-3', text: 'Notify affected remote staff and verify reconnection', completed: false },
    ],
    ticketReferenceId: 'TICK-204',
    createdAt: formatDate(-2),
    updatedAt: formatDate(0),
  },
  {
    id: 'TSK-103',
    title: 'Build automated Leave Approval escalation bot for Slack & Email',
    description: 'Develop an automated background worker that alerts secondary managers if leave requests remain unattended after 48 business hours.',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444401', // Sarah Chen
    assignedEmployeeName: 'Sarah Chen',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    reporterName: 'Emily Davis',
    status: 'in_progress',
    priority: 'medium',
    type: 'feature',
    dueDate: formatDate(5),
    estimatedHours: 24,
    loggedHours: 14,
    tags: ['HR Tech', 'Automation', 'Slack API'],
    checklist: [
      { id: 'chk-1', text: 'Define Cron schedule and notification webhook payloads', completed: true },
      { id: 'chk-2', text: 'Create leave reminder email templates', completed: true },
      { id: 'chk-3', text: 'Test interactive Slack approval buttons in staging', completed: false },
      { id: 'chk-4', text: 'Deploy worker to serverless Edge environment', completed: false },
    ],
    createdAt: formatDate(-6),
    updatedAt: formatDate(-2),
  },
  {
    id: 'TSK-104',
    title: 'Annual Statutory HR Equal Opportunity Compliance Audit Filing',
    description: 'Compile workforce demographic balance, affirmative inclusion metrics, and mandatory training acknowledgment certificates for Q3 review.',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444403', // Emily Davis
    assignedEmployeeName: 'Emily Davis',
    departmentId: '22222222-2222-2222-2222-222222222202',
    departmentName: 'Human Resources',
    reporterName: 'Vasanth (Admin)',
    status: 'in_review',
    priority: 'high',
    type: 'task',
    dueDate: formatDate(2),
    estimatedHours: 18,
    loggedHours: 17,
    tags: ['Compliance', 'HR Ops', 'Audit'],
    checklist: [
      { id: 'chk-1', text: 'Gather digital policy acknowledgments from all staff', completed: true },
      { id: 'chk-2', text: 'Generate salary parity and tenure breakdown spreadsheets', completed: true },
      { id: 'chk-3', text: 'Legal team executive sign-off review', completed: true },
      { id: 'chk-4', text: 'Archive report in Executive Doc Vault compliance library', completed: false },
    ],
    createdAt: formatDate(-10),
    updatedAt: formatDate(-1),
  },
  {
    id: 'TSK-105',
    title: 'Fix memory leak in Endpoints Telemetry WebSocket listener',
    description: 'Telemetry daemon CPU spikes on long-lived connections due to unclosed socket buffers during agent reconnect cycles.',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444406', // David Brown
    assignedEmployeeName: 'David Brown',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    reporterName: 'Sarah Chen',
    status: 'done',
    priority: 'urgent',
    type: 'bug',
    dueDate: formatDate(-1),
    estimatedHours: 12,
    loggedHours: 11,
    tags: ['Backend', 'WebSockets', 'Telemetry'],
    checklist: [
      { id: 'chk-1', text: 'Reproduce leak in local benchmark harness', completed: true },
      { id: 'chk-2', text: 'Apply bounded queue with exponential backoff drops', completed: true },
      { id: 'chk-3', text: 'Run 24h stability test in staging fleet', completed: true },
      { id: 'chk-4', text: 'Merge patch and deploy v1.14.2 hotfix', completed: true },
    ],
    ticketReferenceId: 'TICK-101',
    createdAt: formatDate(-8),
    updatedAt: formatDate(-1),
  },
  {
    id: 'TSK-106',
    title: 'Design Dark-Mode Accessible Color Tokens for Design System',
    description: 'Ensure all MUI components pass WCAG AAA contrast guidelines for slate-900 / dark sapphire backgrounds across portals.',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444407', // Anna Martinez
    assignedEmployeeName: 'Anna Martinez',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    reporterName: 'Sarah Chen',
    status: 'in_review',
    priority: 'medium',
    type: 'feature',
    dueDate: formatDate(4),
    estimatedHours: 16,
    loggedHours: 14.5,
    tags: ['Frontend', 'UI/UX', 'Design Tokens'],
    checklist: [
      { id: 'chk-1', text: 'Audit typography hierarchy and muted text ratios', completed: true },
      { id: 'chk-2', text: 'Define border alpha transparencies for cards and dialogs', completed: true },
      { id: 'chk-3', text: 'Publish interactive storybook / Figma kit preview', completed: false },
    ],
    createdAt: formatDate(-5),
    updatedAt: formatDate(-1),
  },
  {
    id: 'TSK-107',
    title: 'Reconcile Q3 Cloud Infrastructure CapEx & Depreciation Journal',
    description: 'Map AWS / Azure invoices with asset depreciation tables and cost center budget lines in IT Spend.',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444405', // Priya Patel
    assignedEmployeeName: 'Priya Patel',
    departmentId: '22222222-2222-2222-2222-222222222204',
    departmentName: 'Finance',
    reporterName: 'Vasanth (Admin)',
    status: 'todo',
    priority: 'high',
    type: 'task',
    dueDate: formatDate(7),
    estimatedHours: 20,
    loggedHours: 2,
    tags: ['Finance', 'CapEx', 'Accounting'],
    checklist: [
      { id: 'chk-1', text: 'Export vendor billing breakdowns for July - September', completed: true },
      { id: 'chk-2', text: 'Cross-reference server serials with IT asset registry', completed: false },
      { id: 'chk-3', text: 'Generate amortization schedules for board presentation', completed: false },
    ],
    createdAt: formatDate(-3),
    updatedAt: formatDate(0),
  },
  {
    id: 'TSK-108',
    title: 'Configure automated Endpoint Security quarantine policies',
    description: 'Set rules to automatically isolate non-compliant devices failing disk encryption or antivirus definitions within 15 minutes of detection.',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444402', // Mike Johnson
    assignedEmployeeName: 'Mike Johnson',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    reporterName: 'Pavan (IT Admin)',
    status: 'todo',
    priority: 'medium',
    type: 'operational',
    dueDate: formatDate(8),
    estimatedHours: 14,
    loggedHours: 0,
    tags: ['Security', 'EDR', 'ZeroTrust'],
    checklist: [
      { id: 'chk-1', text: 'Draft risk rating thresholds with Security council', completed: false },
      { id: 'chk-2', text: 'Test device network isolation command on test Windows host', completed: false },
      { id: 'chk-3', text: 'Setup employee self-service unlock workflow', completed: false },
    ],
    createdAt: formatDate(-1),
    updatedAt: formatDate(0),
  },
];

const initialState: TasksState = {
  items: INITIAL_TASKS,
  selectedTaskId: null,
  filterAssigneeId: 'all',
  filterDepartmentId: 'all',
  filterPriority: 'all',
  filterStatus: 'all',
  filterType: 'all',
  searchQuery: '',
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    addTask: (state, action: PayloadAction<Omit<EmployeeTask, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const nextId = `TSK-${100 + state.items.length + 1}`;
      const now = new Date().toISOString().split('T')[0];
      const newTask: EmployeeTask = {
        ...action.payload,
        id: nextId,
        createdAt: now,
        updatedAt: now,
      };
      state.items.unshift(newTask);
    },
    updateTask: (state, action: PayloadAction<EmployeeTask>) => {
      const index = state.items.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = {
          ...action.payload,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
    },
    updateTaskStatus: (state, action: PayloadAction<{ id: string; status: TaskStatus }>) => {
      const task = state.items.find((t) => t.id === action.payload.id);
      if (task) {
        task.status = action.payload.status;
        task.updatedAt = new Date().toISOString().split('T')[0];
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((t) => t.id !== action.payload);
      if (state.selectedTaskId === action.payload) {
        state.selectedTaskId = null;
      }
    },
    toggleChecklistItem: (state, action: PayloadAction<{ taskId: string; itemId: string }>) => {
      const task = state.items.find((t) => t.id === action.payload.taskId);
      if (task) {
        const item = task.checklist.find((c) => c.id === action.payload.itemId);
        if (item) {
          item.completed = !item.completed;
          task.updatedAt = new Date().toISOString().split('T')[0];
        }
      }
    },
    logTaskHours: (state, action: PayloadAction<{ taskId: string; additionalHours: number }>) => {
      const task = state.items.find((t) => t.id === action.payload.taskId);
      if (task) {
        task.loggedHours = Math.round((task.loggedHours + action.payload.additionalHours) * 10) / 10;
        task.updatedAt = new Date().toISOString().split('T')[0];
      }
    },
    setSelectedTaskId: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload;
    },
    setFilterAssignee: (state, action: PayloadAction<string | 'all'>) => {
      state.filterAssigneeId = action.payload;
    },
    setFilterDepartment: (state, action: PayloadAction<string | 'all'>) => {
      state.filterDepartmentId = action.payload;
    },
    setFilterPriority: (state, action: PayloadAction<TaskPriority | 'all'>) => {
      state.filterPriority = action.payload;
    },
    setFilterStatus: (state, action: PayloadAction<TaskStatus | 'all'>) => {
      state.filterStatus = action.payload;
    },
    setFilterType: (state, action: PayloadAction<TaskType | 'all'>) => {
      state.filterType = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    resetFilters: (state) => {
      state.filterAssigneeId = 'all';
      state.filterDepartmentId = 'all';
      state.filterPriority = 'all';
      state.filterStatus = 'all';
      state.filterType = 'all';
      state.searchQuery = '';
    },
  },
});

export const {
  addTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  toggleChecklistItem,
  logTaskHours,
  setSelectedTaskId,
  setFilterAssignee,
  setFilterDepartment,
  setFilterPriority,
  setFilterStatus,
  setFilterType,
  setSearchQuery,
  resetFilters,
} = tasksSlice.actions;

export default tasksSlice.reducer;
