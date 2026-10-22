import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Avatar,
  Chip,
  Button,
  LinearProgress,
  Tooltip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { Employee, EmployeeTask } from '../../../types';
import { TaskCard } from './TaskCard';

interface EmployeeWorkloadBoardViewProps {
  employees: Employee[];
  tasks: EmployeeTask[];
  onEditTask: (task: EmployeeTask) => void;
  onAddTaskToEmployee: (employeeId: string, employeeName: string) => void;
}

export function EmployeeWorkloadBoardView({
  employees,
  tasks,
  onEditTask,
  onAddTaskToEmployee,
}: EmployeeWorkloadBoardViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Active employees
  const activeEmployees = employees.filter((e) => e.status === 'active');

  return (
    <Box>
      <Grid container spacing={3}>
        {activeEmployees.map((emp) => {
          const empTasks = tasks.filter((t) => t.assignedEmployeeId === emp.id);
          const totalTasks = empTasks.length;
          const completedTasks = empTasks.filter((t) => t.status === 'done').length;
          const inProgressTasks = empTasks.filter((t) => t.status === 'in_progress').length;
          const inReviewTasks = empTasks.filter((t) => t.status === 'in_review').length;
          const overdueTasks = empTasks.filter(
            (t) => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date(new Date().toDateString())
          ).length;

          const totalLogged = empTasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
          const totalEst = empTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
          const percent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

          const fullName = `${emp.firstName} ${emp.lastName}`;

          return (
            <Grid item xs={12} md={6} lg={4} key={emp.id}>
              <Card
                sx={{
                  borderRadius: '16px',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.65)' : '#FFFFFF',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                {/* Employee Header */}
                <Box
                  sx={{
                    p: 2.5,
                    borderBottom: '1px solid',
                    borderColor: theme.palette.divider,
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(30, 41, 59, 0.5) 100%)'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, #FFFFFF 100%)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          width: 42,
                          height: 42,
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          bgcolor: '#6366F1',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 10px rgba(99, 102, 241, 0.35)',
                        }}
                      >
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
                          {fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          {emp.jobTitle}
                        </Typography>
                      </Box>
                    </Stack>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => onAddTaskToEmployee(emp.id, fullName)}
                      sx={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                        textTransform: 'none',
                        py: 0.25,
                      }}
                    >
                      Assign
                    </Button>
                  </Box>

                  {/* Workload Stats Row */}
                  <Grid container spacing={1} sx={{ mt: 0.5 }}>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: '8px', bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          ASSIGNED
                        </Typography>
                        <Typography variant="body2" fontWeight={800}>
                          {totalTasks}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: '8px', bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          IN FLIGHT
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="#F59E0B">
                          {inProgressTasks}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: '8px', bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          DONE
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="#10B981">
                          {completedTasks}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: '8px', bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          HOURS
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="#6366F1">
                          {totalLogged}h
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Progress Bar */}
                  <Box sx={{ mt: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Deliverables Completion
                      </Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem' }}>
                        {Math.round(percent)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      sx={{
                        height: 5,
                        borderRadius: 2.5,
                        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#10B981', borderRadius: 2.5 },
                      }}
                    />
                  </Box>
                </Box>

                {/* Employee's Task Cards List */}
                <CardContent sx={{ p: 2, flex: 1, overflowY: 'auto', maxHeight: 440 }}>
                  <Stack spacing={1.5}>
                    {empTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onEdit={onEditTask} />
                    ))}

                    {empTasks.length === 0 && (
                      <Box
                        sx={{
                          py: 4,
                          textAlign: 'center',
                          borderRadius: '10px',
                          border: '1px dashed',
                          borderColor: theme.palette.divider,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          No active tasks assigned to this employee.
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
