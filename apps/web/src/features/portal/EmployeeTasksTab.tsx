import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Chip,
  Button,
  Checkbox,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../hooks/storeHooks';
import { toggleChecklistItem, logTaskHours, updateTaskStatus } from '../../store/tasksSlice';
import type { EmployeeTask, TaskStatus } from '../../types';

export function EmployeeTasksTab() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const tasks = useAppSelector((s) => s.tasks.items);
  const employees = useAppSelector((s) => s.employees.items);

  const [logHoursTask, setLogHoursTask] = useState<EmployeeTask | null>(null);
  const [hoursToAdd, setHoursToAdd] = useState<number>(1);

  // Match current employee
  const currentEmployee = useMemo(() => {
    return employees.find(
      (e) =>
        e.id === user?.employeeId ||
        e.email?.toLowerCase() === user?.email?.toLowerCase() ||
        e.joiningEmail?.toLowerCase() === user?.email?.toLowerCase()
    );
  }, [employees, user]);

  // Tasks assigned to this employee
  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (currentEmployee && t.assignedEmployeeId === currentEmployee.id) return true;
      if (user?.firstName && t.assignedEmployeeName?.toLowerCase().includes(user.firstName.toLowerCase()))
        return true;
      return false;
    });
  }, [tasks, currentEmployee, user]);

  // KPI stats
  const stats = useMemo(() => {
    const total = myTasks.length;
    const inProgress = myTasks.filter((t) => t.status === 'in_progress').length;
    const completed = myTasks.filter((t) => t.status === 'done').length;
    const hoursLogged = myTasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
    return { total, inProgress, completed, hoursLogged };
  }, [myTasks]);

  const handleSaveHours = () => {
    if (logHoursTask && hoursToAdd > 0) {
      dispatch(logTaskHours({ taskId: logHoursTask.id, additionalHours: Number(hoursToAdd) }));
      setLogHoursTask(null);
      setHoursToAdd(1);
    }
  };

  return (
    <Box>
      {/* Top Header Card */}
      <Card
        sx={{
          mb: 3,
          p: 3,
          borderRadius: '16px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)'
            : 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
          border: `1px solid ${alpha('#8B5CF6', 0.25)}`,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="overline" color="#8B5CF6" fontWeight={800} sx={{ letterSpacing: '0.08em' }}>
              PERSONAL DELIVERABLES & TO-DOS
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
              My Assigned Work & Tasks
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Track daily deliverables, check off checklist milestones, and log working hours.
            </Typography>
          </Box>

          <Button
            variant="contained"
            endIcon={<OpenInNewIcon />}
            onClick={() => navigate('/tasks')}
            sx={{
              bgcolor: '#8B5CF6',
              '&:hover': { bgcolor: '#7C3AED' },
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '10px',
              px: 2.5,
              py: 1,
            }}
          >
            Open Full Tasks Board
          </Button>
        </Box>

        {/* Micro KPI Row */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[
            { label: 'Assigned Deliverables', val: stats.total, color: '#6366F1' },
            { label: 'Currently In Progress', val: stats.inProgress, color: '#F59E0B' },
            { label: 'Completed Deliverables', val: stats.completed, color: '#10B981' },
            { label: 'Total Hours Logged', val: `${stats.hoursLogged}h`, color: '#8B5CF6' },
          ].map((item) => (
            <Grid item xs={6} sm={3} key={item.label}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)',
                  border: `1px solid ${alpha(item.color, 0.2)}`,
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                  {item.label}
                </Typography>
                <Typography variant="h6" fontWeight={900} sx={{ color: item.color }}>
                  {item.val}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>

      {/* Task List */}
      <Stack spacing={2}>
        {myTasks.map((task) => {
          const totalChecklist = task.checklist?.length || 0;
          const completedChecklist = task.checklist?.filter((c) => c.completed).length || 0;
          const checklistPercent = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0;

          return (
            <Card
              key={task.id}
              sx={{
                p: 2.5,
                borderRadius: '14px',
                border: '1px solid',
                borderColor: theme.palette.divider,
                bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: alpha('#8B5CF6', 0.4),
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1, mb: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" fontWeight={800} color="#8B5CF6">
                    {task.id}
                  </Typography>
                  <Chip
                    label={task.status.replace('_', ' ')}
                    size="small"
                    color={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'warning' : 'default'}
                    sx={{ textTransform: 'capitalize', fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                  />
                  <Chip
                    label={task.priority}
                    size="small"
                    sx={{
                      textTransform: 'capitalize',
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      height: 22,
                      bgcolor:
                        task.priority === 'urgent'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : task.priority === 'high'
                          ? 'rgba(249, 115, 22, 0.1)'
                          : 'rgba(59, 130, 246, 0.1)',
                      color:
                        task.priority === 'urgent'
                          ? '#EF4444'
                          : task.priority === 'high'
                          ? '#F97316'
                          : '#3B82F6',
                    }}
                  />
                  {task.ticketReferenceId && (
                    <Chip
                      icon={<ConfirmationNumberIcon sx={{ fontSize: '12px !important' }} />}
                      label={task.ticketReferenceId}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#EC4899',
                        bgcolor: 'rgba(236, 72, 153, 0.1)',
                      }}
                    />
                  )}
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Due: {task.dueDate || 'No due date'}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setLogHoursTask(task)}
                    sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25, borderRadius: '6px' }}
                  >
                    Log Hours (⏱ {task.loggedHours || 0}h)
                  </Button>
                </Stack>
              </Box>

              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                {task.title}
              </Typography>

              {task.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
                  {task.description}
                </Typography>
              )}

              {/* Subtasks Checklist Interactive */}
              {totalChecklist > 0 && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(241, 245, 249, 0.5)',
                    border: '1px solid',
                    borderColor: theme.palette.divider,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" fontWeight={700}>
                      Milestones ({completedChecklist}/{totalChecklist} complete)
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="#8B5CF6">
                      {Math.round(checklistPercent)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={checklistPercent}
                    sx={{ height: 5, borderRadius: 2, mb: 1.5 }}
                  />

                  <Stack spacing={0.5}>
                    {task.checklist.map((c) => (
                      <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          size="small"
                          checked={c.completed}
                          onChange={() => dispatch(toggleChecklistItem({ taskId: task.id, itemId: c.id }))}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.82rem',
                            textDecoration: c.completed ? 'line-through' : 'none',
                            color: c.completed ? 'text.secondary' : 'text.primary',
                          }}
                        >
                          {c.text}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Card>
          );
        })}

        {myTasks.length === 0 && (
          <Card sx={{ p: 6, textAlign: 'center', borderRadius: '16px', border: '1px dashed', borderColor: theme.palette.divider }}>
            <AssignmentIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1, opacity: 0.6 }} />
            <Typography variant="subtitle1" fontWeight={700}>
              No tasks currently assigned to you
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto', mt: 0.5, mb: 2 }}>
              Your manager or team lead has not assigned any pending deliverables. You can view all workspace tasks and support tickets on the main board.
            </Typography>
            <Button variant="outlined" endIcon={<OpenInNewIcon />} onClick={() => navigate('/tasks')} sx={{ borderRadius: '8px' }}>
              Browse Workspace Tasks
            </Button>
          </Card>
        )}
      </Stack>

      {/* Log Hours Dialog */}
      <Dialog open={Boolean(logHoursTask)} onClose={() => setLogHoursTask(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Log Working Hours
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Task: {logHoursTask?.title}
          </Typography>
          <TextField
            label="Additional Hours to Log"
            type="number"
            fullWidth
            inputProps={{ min: 0.25, step: 0.5 }}
            value={hoursToAdd}
            onChange={(e) => setHoursToAdd(Number(e.target.value))}
            helperText={`Currently logged: ${logHoursTask?.loggedHours || 0}h`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setLogHoursTask(null)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveHours} variant="contained" sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}>
            Confirm & Log
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
