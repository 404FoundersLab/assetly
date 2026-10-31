import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  Grid,
  Card,
  Avatar,
  Chip,
  FormControlLabel,
  Switch,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import BarChartIcon from '@mui/icons-material/BarChart';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FolderIcon from '@mui/icons-material/Folder';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import { PageHeader } from '../../components/PageHeader';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../hooks/storeHooks';
import type { EmployeeTask, Project, SupportTicket, TaskPriority, TaskStatus, TaskType } from '../../types';
import { KanbanBoardView } from './components/KanbanBoardView';
import { TaskListView } from './components/TaskListView';
import { TicketTrackerView } from './components/TicketTrackerView';
import { WorkAnalyticsView } from './components/WorkAnalyticsView';
import { ProjectWiseTasksView } from './components/ProjectWiseTasksView';
import { EmployeeWorkloadBoardView } from './components/EmployeeWorkloadBoardView';
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';
import { TicketModal } from './components/TicketModal';

export function TasksPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const isEmployeeRole = user?.role === 'employee';
  const canManageProjects = user?.role === 'tenant_admin' || user?.role === 'platform_admin' || user?.role === 'it_admin';

  const tasks = useAppSelector((s) => s.tasks.items);
  const projects = useAppSelector((s) => s.tasks.projects);
  const employees = useAppSelector((s) => s.employees.items);
  const departments = useAppSelector((s) => s.departments.items);
  const tickets = useAppSelector((s) => s.tickets.items);

  // Tabs:
  // For normal employee:
  //   0: Project-Wise Tasks
  //   1: My Deliverables (List)
  //   2: Stage Kanban
  //   3: Ticket Tracker
  // For manager / admin:
  //   0: Task Stages (Kanban)
  //   1: Employee Workload (By Employee)
  //   2: Project-Wise Tasks (By Project)
  //   3: All Tasks (List)
  //   4: Ticket Tracker
  //   5: Workload Analytics
  const [activeTab, setActiveTab] = useState(0);

  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [myTasksOnly, setMyTasksOnly] = useState(isEmployeeRole);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [modalInitialStatus, setModalInitialStatus] = useState<TaskStatus>('todo');
  const [modalInitialTicketRef, setModalInitialTicketRef] = useState<string | undefined>(undefined);
  const [modalInitialProjectId, setModalInitialProjectId] = useState<string | undefined>(undefined);
  const [modalInitialEmployeeId, setModalInitialEmployeeId] = useState<string | undefined>(undefined);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  // Current logged in user's matching employee ID
  const currentEmployee = useMemo(() => {
    return employees.find(
      (e) =>
        e.id === user?.employeeId ||
        e.email?.toLowerCase() === user?.email?.toLowerCase() ||
        e.joiningEmail?.toLowerCase() === user?.email?.toLowerCase()
    );
  }, [employees, user]);

  // Filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      const searchMatch =
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))) ||
        (t.projectName && t.projectName.toLowerCase().includes(search.toLowerCase()));

      // Assignee
      const assigneeMatch =
        filterAssignee === 'all' || t.assignedEmployeeId === filterAssignee;

      // Project filter
      const projectMatch =
        filterProject === 'all' || t.projectId === filterProject;

      // My tasks
      const myTaskMatch =
        !myTasksOnly ||
        (currentEmployee && t.assignedEmployeeId === currentEmployee.id) ||
        (user?.firstName && t.assignedEmployeeName?.toLowerCase().includes(user.firstName.toLowerCase()));

      // Department
      const deptMatch =
        filterDepartment === 'all' || t.departmentId === filterDepartment;

      // Priority
      const priorityMatch =
        filterPriority === 'all' || t.priority === filterPriority;

      // Type
      const typeMatch = filterType === 'all' || t.type === filterType;

      return searchMatch && assigneeMatch && projectMatch && myTaskMatch && deptMatch && priorityMatch && typeMatch;
    });
  }, [tasks, search, filterAssignee, filterProject, filterDepartment, filterPriority, filterType, myTasksOnly, currentEmployee, user]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const inReview = tasks.filter((t) => t.status === 'in_review').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const overdue = tasks.filter(
      (t) => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date(new Date().toDateString())
    ).length;
    const openTicketsCount = tickets.filter((tk) => tk.status === 'open' || tk.status === 'in_progress').length;
    const activeProjectsCount = projects.filter((p) => p.status === 'active').length;

    return { total, inProgress, inReview, done, overdue, openTicketsCount, activeProjectsCount };
  }, [tasks, tickets, projects]);

  const handleOpenCreateModal = (
    initialStatus: TaskStatus = 'todo',
    ticketRef?: string,
    projectId?: string,
    employeeId?: string
  ) => {
    setSelectedTask(null);
    setModalInitialStatus(initialStatus);
    setModalInitialTicketRef(ticketRef);
    setModalInitialProjectId(projectId);
    setModalInitialEmployeeId(employeeId);
    setModalOpen(true);
  };

  const handleOpenEditModal = (task: EmployeeTask) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilterAssignee('all');
    setFilterProject('all');
    setFilterDepartment('all');
    setFilterPriority('all');
    setFilterType('all');
    setMyTasksOnly(isEmployeeRole);
  };

  const handleConvertTicketToTask = (ticket: SupportTicket) => {
    handleOpenCreateModal('todo', ticket.id);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
      <PageHeader
        title={isEmployeeRole ? 'My Project Deliverables & Tasks' : 'Work & Task Management'}
        subtitle={
          isEmployeeRole
            ? 'Track your project milestones, deliverables, interactive checklists, and logged work hours.'
            : 'Coordinate deliverables by task stage, manage employee workloads, monitor project milestones, and resolve tickets.'
        }
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ConfirmationNumberIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setActiveTab(isEmployeeRole ? 3 : 4);
                setTicketModalOpen(true);
              }}
              sx={{
                borderRadius: '10px',
                fontWeight: 700,
                textTransform: 'none',
                borderColor: '#EC4899',
                color: '#EC4899',
                '&:hover': { borderColor: '#DB2777', bgcolor: 'rgba(236, 72, 153, 0.08)' },
              }}
            >
              New Ticket
            </Button>
            {canManageProjects && (
              <Button
                variant="outlined"
                startIcon={<FolderIcon sx={{ fontSize: 18 }} />}
                onClick={() => {
                  setSelectedProject(null);
                  setProjectModalOpen(true);
                }}
                sx={{
                  borderRadius: '10px',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderColor: '#8B5CF6',
                  color: '#8B5CF6',
                  '&:hover': { borderColor: '#7C3AED', bgcolor: 'rgba(139, 92, 246, 0.08)' },
                }}
              >
                New Project
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenCreateModal('todo')}
              sx={{
                borderRadius: '10px',
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: '#8B5CF6',
                '&:hover': { bgcolor: '#7C3AED' },
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
              }}
            >
              New Task
            </Button>
          </Stack>
        }
      />

      {/* KPI Metric Cards */}
      <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
        {[
          { label: 'Active Projects', value: stats.activeProjectsCount, icon: <FolderIcon />, color: '#6366F1', sub: 'Project roadmaps' },
          { label: 'Total Tasks', value: stats.total, icon: <AssignmentIcon />, color: '#3B82F6', sub: 'Across departments' },
          { label: 'In Progress', value: stats.inProgress, icon: <AccessTimeIcon />, color: '#F59E0B', sub: 'Currently under work' },
          { label: 'In Review / QA', value: stats.inReview, icon: <ViewKanbanIcon />, color: '#8B5CF6', sub: 'Pending sign-off' },
          { label: 'Completed', value: stats.done, icon: <CheckCircleIcon />, color: '#10B981', sub: 'Closed deliverables' },
          { label: 'Overdue Warnings', value: stats.overdue, icon: <ErrorOutlineIcon />, color: '#EF4444', sub: 'Requires escalation' },
        ].map((kpi) => (
          <Grid item xs={12} sm={6} md={2} key={kpi.label}>
            <Card
              sx={{
                p: 2,
                borderRadius: '14px',
                border: `1px solid ${alpha(kpi.color, 0.25)}`,
                bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  {kpi.label}
                </Typography>
                <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(kpi.color, 0.15), color: kpi.color }}>
                  {React.cloneElement(kpi.icon as React.ReactElement, { sx: { fontSize: 16 } })}
                </Avatar>
              </Box>
              <Typography variant="h5" fontWeight={900} sx={{ color: kpi.color, lineHeight: 1 }}>
                {kpi.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                {kpi.sub}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Role-tailored Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        {isEmployeeRole ? (
          // Normal Employee: Primary view is Project-Wise!
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 700,
                fontSize: '0.88rem',
                textTransform: 'none',
                minHeight: 46,
              },
            }}
          >
            <Tab icon={<FolderIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Project Deliverables (Project-Wise)" />
            <Tab icon={<TableRowsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="My Deliverables List" />
            <Tab icon={<ViewKanbanIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Task Stage Kanban" />
            <Tab icon={<ConfirmationNumberIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Support Tickets" />
          </Tabs>
        ) : (
          // Admins & Managers: Task-wise, Employee-wise, and Project-wise
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 700,
                fontSize: '0.88rem',
                textTransform: 'none',
                minHeight: 46,
              },
            }}
          >
            <Tab icon={<ViewKanbanIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Task Stages (Kanban)" />
            <Tab icon={<GroupsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="By Employee (Workload)" />
            <Tab icon={<FolderIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="By Project (Project-Wise)" />
            <Tab icon={<TableRowsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="All Tasks (List)" />
            <Tab icon={<ConfirmationNumberIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Ticket Tracker" />
            <Tab icon={<BarChartIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Workload Analytics" />
          </Tabs>
        )}
      </Box>

      {/* Search & Filters Bar */}
      <Card
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '14px',
          bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF',
          border: '1px solid',
          borderColor: theme.palette.divider,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search tasks, projects, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Project Filter */}
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              select
              size="small"
              fullWidth
              label="Project"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <MenuItem value="all">All Projects</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Assignee Filter (for Admins / Managers) */}
          {!isEmployeeRole && (
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                select
                size="small"
                fullWidth
                label="Employee"
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
              >
                <MenuItem value="all">All Employees</MenuItem>
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          {/* Department Filter */}
          <Grid item xs={6} sm={3} md={1.75}>
            <TextField
              select
              size="small"
              fullWidth
              label="Department"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <MenuItem value="all">All Departments</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Priority Filter */}
          <Grid item xs={6} sm={3} md={1.25}>
            <TextField
              select
              size="small"
              fullWidth
              label="Priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </TextField>
          </Grid>

          {/* My Tasks Switch & Reset */}
          <Grid item xs={12} md={isEmployeeRole ? 4 : 2}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              {!isEmployeeRole && (
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={myTasksOnly}
                      onChange={(e) => setMyTasksOnly(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="caption" fontWeight={700}>My Tasks</Typography>}
                />
              )}

              {(search || filterAssignee !== 'all' || filterProject !== 'all' || filterDepartment !== 'all' || filterPriority !== 'all' || filterType !== 'all') && (
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  onClick={handleResetFilters}
                  startIcon={<FilterAltOffIcon sx={{ fontSize: 16 }} />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Reset
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Tab Panels */}
      {isEmployeeRole ? (
        // Normal Employee Tab Views
        <>
          {activeTab === 0 && (
            <ProjectWiseTasksView
              projects={projects}
              tasks={filteredTasks}
              onEditTask={handleOpenEditModal}
              onAddTaskToProject={(pId, pName) => handleOpenCreateModal('todo', undefined, pId)}
              onOpenCreateProject={() => {
                setSelectedProject(null);
                setProjectModalOpen(true);
              }}
              onEditProject={(p) => {
                setSelectedProject(p);
                setProjectModalOpen(true);
              }}
            />
          )}

          {activeTab === 1 && (
            <TaskListView
              tasks={filteredTasks}
              onEditTask={handleOpenEditModal}
            />
          )}

          {activeTab === 2 && (
            <KanbanBoardView
              tasks={filteredTasks}
              onEditTask={handleOpenEditModal}
              onAddTaskToColumn={(status) => handleOpenCreateModal(status)}
            />
          )}

          {activeTab === 3 && (
            <TicketTrackerView onConvertToTask={handleConvertTicketToTask} onOpenCreateTicket={() => setTicketModalOpen(true)} />
          )}
        </>
      ) : (
        // Admin / Manager Tab Views (Task-wise, Employee-wise, Project-wise)
        <>
          {activeTab === 0 && (
            // By Task Stages (Kanban)
            <KanbanBoardView
              tasks={filteredTasks}
              onEditTask={handleOpenEditModal}
              onAddTaskToColumn={(status) => handleOpenCreateModal(status)}
            />
          )}

          {activeTab === 1 && (
            // By Employee (Workload Board)
            <EmployeeWorkloadBoardView
              employees={employees}
              tasks={filteredTasks}
              onEditTask={handleOpenEditModal}
              onAddTaskToEmployee={(empId, empName) =>
                handleOpenCreateModal('todo', undefined, undefined, empId)
              }
            />
          )}

          {activeTab === 2 && (
            // By Project (Project-Wise)
            <ProjectWiseTasksView
              projects={projects}
              tasks={filteredTasks}
              onEditTask={handleOpenEditModal}
              onAddTaskToProject={(pId, pName) => handleOpenCreateModal('todo', undefined, pId)}
              onOpenCreateProject={() => {
                setSelectedProject(null);
                setProjectModalOpen(true);
              }}
              onEditProject={(p) => {
                setSelectedProject(p);
                setProjectModalOpen(true);
              }}
            />
          )}

          {activeTab === 3 && (
            // All Tasks List
            <TaskListView
              tasks={filteredTasks}
              onEditTask={handleOpenEditModal}
            />
          )}

          {activeTab === 4 && (
            // Ticket Tracker
            <TicketTrackerView onConvertToTask={handleConvertTicketToTask} onOpenCreateTicket={() => setTicketModalOpen(true)} />
          )}

          {activeTab === 5 && (
            // Workload Analytics
            <WorkAnalyticsView tasks={tasks} />
          )}
        </>
      )}

      {/* Task Create / Edit Dialog */}
      <TaskModal
        open={modalOpen}
        task={selectedTask}
        initialStatus={modalInitialStatus}
        initialTicketRef={modalInitialTicketRef}
        initialProjectId={modalInitialProjectId}
        initialEmployeeId={modalInitialEmployeeId}
        onClose={() => setModalOpen(false)}
      />

      {/* Project Create / Edit Dialog */}
      <ProjectModal
        open={projectModalOpen}
        project={selectedProject}
        onClose={() => {
          setProjectModalOpen(false);
          setSelectedProject(null);
        }}
      />

      {/* Ticket Create Dialog */}
      <TicketModal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
      />
    </Box>
  );
}

export default TasksPage;
