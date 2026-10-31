import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  Checkbox,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import type { EmployeeTask, TaskChecklistItem, TaskPriority, TaskStatus, TaskType } from '../../../types';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../../hooks/storeHooks';
import { addTask, updateTask, deleteTask } from '../../../store/tasksSlice';

interface TaskModalProps {
  open: boolean;
  task: EmployeeTask | null;
  initialStatus?: TaskStatus;
  initialTicketRef?: string;
  initialProjectId?: string;
  initialEmployeeId?: string;
  onClose: () => void;
}

export function TaskModal({
  open,
  task,
  initialStatus = 'todo',
  initialTicketRef,
  initialProjectId,
  initialEmployeeId,
  onClose,
}: TaskModalProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const employees = useAppSelector((s) => s.employees.items);
  const departments = useAppSelector((s) => s.departments.items);
  const tickets = useAppSelector((s) => s.tickets.items);
  const projects = useAppSelector((s) => s.tasks.projects);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [type, setType] = useState<TaskType>('task');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number>(8);
  const [loggedHours, setLoggedHours] = useState<number>(0);
  const [tagsInput, setTagsInput] = useState('');
  const [ticketReferenceId, setTicketReferenceId] = useState('');
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setType(task.type);
      setAssignedEmployeeId(task.assignedEmployeeId || '');
      setDepartmentId(task.departmentId || '');
      setProjectId(task.projectId || '');
      setDueDate(task.dueDate || '');
      setEstimatedHours(task.estimatedHours || 0);
      setLoggedHours(task.loggedHours || 0);
      setTagsInput(task.tags?.join(', ') || '');
      setTicketReferenceId(task.ticketReferenceId || '');
      setChecklist(task.checklist || []);
    } else {
      const linkedTicket = initialTicketRef ? tickets.find((t) => t.id === initialTicketRef) : null;
      if (linkedTicket) {
        setTitle(`Resolve ${linkedTicket.id}: ${linkedTicket.title}`);
        setDescription(linkedTicket.description || `Deliverable to address support ticket ${linkedTicket.id}`);
        setStatus(initialStatus);
        const prioMap: Record<string, TaskPriority> = {
          critical: 'urgent',
          high: 'high',
          medium: 'medium',
          low: 'low',
        };
        setPriority(prioMap[linkedTicket.priority] || 'medium');
        setType('ticket');
        setAssignedEmployeeId(linkedTicket.employeeId || initialEmployeeId || employees[0]?.id || '');
        if (linkedTicket.departmentName) {
          const dept = departments.find(
            (d) => d.name.toLowerCase() === linkedTicket.departmentName?.toLowerCase()
          );
          setDepartmentId(dept ? dept.id : (departments[0]?.id || ''));
        } else {
          setDepartmentId(departments[0]?.id || '');
        }
        setProjectId(initialProjectId || '');
        const defaultDue = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
        setDueDate(defaultDue);
        setEstimatedHours(8);
        setLoggedHours(0);
        setTagsInput(`Support, ${linkedTicket.category.toUpperCase()}`);
        setTicketReferenceId(linkedTicket.id);
        setChecklist([]);
      } else {
        setTitle('');
        setDescription('');
        setStatus(initialStatus);
        setPriority('medium');
        setType(initialTicketRef ? 'ticket' : 'task');
        setAssignedEmployeeId(initialEmployeeId || employees[0]?.id || '');
        setDepartmentId(departments[0]?.id || '');
        setProjectId(initialProjectId || '');
        const defaultDue = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
        setDueDate(defaultDue);
        setEstimatedHours(8);
        setLoggedHours(0);
        setTagsInput('');
        setTicketReferenceId(initialTicketRef || '');
        setChecklist([]);
      }
    }
  }, [task, initialStatus, initialTicketRef, initialProjectId, initialEmployeeId, employees, departments, tickets]);

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: TaskChecklistItem = {
      id: `chk-${Date.now()}`,
      text: newChecklistText.trim(),
      completed: false,
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistText('');
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(
      checklist.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const assignedEmp = employees.find((e) => e.id === assignedEmployeeId);
    const assignedName = assignedEmp ? `${assignedEmp.firstName} ${assignedEmp.lastName}` : 'Unassigned';
    const dept = departments.find((d) => d.id === departmentId);
    const project = projects.find((p) => p.id === projectId);
    const projectName = project ? project.name : undefined;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (task) {
      dispatch(
        updateTask({
          ...task,
          title: title.trim(),
          description: description.trim(),
          projectId: projectId || undefined,
          projectName,
          status,
          priority,
          type,
          assignedEmployeeId,
          assignedEmployeeName: assignedName,
          departmentId,
          departmentName: dept?.name,
          dueDate,
          estimatedHours: Number(estimatedHours) || 0,
          loggedHours: Number(loggedHours) || 0,
          tags,
          checklist,
          ticketReferenceId: ticketReferenceId.trim() || undefined,
          updatedAt: new Date().toISOString().split('T')[0],
        })
      );
    } else {
      dispatch(
        addTask({
          title: title.trim(),
          description: description.trim(),
          projectId: projectId || undefined,
          projectName,
          status,
          priority,
          type,
          assignedEmployeeId,
          assignedEmployeeName: assignedName,
          reporterName: user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin',
          departmentId,
          departmentName: dept?.name,
          dueDate,
          estimatedHours: Number(estimatedHours) || 0,
          loggedHours: Number(loggedHours) || 0,
          tags,
          checklist,
          ticketReferenceId: ticketReferenceId.trim() || undefined,
        })
      );
    }

    onClose();
  };

  const handleDelete = () => {
    if (task) {
      dispatch(deleteTask(task.id));
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 3,
          pb: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: 'rgba(99, 102, 241, 0.12)',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AssignmentIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
              {task ? `Edit Task (${task.id})` : 'Create Work Task'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {task ? 'Update task progress, assignee, or checklist items' : 'Assign employee deliverable or link to support ticket'}
            </Typography>
          </Box>
        </Stack>

        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2.5}>
          {/* Title */}
          <Grid item xs={12}>
            <TextField
              label="Task Title / Objective"
              fullWidth
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Upgrade PostgreSQL database cluster to version 16"
            />
          </Grid>

          {/* Type & Priority & Status */}
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Work Type"
              fullWidth
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
            >
              <MenuItem value="task">📋 General Task</MenuItem>
              <MenuItem value="ticket">🎫 Support Ticket</MenuItem>
              <MenuItem value="feature">⭐ Feature Request</MenuItem>
              <MenuItem value="bug">🐛 Bug Fix</MenuItem>
              <MenuItem value="operational">⚙️ Operational / DevOps</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Priority Level"
              fullWidth
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <MenuItem value="urgent">🔴 Urgent / Critical</MenuItem>
              <MenuItem value="high">🟠 High</MenuItem>
              <MenuItem value="medium">🔵 Medium</MenuItem>
              <MenuItem value="low">🟢 Low</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Current Stage"
              fullWidth
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              <MenuItem value="todo">To Do</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="in_review">In Review / QA</MenuItem>
              <MenuItem value="done">Completed</MenuItem>
            </TextField>
          </Grid>

          {/* Project, Assignee & Department */}
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Project Deliverable"
              fullWidth
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <MenuItem value="">General / No Project</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Assigned Employee"
              fullWidth
              value={assignedEmployeeId}
              onChange={(e) => setAssignedEmployeeId(e.target.value)}
            >
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.jobTitle})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Department"
              fullWidth
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Due Date & Hours */}
          <Grid item xs={12} sm={4}>
            <TextField
              type="date"
              label="Due Date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              type="number"
              label="Estimated Hours"
              fullWidth
              inputProps={{ min: 0, step: 0.5 }}
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(Number(e.target.value))}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              type="number"
              label="Logged Hours"
              fullWidth
              inputProps={{ min: 0, step: 0.5 }}
              value={loggedHours}
              onChange={(e) => setLoggedHours(Number(e.target.value))}
            />
          </Grid>

          {/* Tags & Ticket Reference */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Tags (comma separated)"
              fullWidth
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Backend, API, Security"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Linked Ticket Ref (Optional)"
              fullWidth
              value={ticketReferenceId}
              onChange={(e) => setTicketReferenceId(e.target.value)}
              placeholder="e.g. TICK-101 or select from tracker"
              InputProps={{
                startAdornment: <ConfirmationNumberIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              label="Description & Specifications"
              multiline
              rows={3}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide background context, technical notes, or acceptance criteria..."
            />
          </Grid>

          {/* Checklist Subtasks */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
                border: '1px solid',
                borderColor: theme.palette.divider,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Subtask Checklist ({checklist.filter((c) => c.completed).length}/{checklist.length})
              </Typography>

              <Stack spacing={1} sx={{ mb: 2 }}>
                {checklist.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1,
                      py: 0.5,
                      borderRadius: '8px',
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                      border: '1px solid',
                      borderColor: theme.palette.divider,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox
                        size="small"
                        checked={item.completed}
                        onChange={() => handleToggleChecklist(item.id)}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          textDecoration: item.completed ? 'line-through' : 'none',
                          color: item.completed ? 'text.secondary' : 'text.primary',
                          fontWeight: item.completed ? 400 : 500,
                        }}
                      >
                        {item.text}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleDeleteChecklistItem(item.id)} color="error">
                      <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>

              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Add a new checklist step..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                />
                <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddChecklistItem}>
                  Add
                </Button>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
        {task ? (
          <Button color="error" variant="text" startIcon={<DeleteOutlineIcon />} onClick={handleDelete}>
            Delete Task
          </Button>
        ) : (
          <Box />
        )}

        <Stack direction="row" spacing={1.5}>
          <Button onClick={onClose} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!title.trim()}
            sx={{
              bgcolor: '#6366F1',
              '&:hover': { bgcolor: '#4F46E5' },
              fontWeight: 700,
              px: 3,
            }}
          >
            {task ? 'Update Task' : 'Create Task'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
