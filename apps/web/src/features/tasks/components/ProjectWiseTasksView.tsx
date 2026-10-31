import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Chip,
  Button,
  LinearProgress,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { EmployeeTask, Project } from '../../../types';
import { TaskCard } from './TaskCard';

interface ProjectWiseTasksViewProps {
  projects: Project[];
  tasks: EmployeeTask[];
  onEditTask: (task: EmployeeTask) => void;
  onAddTaskToProject: (projectId: string, projectName: string) => void;
}

export function ProjectWiseTasksView({
  projects,
  tasks,
  onEditTask,
  onAddTaskToProject,
}: ProjectWiseTasksViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  const filteredProjects = selectedProjectId === 'all'
    ? projects
    : projects.filter((p) => p.id === selectedProjectId);

  // Unassigned tasks (tasks without a project)
  const unassignedTasks = tasks.filter((t) => !t.projectId);

  return (
    <Box>
      {/* Project Selector Chips Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mr: 1, letterSpacing: '0.04em' }}>
          PROJECTS:
        </Typography>
        <Chip
          label={`All Projects (${projects.length})`}
          onClick={() => setSelectedProjectId('all')}
          color={selectedProjectId === 'all' ? 'primary' : 'default'}
          variant={selectedProjectId === 'all' ? 'filled' : 'outlined'}
          sx={{ fontWeight: 700, borderRadius: '8px' }}
        />
        {projects.map((p) => {
          const count = tasks.filter((t) => t.projectId === p.id).length;
          const isSelected = selectedProjectId === p.id;
          return (
            <Chip
              key={p.id}
              label={`${p.name} (${count})`}
              onClick={() => setSelectedProjectId(p.id)}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 700,
                borderRadius: '8px',
                borderColor: alpha(p.color, 0.4),
                bgcolor: isSelected ? p.color : 'transparent',
                color: isSelected ? '#FFFFFF' : 'text.primary',
                '&:hover': {
                  bgcolor: isSelected ? p.color : alpha(p.color, 0.1),
                },
              }}
            />
          );
        })}
      </Box>

      {/* Projects List with Tasks */}
      <Stack spacing={3.5}>
        {filteredProjects.map((project) => {
          const projectTasks = tasks.filter((t) => t.projectId === project.id);
          const totalTasks = projectTasks.length;
          const completedTasks = projectTasks.filter((t) => t.status === 'done').length;
          const inProgressTasks = projectTasks.filter((t) => t.status === 'in_progress').length;
          const percent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
          const totalEst = projectTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
          const totalLogged = projectTasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);

          return (
            <Card
              key={project.id}
              sx={{
                borderRadius: '18px',
                bgcolor: isDark ? 'rgba(30, 41, 59, 0.65)' : '#FFFFFF',
                border: '1px solid',
                borderColor: alpha(project.color, isDark ? 0.35 : 0.25),
                boxShadow: isDark
                  ? `0 10px 30px -10px rgba(0,0,0,0.5), 0 0 0 1px ${alpha(project.color, 0.1)}`
                  : `0 8px 24px -8px rgba(15, 23, 42, 0.08)`,
                overflow: 'hidden',
              }}
            >
              {/* Top Accent Strip */}
              <Box sx={{ height: 4, bgcolor: project.color, width: '100%' }} />

              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                {/* Project Header Info */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: 2,
                    mb: 2.5,
                  }}
                >
                  <Box>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.75 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          bgcolor: alpha(project.color, 0.15),
                          color: project.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FolderIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Typography variant="h6" fontWeight={800} letterSpacing="-0.01em">
                        {project.name}
                      </Typography>
                      <Chip
                        label={project.code}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          height: 22,
                          bgcolor: alpha(project.color, 0.15),
                          color: project.color,
                        }}
                      />
                      <Chip
                        label={project.status.toUpperCase()}
                        size="small"
                        color={project.status === 'active' ? 'success' : 'default'}
                        sx={{ fontWeight: 800, fontSize: '0.65rem', height: 22 }}
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 700, fontSize: '0.85rem' }}>
                      {project.description}
                    </Typography>
                  </Box>

                  {/* Project Meta Metrics & Add Task Button */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Box sx={{ minWidth: 150 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Progress ({completedTasks}/{totalTasks})
                        </Typography>
                        <Typography variant="caption" fontWeight={800} sx={{ color: project.color }}>
                          {Math.round(percent)}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          '& .MuiLinearProgress-bar': { bgcolor: project.color, borderRadius: 3 },
                        }}
                      />
                    </Box>

                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => onAddTaskToProject(project.id, project.name)}
                      sx={{
                        bgcolor: project.color,
                        '&:hover': { bgcolor: alpha(project.color, 0.85) },
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: '9px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Add Task
                    </Button>
                  </Stack>
                </Box>

                {/* Secondary Meta Row: Manager, Dept, Dates, Hours */}
                <Stack
                  direction="row"
                  spacing={3}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{
                    py: 1.25,
                    px: 2,
                    borderRadius: '10px',
                    bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
                    border: '1px solid',
                    borderColor: theme.palette.divider,
                    mb: 2.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 14, color: project.color }} />
                    Manager: <strong>{project.managerName || 'Lead'}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Department: <strong>{project.departmentName || 'General'}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarMonthIcon sx={{ fontSize: 14 }} />
                    Timeline: {project.startDate} to {project.endDate}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Logged Work: <strong>{totalLogged}h</strong> / {totalEst}h planned
                  </Typography>
                  <Typography variant="caption" sx={{ color: inProgressTasks > 0 ? '#F59E0B' : 'text.secondary', fontWeight: inProgressTasks > 0 ? 700 : 400 }}>
                    In Progress: {inProgressTasks} tasks
                  </Typography>
                </Stack>

                {/* Project Tasks Cards Grid */}
                {projectTasks.length > 0 ? (
                  <Grid container spacing={2}>
                    {projectTasks.map((task) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={task.id}>
                        <TaskCard task={task} onEdit={onEditTask} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box
                    sx={{
                      py: 4,
                      textAlign: 'center',
                      borderRadius: '12px',
                      border: '1px dashed',
                      borderColor: theme.palette.divider,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No tasks assigned under this project yet. Click "Add Task" to assign work deliverables.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Unassigned Tasks Section (if any tasks don't have a project) */}
        {selectedProjectId === 'all' && unassignedTasks.length > 0 && (
          <Card
            sx={{
              p: 3,
              borderRadius: '18px',
              border: '1px dashed',
              borderColor: theme.palette.divider,
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF',
            }}
          >
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              General / Uncategorized Deliverables ({unassignedTasks.length})
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {unassignedTasks.map((task) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={task.id}>
                  <TaskCard task={task} onEdit={onEditTask} />
                </Grid>
              ))}
            </Grid>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
