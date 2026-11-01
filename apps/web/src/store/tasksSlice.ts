import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { EmployeeTask, Project, TaskChecklistItem, TaskPriority, TaskStatus, TaskType } from '../types';

export type TaskGroupBy = 'stage' | 'employee' | 'project';

interface TasksState {
  items: EmployeeTask[];
  projects: Project[];
  selectedTaskId: string | null;
  filterAssigneeId: string | 'all';
  filterDepartmentId: string | 'all';
  filterProjectId: string | 'all';
  filterPriority: TaskPriority | 'all';
  filterStatus: TaskStatus | 'all';
  filterType: TaskType | 'all';
  searchQuery: string;
  groupBy: TaskGroupBy;
}

const today = new Date();
const formatDate = (offsetDays: number) => {
  const d = new Date(today.getTime() + offsetDays * 86400000);
  return d.toISOString().split('T')[0];
};

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'PRJ-101',
    name: 'Cloud & Redis HA Infrastructure',
    code: 'INFRA',
    description: 'High-availability multi-region cluster migration, automated failover, and Redis 7.2 upgrade.',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    managerName: 'Vasanth (Admin)',
    status: 'active',
    priority: 'high',
    startDate: formatDate(-30),
    endDate: formatDate(30),
    color: '#6366F1',
    memberEmployeeIds: [
      '44444444-4444-4444-4444-444444444402', // Mike Johnson
      '44444444-4444-4444-4444-444444444406', // David Brown
    ],
  },
  {
    id: 'PRJ-102',
    name: 'HRMS Leave & Workflow Automation',
    code: 'HRMS',
    description: 'Automated Slack/Email approval escalations, multi-tier leave balance ledger, and peer handover tracking.',
    departmentId: '22222222-2222-2222-2222-222222222202',
    departmentName: 'Human Resources',
    managerName: 'Emily Davis',
    status: 'active',
    priority: 'medium',
    startDate: formatDate(-20),
    endDate: formatDate(45),
    color: '#10B981',
    memberEmployeeIds: [
      '44444444-4444-4444-4444-444444444401', // Sarah Chen
      '44444444-4444-4444-4444-444444444403', // Emily Davis
    ],
  },
  {
    id: 'PRJ-103',
    name: 'Endpoint Security & Zero-Trust Fleet Hardening',
    code: 'EDR',
    description: 'Telemetry monitoring agent, disk encryption quarantine triggers, and VPN gateway timeout fixes.',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    managerName: 'Pavan (IT Admin)',
    status: 'active',
    priority: 'urgent',
    startDate: formatDate(-15),
    endDate: formatDate(20),
    color: '#EC4899',
    memberEmployeeIds: [
      '44444444-4444-4444-4444-444444444402', // Mike Johnson
      '44444444-4444-4444-4444-444444444406', // David Brown
    ],
  },
  {
    id: 'PRJ-104',
    name: 'Q3 Financial CapEx & IT Spend Audit',
    code: 'FIN',
    description: 'Cloud amortization reconciliation, server registry linkage, and depreciation schedules for board review.',
    departmentId: '22222222-2222-2222-2222-222222222204',
    departmentName: 'Finance',
    managerName: 'Priya Patel',
    status: 'active',
    priority: 'high',
    startDate: formatDate(-10),
    endDate: formatDate(15),
    color: '#F59E0B',
    memberEmployeeIds: [
      '44444444-4444-4444-4444-444444444405', // Priya Patel
    ],
  },
  {
    id: 'PRJ-105',
    name: 'Design System & UI/UX Refresh 2026',
    code: 'DSGN',
    description: 'WCAG AAA color tokens, dark mode harmony, and accessible micro-interaction libraries.',
    departmentId: '22222222-2222-2222-2222-222222222201',
    departmentName: 'Engineering',
    managerName: 'Sarah Chen',
    status: 'active',
    priority: 'medium',
    startDate: formatDate(-25),
    endDate: formatDate(35),
    color: '#8B5CF6',
    memberEmployeeIds: [
      '44444444-4444-4444-4444-444444444407', // Anna Martinez
      '44444444-4444-4444-4444-444444444401', // Sarah Chen
    ],
  },
];

