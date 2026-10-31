import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Badge,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RateReviewIcon from '@mui/icons-material/RateReview';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import type { EmployeeTask, TaskStatus } from '../../../types';
import { TaskCard } from './TaskCard';

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  badgeBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'todo',
    title: 'To Do',
    icon: <FormatListBulletedIcon sx={{ fontSize: 18 }} />,
    color: '#64748B',
    badgeBg: 'rgba(100, 116, 139, 0.15)',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: <PlayCircleOutlineIcon sx={{ fontSize: 18 }} />,
    color: '#F59E0B',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
  },
  {
    id: 'in_review',
    title: 'In Review / QA',
    icon: <RateReviewIcon sx={{ fontSize: 18 }} />,
    color: '#8B5CF6',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
  },
  {
    id: 'done',
    title: 'Completed',
    icon: <CheckCircleIcon sx={{ fontSize: 18 }} />,
    color: '#10B981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
  },
];

interface KanbanBoardViewProps {
  tasks: EmployeeTask[];
  onEditTask: (task: EmployeeTask) => void;
  onAddTaskToColumn: (status: TaskStatus) => void;
}

export function KanbanBoardView({ tasks, onEditTask, onAddTaskToColumn }: KanbanBoardViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 2.5,
        alignItems: 'start',
      }}
    >
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);

        return (
          <Box
            key={col.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(241, 245, 249, 0.6)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
              p: 1.75,
              minHeight: 520,
            }}
          >
            {/* Column Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
                px: 0.5,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '8px',
                    bgcolor: alpha(col.color, 0.12),
                    color: col.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {col.icon}
                </Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                  {col.title}
                </Typography>
                <Box
                  sx={{
                    px: 1,
                    py: 0.2,
                    borderRadius: '10px',
                    bgcolor: col.badgeBg,
                    color: col.color,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  {colTasks.length}
                </Box>
              </Stack>

              <Tooltip title={`Add task to ${col.title}`}>
                <IconButton
                  size="small"
                  onClick={() => onAddTaskToColumn(col.id)}
                  sx={{
                    width: 26,
                    height: 26,
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
                    '&:hover': { bgcolor: alpha(col.color, 0.2), color: col.color },
                  }}
                >
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Task Cards List */}
            <Stack spacing={1.5} sx={{ flex: 1 }}>
              {colTasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={onEditTask} />
              ))}

              {colTasks.length === 0 && (
                <Box
                  sx={{
                    py: 5,
                    px: 2,
                    textAlign: 'center',
                    borderRadius: '12px',
                    border: '1px dashed',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)',
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    No tasks in {col.title.toLowerCase()}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
