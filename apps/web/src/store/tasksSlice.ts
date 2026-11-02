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

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_TASKS: EmployeeTask[] = [];

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

export function isItemInTenant(
  itemTenantId: string | undefined,
  userTenantId: string | undefined,
  tenantSlug: string | undefined,
  tenantId: string | undefined,
  tenantName: string | undefined,
): boolean {
  if (!itemTenantId) return false;
  const item = itemTenantId.trim().toLowerCase();
  const clean = (s?: string) => (s ? s.trim().toLowerCase() : '');
  const cleanAlpha = (s?: string) => (s ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : '');

  const targets = [clean(userTenantId), clean(tenantId), clean(tenantSlug), clean(tenantName)].filter(Boolean);
  if (targets.some((t) => t === item)) return true;

  const itemAlpha = cleanAlpha(item);
  if (itemAlpha) {
    const alphaTargets = [cleanAlpha(userTenantId), cleanAlpha(tenantId), cleanAlpha(tenantSlug), cleanAlpha(tenantName)].filter(Boolean);
    if (alphaTargets.some((t) => t === itemAlpha)) return true;
  }
  return false;
}

export const DEFAULT_USER_PROJECTS: Project[] = [];

export const DEFAULT_USER_TASKS: EmployeeTask[] = [];

function loadPersistedProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const rawV3 = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (rawV3) {
      const list: Project[] = JSON.parse(rawV3);
      return list.filter((p) => !isDummyProject(p));
    }
    return [];
  } catch {
    return [];
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
  if (typeof window === 'undefined') return [];
  try {
    const rawV3 = localStorage.getItem(TASKS_STORAGE_KEY);
    if (rawV3) {
      const list: EmployeeTask[] = JSON.parse(rawV3);
      return list.filter((t) => !isDummyTask(t));
    }
    return [];
  } catch {
    return [];
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
    syncOpportunityProject: (
      state,
      action: PayloadAction<{
        tenantId: string;
        opportunityId: string;
        opportunityName: string;
        description: string;
        targetCustomers?: string;
        category?: string;
        managerName: string;
        assignedUserId: string;
      }>
    ) => {
      const {
        tenantId,
        opportunityName,
        description,
        targetCustomers,
        category,
        managerName,
        assignedUserId,
      } = action.payload;

      const trimmedName = opportunityName.trim();
      const existingProject = state.projects.find(
        (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const in30DaysStr = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
      const in14DaysStr = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];

      if (existingProject) {
        const isSameManager = !managerName || existingProject.managerName === managerName;
        const isSameAssignee = !assignedUserId || ((existingProject.memberEmployeeIds?.length ?? 0) === 1 && existingProject.memberEmployeeIds?.[0] === assignedUserId);
        const linkedTasks = state.items.filter((t) => t.projectId === existingProject.id);
        const hasLinkedTasks = linkedTasks.length > 0;
        const isLinkedTasksSynced = hasLinkedTasks && linkedTasks.every((t) => (!assignedUserId || t.assignedEmployeeId === assignedUserId) && (!managerName || t.assignedEmployeeName === managerName));

        if (isSameManager && isSameAssignee && hasLinkedTasks && isLinkedTasksSynced && existingProject.tenantId) {
          return;
        }

        existingProject.managerName = managerName || existingProject.managerName;
        if (assignedUserId) {
          existingProject.memberEmployeeIds = [assignedUserId];
        }
        existingProject.status = 'active';
        if (!existingProject.tenantId) {
          existingProject.tenantId = tenantId || '404founderslab';
        }

        if (linkedTasks.length > 0) {
          linkedTasks.forEach((t) => {
            if (managerName) t.assignedEmployeeName = managerName;
            if (assignedUserId) t.assignedEmployeeId = assignedUserId;
            t.status = 'in_progress';
            t.updatedAt = todayStr;
          });
        } else {
          let maxNum = 100;
          for (const t of state.items) {
            const match = t.id.match(/^TSK-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
          const nextTaskId = `TSK-${maxNum + 1}`;
          state.items.unshift({
            id: nextTaskId,
            tenantId: tenantId || existingProject.tenantId || '404founderslab',
            title: `Validate ${trimmedName} with target customers`,
            description: `Interview target customers (${targetCustomers || 'prospective clients'}), test willingness to pay, and validate core MVP scope.`,
            projectId: existingProject.id,
            projectName: existingProject.name,
            assignedEmployeeId: assignedUserId,
            assignedEmployeeName: managerName,
            departmentName: 'Product Engineering',
            reporterName: 'Product Lead',
            status: 'in_progress',
            priority: 'high',
            type: 'feature',
            dueDate: in14DaysStr,
            estimatedHours: 16,
            loggedHours: 0,
            tags: ['Opportunity', 'Validation', category || 'Product'].filter(Boolean),
            checklist: [
              { id: `chk-${Date.now()}-1`, text: 'Conduct initial customer discovery interviews', completed: false },
              { id: `chk-${Date.now()}-2`, text: 'Document willingness to pay and feature requirements', completed: false },
              { id: `chk-${Date.now()}-3`, text: 'Finalize MVP scope and delivery roadmap', completed: false },
            ],
            createdAt: todayStr,
            updatedAt: todayStr,
          });
        }
      } else {
        let maxProjectNum = 100;
        for (const p of state.projects) {
          const match = p.id.match(/^PRJ-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxProjectNum) maxProjectNum = num;
          }
        }
        const projectId = `PRJ-${maxProjectNum + 1}`;

        const code = trimmedName
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 6) || 'PRJ';

        const colorPresets = ['#10B981', '#6366F1', '#06B6D4', '#EC4899', '#F59E0B', '#8B5CF6'];
        const chosenColor = colorPresets[Math.abs(trimmedName.length) % colorPresets.length];

        const newProject: Project = {
          id: projectId,
          tenantId: tenantId || '404founderslab',
          name: trimmedName,
          code,
          description: description || (targetCustomers ? `Target: ${targetCustomers}` : 'Product opportunity validation'),
          departmentId: '',
          departmentName: 'Product Engineering',
          managerName: managerName || 'Lead',
          status: 'active',
          priority: 'high',
          startDate: todayStr,
          endDate: in30DaysStr,
          color: chosenColor,
          memberEmployeeIds: assignedUserId ? [assignedUserId] : [],
        };
        state.projects.push(newProject);

        let maxTaskNum = 100;
        for (const t of state.items) {
          const match = t.id.match(/^TSK-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxTaskNum) maxTaskNum = num;
          }
        }
        const nextTaskId = `TSK-${maxTaskNum + 1}`;

        state.items.unshift({
          id: nextTaskId,
          tenantId,
          title: `Validate ${trimmedName} with target customers`,
          description: `Interview target customers (${targetCustomers || 'prospective clients'}), test willingness to pay, and validate core MVP scope.`,
          projectId: newProject.id,
          projectName: newProject.name,
          assignedEmployeeId: assignedUserId,
          assignedEmployeeName: managerName,
          departmentName: 'Product Engineering',
          reporterName: 'Product Lead',
          status: 'in_progress',
          priority: 'high',
          type: 'feature',
          dueDate: in14DaysStr,
          estimatedHours: 16,
          loggedHours: 0,
          tags: ['Opportunity', 'Validation', category || 'Product'].filter(Boolean),
          checklist: [
            { id: `chk-${Date.now()}-1`, text: 'Conduct initial customer discovery interviews', completed: false },
            { id: `chk-${Date.now()}-2`, text: 'Document willingness to pay and feature requirements', completed: false },
            { id: `chk-${Date.now()}-3`, text: 'Finalize MVP scope and delivery roadmap', completed: false },
          ],
          createdAt: todayStr,
          updatedAt: todayStr,
        });
      }

      savePersistedProjects(state.projects);
      savePersistedTasks(state.items);
    },
    unassignOpportunityProject: (
      state,
      action: PayloadAction<{
        opportunityName: string;
      }>
    ) => {
      const p = state.projects.find(
        (prj) => prj.name.trim().toLowerCase() === action.payload.opportunityName.trim().toLowerCase()
      );
      if (p) {
        if (p.managerName === 'Unassigned' && (p.memberEmployeeIds?.length ?? 0) === 0) {
          return;
        }
        p.managerName = 'Unassigned';
        p.memberEmployeeIds = [];
        state.items.forEach((t) => {
          if (t.projectId === p.id) {
            t.assignedEmployeeName = 'Unassigned';
            t.assignedEmployeeId = '';
            t.status = 'todo';
          }
        });
        savePersistedProjects(state.projects);
        savePersistedTasks(state.items);
      }
    },
    deleteOpportunityProject: (
      state,
      action: PayloadAction<{
        opportunityName: string;
      }>
    ) => {
      const name = action.payload.opportunityName.trim().toLowerCase();
      const proj = state.projects.find((p) => p.name.trim().toLowerCase() === name);
      if (proj) {
        state.projects = state.projects.filter((p) => p.id !== proj.id);
        state.items = state.items.filter((t) => t.projectId !== proj.id);
        savePersistedProjects(state.projects);
        savePersistedTasks(state.items);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: any) => {
      if (action.payload?.tasks) {
        const pList = (action.payload.tasks.projects || []).filter((p: Project) => !isDummyProject(p));
        const tList = (action.payload.tasks.items || []).filter((t: EmployeeTask) => !isDummyTask(t));
        if (pList.length > 0) {
          state.projects = pList.map((p: Project) => ({
            ...p,
            tenantId: p.tenantId || (p.name === 'Assetly' || p.name === 'Schoolstack' ? '404founderslab' : '404founderslab'),
          }));
        }
        if (tList.length > 0) {
          state.items = tList.map((t: EmployeeTask) => ({
            ...t,
            tenantId: t.tenantId || (t.projectName === 'Assetly' || t.projectId === 'PRJ-101' ? '404founderslab' : '404founderslab'),
          }));
        }
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
  syncOpportunityProject,
  unassignOpportunityProject,
  deleteOpportunityProject,
} = tasksSlice.actions;

export default tasksSlice.reducer;