export const INITIAL_TASKS: EmployeeTask[] = [
  {
    id: 'TSK-101',
    title: 'Migrate Redis session cache cluster to High-Availability tier',
    description: 'Upgrade the active-active cluster to node version 7.2 with TLS authentication and verify automated failover behavior under test load.',
    projectId: 'PRJ-101',
    projectName: 'Cloud & Redis HA Infrastructure',
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
    projectId: 'PRJ-103',
    projectName: 'Endpoint Security & Zero-Trust Fleet Hardening',
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
    projectId: 'PRJ-102',
    projectName: 'HRMS Leave & Workflow Automation',
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
    projectId: 'PRJ-102',
    projectName: 'HRMS Leave & Workflow Automation',
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
    projectId: 'PRJ-103',
    projectName: 'Endpoint Security & Zero-Trust Fleet Hardening',
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
    projectId: 'PRJ-105',
    projectName: 'Design System & UI/UX Refresh 2026',
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
    projectId: 'PRJ-104',
    projectName: 'Q3 Financial CapEx & IT Spend Audit',
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
    projectId: 'PRJ-103',
    projectName: 'Endpoint Security & Zero-Trust Fleet Hardening',
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

export const DUMMY_PROJECT_NAMES = new Set([
  'Cloud & Redis HA Infrastructure',
  'HRMS Leave & Workflow Automation',
  'Endpoint Security & Zero-Trust Fleet Hardening',
  'Q3 Financial CapEx & IT Spend Audit',
  'Design System & UI/UX Refresh 2026',
]);

export const DUMMY_TASK_TITLES = new Set([
  'Migrate Redis session cache cluster to High-Availability tier',
  'Resolve VPN handshake timeouts for remote European regional team',
  'Build automated Leave Approval escalation bot for Slack & Email',
  'Annual Statutory HR Equal Opportunity Compliance Audit Filing',
  'Fix memory leak in Endpoints Telemetry WebSocket listener',
  'Design Dark-Mode Accessible Color Tokens for Design System',
  'Reconcile Q3 Financial CapEx & IT Spend Audit',
  'Configure automated Endpoint Security quarantine policies',
]);

// Retain empty sets for backward compatibility if imported
export const DUMMY_PROJECT_IDS = new Set<string>();
export const DUMMY_TASK_IDS = new Set<string>();

const PROJECTS_STORAGE_KEY = 'assetly_projects_store_v3';
const TASKS_STORAGE_KEY = 'assetly_tasks_store_v3';

export function isDummyProject(p: Project): boolean {
  return DUMMY_PROJECT_NAMES.has(p.name);
}

export function isDummyTask(t: EmployeeTask): boolean {
  return DUMMY_TASK_TITLES.has(t.title);
}

export const DEFAULT_USER_PROJECTS: Project[] = [
  {
    id: 'PRJ-101',
    name: 'Assetly',
    code: 'A',
    description: 'Asset management, HR, Finance CRM',
    departmentId: '',
    departmentName: 'Full stack Devloper',
    managerName: 'Pramodkumar S V',
    status: 'active',
    priority: 'high',
    startDate: '2026-07-01',
    endDate: '2026-11-29',
    color: '#10B981',
    memberEmployeeIds: [],
  },
  {
    id: 'PRJ-102',
    name: 'Schoolstack',
    code: 'S',
    description: 'CRM',
    departmentId: '',
    departmentName: 'Full stack Devloper',
    managerName: 'Abantika',
    status: 'active',
    priority: 'medium',
    startDate: '2026-10-01',
    endDate: '2026-11-30',
    color: '#06B6D4',
    memberEmployeeIds: [],
  },
];

export const DEFAULT_USER_TASKS: EmployeeTask[] = [
  {
    id: 'TSK-101',
    title: 'Verify HR Portal functionality',
    description: 'Verification of HR People & Culture portal functionality, employee onboarding and attendance modules',
    projectId: 'PRJ-101',
    projectName: 'Assetly',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444401',
    assignedEmployeeName: 'Pramodkumar S',
    status: 'done',
    priority: 'medium',
    type: 'bug',
    departmentName: 'Full stack Devloper',
    dueDate: '2026-10-10',
    estimatedHours: 8,
    loggedHours: 0,
    tags: ['HR', 'Verification'],
    checklist: [
      { id: 'chk-1', text: 'Verify employee profile management', completed: true },
      { id: 'chk-2', text: 'Verify leave approval workflows', completed: true },
    ],
    createdAt: '2026-07-01',
    updatedAt: '2026-10-10',
  },
  {
    id: 'TSK-102',
    title: 'Verification of Asset Management Module',
    description: 'End-to-end verification of hardware asset allocation, inventory tracking, and audit logging',
    projectId: 'PRJ-101',
    projectName: 'Assetly',
    assignedEmployeeId: '44444444-4444-4444-4444-444444444401',
    assignedEmployeeName: 'Pramodkumar S',
    status: 'done',
    priority: 'medium',
    type: 'bug',
    departmentName: 'Full stack Devloper',
    dueDate: '2026-11-06',
    estimatedHours: 8,
    loggedHours: 0,
    tags: ['Asset', 'Verification'],
    checklist: [
      { id: 'chk-3', text: 'Verify device assignment flow', completed: true },
      { id: 'chk-4', text: 'Verify barcode scanning & audit logs', completed: true },
    ],
    createdAt: '2026-07-01',
    updatedAt: '2026-10-10',
  },
];

function loadPersistedProjects(): Project[] {
  if (typeof window === 'undefined') return DEFAULT_USER_PROJECTS;
  try {
    const rawV3 = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (rawV3) {
      const list: Project[] = JSON.parse(rawV3);
      return list.filter((p) => !isDummyProject(p));
    }
    const rawV2 = localStorage.getItem('assetly_projects_store_v2');
    if (rawV2) {
      const list: Project[] = JSON.parse(rawV2).filter((p: Project) => !isDummyProject(p));
      if (list.length > 0) {
        savePersistedProjects(list);
        return list;
      }
    }
    savePersistedProjects(DEFAULT_USER_PROJECTS);
    return DEFAULT_USER_PROJECTS;
  } catch {
    return DEFAULT_USER_PROJECTS;
  }
}

function savePersistedProjects(projects: Project[]) {
  if (typeof window === 'undefined') return;
  try {
    const clean = projects.filter((p) => !isDummyProject(p));
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(clean));
    localStorage.setItem('assetly_projects_store_v2', JSON.stringify(clean));
  } catch {}
}

function loadPersistedTasks(): EmployeeTask[] {
  if (typeof window === 'undefined') return DEFAULT_USER_TASKS;
  try {
    const rawV3 = localStorage.getItem(TASKS_STORAGE_KEY);
    if (rawV3) {
      const list: EmployeeTask[] = JSON.parse(rawV3);
      return list.filter((t) => !isDummyTask(t));
    }
    const rawV2 = localStorage.getItem('assetly_tasks_store_v2');
    if (rawV2) {
      const list: EmployeeTask[] = JSON.parse(rawV2).filter((t: EmployeeTask) => !isDummyTask(t));
      if (list.length > 0) {
        savePersistedTasks(list);
        return list;
      }
    }
    savePersistedTasks(DEFAULT_USER_TASKS);
    return DEFAULT_USER_TASKS;
  } catch {
    return DEFAULT_USER_TASKS;
  }
}

function savePersistedTasks(tasks: EmployeeTask[]) {
  if (typeof window === 'undefined') return;
  try {
    const clean = tasks.filter((t) => !isDummyTask(t));
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(clean));
    localStorage.setItem('assetly_tasks_store_v2', JSON.stringify(clean));
  } catch {}
}

