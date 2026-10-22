import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Stack,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BugReportIcon from '@mui/icons-material/BugReport';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import StarIcon from '@mui/icons-material/Star';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import type { EmployeeTask, TaskPriority, TaskStatus, TaskType } from '../../../types';
import { useAppDispatch } from '../../../hooks/storeHooks';
import { updateTaskStatus, deleteTask } from '../../../store/tasksSlice';

const PRIORITY_THEME: Record<TaskPriority, { color: string; label: string; bg: string }> = {
  urgent: { color: '#EF4444', label: 'Urgent', bg: 'rgba(239, 68, 68, 0.12)' },
  high: { color: '#F97316', label: 'High', bg: 'rgba(249, 115, 22, 0.12)' },
  medium: { color: '#3B82F6', label: 'Medium', bg: 'rgba(59, 130, 246, 0.12)' },
  low: { color: '#10B981', label: 'Low', bg: 'rgba(16, 185, 129, 0.12)' },
};

const TYPE_CONFIG: Record<TaskType, { label: string; icon: React.ReactNode; color: string }> = {
  task: { label: 'Task', icon: <AssignmentIcon sx={{ fontSize: 14 }} />, color: '#6366F1' },
  ticket: { label: 'Ticket', icon: <ConfirmationNumberIcon sx={{ fontSize: 14 }} />, color: '#EC4899' },
  bug: { label: 'Bug', icon: <BugReportIcon sx={{ fontSize: 14 }} />, color: '#EF4444' },
  feature: { label: 'Feature', icon: <StarIcon sx={{ fontSize: 14 }} />, color: '#8B5CF6' },
  operational: { label: 'Ops', icon: <SettingsSuggestIcon sx={{ fontSize: 14 }} />, color: '#06B6D4' },
};

interface TaskCardProps {
  task: EmployeeTask;
  onEdit: (task: EmployeeTask) => void;
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const priorityMeta = PRIORITY_THEME[task.priority] || PRIORITY_THEME.medium;
  const typeMeta = TYPE_CONFIG[task.type] || TYPE_CONFIG.task;

  const totalChecklist = task.checklist?.length || 0;
  const completedChecklist = task.checklist?.filter((c) => c.completed).length || 0;
  const checklistPercent = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0;

  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date(new Date().toDateString());

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    dispatch(updateTaskStatus({ id: task.id, status: newStatus }));
    handleCloseMenu();
  };

  const handleDelete = () => {
    dispatch(deleteTask(task.id));
    handleCloseMenu();
  };

  const nextStatusMap: Record<TaskStatus, TaskStatus | null> = {
    todo: 'in_progress',
    in_progress: 'in_review',
    in_review: 'done',
    done: null,
  };

  const nextStatus = nextStatusMap[task.status];

  return (
    <Card
      onClick={() => onEdit(task)}
      sx={{
        borderRadius: '14px',
        bgcolor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 14px rgba(15, 23, 42, 0.04)',
        cursor: 'pointer',
        transition: 'all 0.22s ease-in-out',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: isDark
            ? `0 10px 24px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px ${alpha(priorityMeta.color, 0.4)}`
            : `0 12px 24px -4px rgba(15, 23, 42, 0.1), 0 0 0 1px ${alpha(priorityMeta.color, 0.4)}`,
        },
      }}
    >
      {/* Priority accent pill line on top */}
      <Box
        sx={{
          height: 3,
          width: '100%',
          bgcolor: priorityMeta.color,
          borderTopLeftRadius: '14px',
          borderTopRightRadius: '14px',
        }}
      />

      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header Tags: Type & Priority & More menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Chip
              icon={typeMeta.icon as React.ReactElement}
              label={typeMeta.label}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 700,
                color: typeMeta.color,
                bgcolor: alpha(typeMeta.color, 0.1),
                border: `1px solid ${alpha(typeMeta.color, 0.25)}`,
                '& .MuiChip-icon': { color: typeMeta.color, ml: 0.5 },
              }}
            />
            <Chip
              label={priorityMeta.label}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 800,
                color: priorityMeta.color,
                bgcolor: priorityMeta.bg,
                border: `1px solid ${alpha(priorityMeta.color, 0.3)}`,
              }}
            />
            {task.ticketReferenceId && (
              <Chip
                icon={<ConfirmationNumberIcon sx={{ fontSize: '12px !important' }} />}
                label={task.ticketReferenceId}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#EC4899',
                  bgcolor: 'rgba(236, 72, 153, 0.1)',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
                  '& .MuiChip-icon': { color: '#EC4899' },
                }}
              />
            )}
          </Stack>

          <IconButton size="small" onClick={handleOpenMenu} sx={{ p: 0.5 }}>
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Task Title */}
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{
            mb: 0.75,
            lineHeight: 1.35,
            color: 'text.primary',
            fontSize: '0.9rem',
            letterSpacing: '-0.01em',
          }}
        >
          {task.title}
        </Typography>

        {/* Task Description snippet */}
        {task.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: '0.78rem',
              lineHeight: 1.45,
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {task.description}
          </Typography>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {task.tags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                size="small"
                variant="outlined"
                sx={{
                  height: 19,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
                  color: 'text.secondary',
                }}
              />
            ))}
          </Stack>
        )}

        {/* Checklist Progress Bar */}
        {totalChecklist > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                Checklist Subtasks
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem' }}>
                {completedChecklist}/{totalChecklist}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={checklistPercent}
              sx={{
                height: 5,
                borderRadius: 3,
                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: checklistPercent === 100 ? '#10B981' : '#6366F1',
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}

        {/* Footer: Due date, Logged Hours & Assignee Avatar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pt: 1,
            borderTop: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            {/* Due Date */}
            {task.dueDate && (
              <Tooltip title={isOverdue ? 'Overdue!' : `Due on ${task.dueDate}`}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: isOverdue ? '#EF4444' : 'text.secondary',
                    bgcolor: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    px: isOverdue ? 0.75 : 0,
                    py: isOverdue ? 0.25 : 0,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.4,
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 13 }} />
                  {task.dueDate.slice(5)}
                </Typography>
              </Tooltip>
            )}

            {/* Hours logged */}
            <Tooltip title={`Logged: ${task.loggedHours || 0}h / Estimated: ${task.estimatedHours || 0}h`}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                ⏱ {task.loggedHours || 0}h
              </Typography>
            </Tooltip>
          </Stack>

          {/* Assignee Avatar */}
          <Stack direction="row" spacing={0.75} alignItems="center">
            {nextStatus && (
              <Tooltip title={`Advance to ${nextStatus.replace('_', ' ')}`}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(nextStatus);
                  }}
                  sx={{
                    width: 26,
                    height: 26,
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    '&:hover': { bgcolor: 'primary.main', color: '#FFF' },
                  }}
                >
                  <ArrowForwardIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={task.assignedEmployeeName ? `Assigned to: ${task.assignedEmployeeName}` : 'Unassigned'}>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  bgcolor: '#6366F1',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
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
            </Tooltip>
          </Stack>
        </Box>
      </CardContent>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu} onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={() => { onEdit(task); handleCloseMenu(); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Task</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('todo')} disabled={task.status === 'todo'}>
          <ListItemIcon><ArrowForwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move to To Do</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('in_progress')} disabled={task.status === 'in_progress'}>
          <ListItemIcon><ArrowForwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move to In Progress</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('in_review')} disabled={task.status === 'in_review'}>
          <ListItemIcon><ArrowForwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move to In Review</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('done')} disabled={task.status === 'done'}>
          <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="success" /></ListItemIcon>
          <ListItemText>Mark as Done</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}
