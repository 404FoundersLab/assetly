import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  AvatarGroup,
  Avatar,
  Link,
  alpha,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { participantLabels } from '../../../../components/EmployeeMultiSelect';
import { useEmployees } from '../../../../hooks/useEmployees';

export interface MeetingData {
  id: string;
  title: string;
  status: 'CONFIRMED' | 'TENTATIVE' | 'COMPLETED';
  date: string;
  time: string;
  location: string;
  priority?: boolean;
  syncing?: boolean;
  participants?: string[];
  /** Centralized employee IDs from `employeesSlice` — preferred over free-text names. */
  participantIds?: string[];
  description?: string;
  link?: string;
  agendaItems?: string[];
}

interface MeetingCardProps {
  meeting: MeetingData;
  onViewAgenda: (meeting: MeetingData) => void;
  onDelete?: (id: string) => void;
  onEdit?: (meeting: MeetingData) => void;
  onChangeStatus?: (id: string, newStatus: 'CONFIRMED' | 'TENTATIVE' | 'COMPLETED') => void;
}

export function MeetingCard({ meeting, onViewAgenda, onDelete, onEdit, onChangeStatus }: MeetingCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { items: employees } = useEmployees();
  const open = Boolean(anchorEl);

  const displayParticipants = (() => {
    if (meeting.participantIds?.length) {
      return meeting.participantIds.map((id) => {
        const emp = employees.find((e) => e.id === id);
        return emp ? `${emp.firstName} ${emp.lastName}` : id;
      });
    }
    return participantLabels(meeting.participants, employees);
  })();

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    if (onEdit) onEdit(meeting);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    if (onDelete) onDelete(meeting.id);
  };

  const handleChangeStatusClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    if (onChangeStatus) onChangeStatus(meeting.id, 'COMPLETED');
  };

  // Determine chip color
  const getChipStyle = () => {
    switch (meeting.status) {
      case 'CONFIRMED':
        return {
          label: 'CONFIRMED',
          bg: (theme: any) =>
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.primary.main, 0.15)
              : 'rgba(21, 101, 192, 0.08)',
          color: (theme: any) =>
            theme.palette.mode === 'dark' ? theme.palette.primary.light : '#1565C0',
        };
      case 'TENTATIVE':
        return {
          label: 'TENTATIVE',
          bg: (theme: any) =>
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.text.secondary, 0.1)
              : 'rgba(95, 107, 122, 0.08)',
          color: (theme: any) =>
            theme.palette.mode === 'dark' ? theme.palette.text.secondary : '#5F6B7A',
        };
      case 'COMPLETED':
        return {
          label: 'COMPLETED',
          bg: (theme: any) =>
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.success.main, 0.15)
              : 'rgba(46, 125, 50, 0.08)',
          color: (theme: any) =>
            theme.palette.mode === 'dark' ? theme.palette.success.main : '#2E7D32',
        };
      default:
        return {
          label: 'PENDING',
          bg: 'rgba(0, 0, 0, 0.05)',
          color: 'text.secondary',
        };
    }
  };

  const chipStyle = getChipStyle();
  const isVirtual = meeting.location.toLowerCase().includes('virtual') || meeting.location.toLowerCase().includes('online') || meeting.location.toLowerCase().includes('video');

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        bgcolor: 'background.paper',
        cursor: 'default',
        '&:hover': {
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 6px 20px rgba(0, 0, 0, 0.3)'
              : '0 6px 20px rgba(26, 35, 50, 0.08)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header: Chip and Menu */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Chip
            label={chipStyle.label}
            size="small"
            sx={{
              bgcolor: chipStyle.bg,
              color: chipStyle.color,
              fontWeight: 700,
              fontSize: '0.7rem',
              borderRadius: '6px',
              px: 0.5,
              height: 24,
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleMenuOpen(e);
            }}
            aria-label="meeting actions"
            sx={{ color: 'text.secondary' }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 2.5,
            lineHeight: 1.3,
            fontSize: '1.15rem',
          }}
        >
          {meeting.title}
        </Typography>

        {/* Date and Location List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3, flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CalendarTodayOutlinedIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {meeting.date} &bull; {meeting.time}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {isVirtual ? (
              <VideocamOutlinedIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} />
            ) : (
              <RoomOutlinedIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} />
            )}
            {meeting.link ? (
              <Link
                onClick={(e) => e.stopPropagation()}
                href={meeting.link.startsWith('http') ? meeting.link : `https://${meeting.link}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {meeting.location}
              </Link>
            ) : (
              <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>
                {meeting.location}
              </Typography>
            )}
          </Box>

          {meeting.syncing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? '#9AA8BC' : '#5F6B7A',
                  opacity: 0.5,
                  animation: 'pulse 1.5s infinite ease-in-out',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(0.8)', opacity: 0.3 },
                    '50%': { transform: 'scale(1.2)', opacity: 0.8 },
                    '100%': { transform: 'scale(0.8)', opacity: 0.3 },
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap>
                Syncing Documents...
              </Typography>
            </Box>
          )}

          {meeting.priority && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              <ErrorOutlineIcon color="error" sx={{ fontSize: '1.15rem' }} />
              <Typography variant="body2" color="error.main" fontWeight={700} sx={{ fontSize: '0.75rem' }}>
                Priority Item
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Footer Area: Info/Avatars + View Agenda button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Footer Left Details: Always show participant avatars */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, mr: 1 }}>
            <AvatarGroup
              max={3}
              slotProps={{
                additionalAvatar: {
                  sx: {
                    width: 28,
                    height: 28,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              {(displayParticipants.length > 0 ? displayParticipants : ['—']).map((name, index) => (
                <Avatar
                  key={index}
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    bgcolor: (theme) => {
                      const colors = ['#E57373', '#81C784', '#64B5F6', '#FFB74D', '#BA68C8'];
                      return colors[index % colors.length];
                    },
                  }}
                >
                  {name.split(' ').map((n) => n[0]).join('')}
                </Avatar>
              ))}
            </AvatarGroup>
          </Box>

          {/* Action Button: View Agenda */}
          <Button
            variant="outlined"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              onViewAgenda(meeting);
            }}
            sx={{
              borderRadius: '20px',
              px: 2.5,
              py: 0.75,
              fontSize: '0.8rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              textTransform: 'none',
              borderColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? alpha(theme.palette.primary.main, 0.4)
                  : 'rgba(21, 101, 192, 0.4)',
              color: (theme) =>
                theme.palette.mode === 'dark' ? theme.palette.primary.light : '#1565C0',
              '&:hover': {
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? theme.palette.primary.main : '#0D47A1',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.primary.main, 0.08)
                    : 'rgba(21, 101, 192, 0.04)',
              },
            }}
          >
            View Agenda
          </Button>
        </Box>
      </CardContent>

      {/* Card context actions menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        slotProps={{
          paper: {
            sx: { minWidth: 150, borderRadius: 2, mt: 0.5 },
          },
        }}
      >
        {onEdit && (
          <MenuItem onClick={handleEditClick}>
            <ListItemIcon>
              <EditOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit Meeting" />
          </MenuItem>
        )}
        {meeting.status !== 'COMPLETED' && onChangeStatus && (
          <MenuItem onClick={handleChangeStatusClick}>
            <ListItemIcon>
              <SwapHorizIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Completed" />
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete" />
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}