const initialState: TasksState = {
  items: loadPersistedTasks(),
  projects: loadPersistedProjects(),
  selectedTaskId: null,
  filterAssigneeId: 'all',
  filterDepartmentId: 'all',
  filterProjectId: 'all',
  filterPriority: 'all',
  filterStatus: 'all',
  filterType: 'all',
  searchQuery: '',
  groupBy: 'stage',
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    purgeDummyData: (state) => {
      state.projects = state.projects.filter((p) => !isDummyProject(p));
      state.items = state.items.filter((t) => !isDummyTask(t));
      if (state.projects.length === 0) {
        state.projects = [...DEFAULT_USER_PROJECTS];
      }
      if (state.items.length === 0) {
        state.items = [...DEFAULT_USER_TASKS];
      }
      savePersistedProjects(state.projects);
      savePersistedTasks(state.items);
    },
    addTask: (state, action: PayloadAction<Omit<EmployeeTask, 'id' | 'createdAt' | 'updatedAt'>>) => {
      let maxNum = 100;
      for (const t of state.items) {
        const match = t.id.match(/^TSK-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextId = `TSK-${maxNum + 1}`;
      const now = new Date().toISOString().split('T')[0];
      const newTask: EmployeeTask = {
        ...action.payload,
        id: nextId,
        createdAt: now,
        updatedAt: now,
      };
      state.items.unshift(newTask);
      savePersistedTasks(state.items);
    },
    updateTask: (state, action: PayloadAction<EmployeeTask>) => {
      const index = state.items.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = {
          ...action.payload,
          updatedAt: new Date().toISOString().split('T')[0],
        };
        savePersistedTasks(state.items);
      }
    },
    updateTaskStatus: (state, action: PayloadAction<{ id: string; status: TaskStatus }>) => {
      const task = state.items.find((t) => t.id === action.payload.id);
      if (task) {
        task.status = action.payload.status;
        task.updatedAt = new Date().toISOString().split('T')[0];
        savePersistedTasks(state.items);
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((t) => t.id !== action.payload);
      if (state.selectedTaskId === action.payload) {
        state.selectedTaskId = null;
      }
      savePersistedTasks(state.items);
    },
    toggleChecklistItem: (state, action: PayloadAction<{ taskId: string; itemId: string }>) => {
      const task = state.items.find((t) => t.id === action.payload.taskId);
      if (task) {
        const item = task.checklist.find((c) => c.id === action.payload.itemId);
        if (item) {
          item.completed = !item.completed;
          task.updatedAt = new Date().toISOString().split('T')[0];
          savePersistedTasks(state.items);
        }
      }
    },
    logTaskHours: (state, action: PayloadAction<{ taskId: string; additionalHours: number }>) => {
      const task = state.items.find((t) => t.id === action.payload.taskId);
      if (task) {
        task.loggedHours = Math.round((task.loggedHours + action.payload.additionalHours) * 10) / 10;
        task.updatedAt = new Date().toISOString().split('T')[0];
        savePersistedTasks(state.items);
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
    setFilterProject: (state, action: PayloadAction<string | 'all'>) => {
      state.filterProjectId = action.payload;
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
    setGroupBy: (state, action: PayloadAction<TaskGroupBy>) => {
      state.groupBy = action.payload;
    },
    addProject: (state, action: PayloadAction<Omit<Project, 'id'>>) => {
      let maxNum = 100;
      for (const p of state.projects) {
        const match = p.id.match(/^PRJ-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextId = `PRJ-${maxNum + 1}`;
      state.projects.push({ ...action.payload, id: nextId });
      savePersistedProjects(state.projects);
    },
    updateProject: (state, action: PayloadAction<Project>) => {
      const idx = state.projects.findIndex((p) => p.id === action.payload.id);
      if (idx !== -1) {
        state.projects[idx] = action.payload;
        savePersistedProjects(state.projects);
      }
    },
    deleteProject: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter((p) => p.id !== action.payload);
      state.items.forEach((t) => {
        if (t.projectId === action.payload) {
          t.projectId = undefined;
          t.projectName = undefined;
        }
      });
      savePersistedProjects(state.projects);
      savePersistedTasks(state.items);
    },
    resetFilters: (state) => {
      state.filterAssigneeId = 'all';
      state.filterDepartmentId = 'all';
      state.filterProjectId = 'all';
      state.filterPriority = 'all';
      state.filterStatus = 'all';
      state.filterType = 'all';
      state.searchQuery = '';
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: any) => {
      if (action.payload?.tasks) {
        const pList = (action.payload.tasks.projects || []).filter((p: Project) => !isDummyProject(p));
        const tList = (action.payload.tasks.items || []).filter((t: EmployeeTask) => !isDummyTask(t));
        state.projects = pList.length > 0 ? pList : (state.projects.length > 0 ? state.projects : DEFAULT_USER_PROJECTS);
        state.items = tList.length > 0 ? tList : (state.items.length > 0 ? state.items : DEFAULT_USER_TASKS);
        savePersistedProjects(state.projects);
        savePersistedTasks(state.items);
      }
    });
  },
});

export const {
  purgeDummyData,
  addTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  toggleChecklistItem,
  logTaskHours,
  setSelectedTaskId,
  setFilterAssignee,
  setFilterDepartment,
  setFilterProject,
  setFilterPriority,
  setFilterStatus,
  setFilterType,
  setSearchQuery,
  setGroupBy,
  addProject,
  updateProject,
  deleteProject,
  resetFilters,
} = tasksSlice.actions;

export default tasksSlice.reducer;
