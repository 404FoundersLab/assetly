import React, { useState } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  LinearProgress,
  alpha,
  useTheme,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { EmployeeTask, TaskPriority, TaskStatus } from '../../../types';
import { useAppDispatch } from '../../../hooks/storeHooks';
import { updateTaskStatus, deleteTask } from '../../../store/tasksSlice';

const PRIORITY_COLORS: Record<TaskPriority, { color: string; bg: string }> = {
  urgent: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  high: { color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)' },
  medium: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  low: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
};

const STATUS_COLORS: Record<TaskStatus, { color: string; label: string; bg: string }> = {
  todo: { color: '#64748B', label: 'To Do', bg: 'rgba(100, 116, 139, 0.1)' },
  in_progress: { color: '#F59E0B', label: 'In Progress', bg: 'rgba(245, 158, 11, 0.1)' },
  in_review: { color: '#8B5CF6', label: 'In Review', bg: 'rgba(139, 92, 246, 0.1)' },
  done: { color: '#10B981', label: 'Done', bg: 'rgba(16, 185, 129, 0.1)' },
};

interface TaskListViewProps {
  tasks: EmployeeTask[];
  onEditTask: (task: EmployeeTask) => void;
}

export function TaskListView({ tasks, onEditTask }: TaskListViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();

  return (
    <Card
      sx={{
        borderRadius: '16px',
        bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF',
        border: '1px solid',
        borderColor: theme.palette.divider,
        overflow: 'hidden',
      }}
    >
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.02)' }}>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Task</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Assignee</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Stage / Status</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Checklist & Hours</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => {
              const priority = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
              const statusMeta = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
              const isOverdue =
                task.dueDate &&
                task.status !== 'done' &&
                new Date(task.dueDate) < new Date(new Date().toDateString());

              const totalChecklist = task.checklist?.length || 0;
              const completedChecklist = task.checklist?.filter((c) => c.completed).length || 0;
              const percent = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0;

              return (
                <TableRow
                  key={task.id}
                  hover
                  sx={{
                    transition: 'background-color 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => onEditTask(task)}
                >
                  {/* Task ID, Type & Title */}
                  <TableCell sx={{ py: 2 }}>
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" fontWeight={800} color="primary" sx={{ letterSpacing: '0.02em' }}>
                          {task.id}
                        </Typography>
                        <Chip
                          label={task.type}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
                          }}
                        />
                        {task.ticketReferenceId && (
                          <Chip
                            icon={<ConfirmationNumberIcon sx={{ fontSize: '12px !important' }} />}
                            label={task.ticketReferenceId}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              color: '#EC4899',
                              bgcolor: 'rgba(236, 72, 153, 0.1)',
                            }}
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                        {task.title}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* Assignee */}
                  <TableCell>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          bgcolor: '#6366F1',
                        }}
                      >
                        {task.assignedEmployeeName
                          ? task.assignedEmployeeName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                          : '?'}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>
                        {task.assignedEmployeeName || 'Unassigned'}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* Department */}
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {task.departmentName || '—'}
                    </Typography>
                  </TableCell>

                  {/* Priority */}
                  <TableCell>
                    <Chip
                      label={task.priority}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.7rem',
                        textTransform: 'capitalize',
                        color: priority.color,
                        bgcolor: priority.bg,
                        border: `1px solid ${alpha(priority.color, 0.3)}`,
                      }}
                    />
                  </TableCell>

                  {/* Status Dropdown */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <FormControl size="small">
                      <Select
                        value={task.status}
                        onChange={(e) =>
                          dispatch(updateTaskStatus({ id: task.id, status: e.target.value as TaskStatus }))
                        }
                        sx={{
                          height: 28,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: statusMeta.color,
                          bgcolor: statusMeta.bg,
                          borderRadius: '8px',
                          border: `1px solid ${alpha(statusMeta.color, 0.3)}`,
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        }}
                      >
                        <MenuItem value="todo">To Do</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="in_review">In Review</MenuItem>
                        <MenuItem value="done">Completed</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>

                  {/* Checklist & Hours */}
                  <TableCell>
                    <Box sx={{ minWidth: 110 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {totalChecklist > 0 ? `${completedChecklist}/${totalChecklist} steps` : 'No steps'}
                        </Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem' }}>
                          ⏱ {task.loggedHours || 0}h / {task.estimatedHours || 0}h
                        </Typography>
                      </Stack>
                      {totalChecklist > 0 && (
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: percent === 100 ? '#10B981' : '#6366F1',
                            },
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>

                  {/* Due Date */}
                  <TableCell>
                    {task.dueDate ? (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.8rem',
                          fontWeight: isOverdue ? 800 : 500,
                          color: isOverdue ? '#EF4444' : 'text.primary',
                        }}
                      >
                        {isOverdue && '⚠️ '}
                        {task.dueDate}
                      </Typography>
                    ) : (
                      '—'
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit Task">
                        <IconButton size="small" onClick={() => onEditTask(task)}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Task">
                        <IconButton size="small" color="error" onClick={() => dispatch(deleteTask(task.id))}>
                          <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}

            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No tasks match the active filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
