import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  Switch,
  IconButton,
  Divider,
  alpha,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { EmployeeMultiSelect } from '../../../../components/EmployeeMultiSelect';
import { useEmployees } from '../../../../hooks/useEmployees';
import { getEmployeeName } from '../../../../utils/format';
import { MeetingData } from './MeetingCard';

interface NewMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (meeting: Omit<MeetingData, 'id'> & { id?: string }) => void;
  editMeeting?: MeetingData | null;
}

// Convert "October 24, 2024" and "09:00 AM" to "2024-10-24T09:00" for datetime-local value
const convertToDateTimeLocal = (dateStr: string, timeStr: string) => {
  try {
    const parsedDate = Date.parse(dateStr);
    if (isNaN(parsedDate)) return '';
    const dateObj = new Date(parsedDate);
    
    const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeParts) {
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const ampm = timeParts[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      dateObj.setHours(hours, minutes);
    }
    
    const tzoffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  } catch (e) {
    return '';
  }
};

// Convert "2024-10-24T09:00" to readable { date: "October 24, 2024", time: "09:00 AM" }
const parseDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return { date: 'October 29, 2024', time: '10:00 AM' };
  try {
    const dateObj = new Date(dateTimeStr);
    const optionsDate: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    const dateFormatted = dateObj.toLocaleDateString('en-US', optionsDate);
    
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    
    return { date: dateFormatted, time: timeFormatted };
  } catch (e) {
    return { date: 'October 29, 2024', time: '10:00 AM' };
  }
};

export function NewMeetingModal({ open, onClose, onSave, editMeeting }: NewMeetingModalProps) {
  const { items: employees } = useEmployees();
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [agendaItems, setAgendaItems] = useState<string[]>(['']);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'CONFIRMED' | 'TENTATIVE' | 'COMPLETED'>('CONFIRMED');
  const [link, setLink] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editMeeting) {
      setTitle(editMeeting.title);
      setStatus(editMeeting.status);
      setDateTime(convertToDateTimeLocal(editMeeting.date, editMeeting.time));
      setLocation(editMeeting.location);
      setIsVirtual(
        editMeeting.location.toLowerCase().includes('virtual') ||
        editMeeting.location.toLowerCase().includes('zoom') ||
        editMeeting.location.toLowerCase().includes('online')
      );
      setLink(editMeeting.link || '');
      setAgendaItems(['Item 1: Financial Overview']); // default mock agenda items
      if (editMeeting.participantIds?.length) {
        setAttendeeIds(editMeeting.participantIds);
      } else {
        const resolved = (editMeeting.participants ?? [])
          .map((p) => employees.find((e) => e.id === p || getEmployeeName(e.firstName, e.lastName) === p)?.id)
          .filter((id): id is string => Boolean(id));
        setAttendeeIds(resolved);
      }
    } else {
      setTitle('');
      setStatus('CONFIRMED');
      // Set to current date-time
      const now = new Date();
      const tzoffset = now.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
      setDateTime(localISOTime);
      setLocation('');
      setLink('');
      setIsVirtual(false);
      setAgendaItems(['']);
      setAttendeeIds([]);
    }
    setErrors({});
  }, [editMeeting, open, employees]);

  const handleAddAgendaItem = () => {
    setAgendaItems((prev) => [...prev, '']);
  };

  const handleRemoveAgendaItem = (index: number) => {
    if (agendaItems.length === 1) {
      setAgendaItems(['']);
      return;
    }
    setAgendaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAgendaItemChange = (index: number, val: string) => {
    setAgendaItems((prev) => prev.map((item, i) => (i === index ? val : item)));
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!dateTime.trim()) newErrors.dateTime = 'Date and time are required';
    if (!location.trim()) newErrors.location = 'Location is required';
    if (isVirtual && !link.trim()) newErrors.link = 'Meeting link is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const { date, time } = parseDateTime(dateTime);

    const participantNames = attendeeIds
      .map((id) => {
        const emp = employees.find((e) => e.id === id);
        return emp ? getEmployeeName(emp.firstName, emp.lastName) : undefined;
      })
      .filter((n): n is string => Boolean(n));

    onSave({
      id: editMeeting?.id,
      title,
      status: editMeeting?.status || status,
      date,
      time,
      location,
      link: isVirtual ? link : undefined,
      participantIds: attendeeIds.length > 0 ? attendeeIds : undefined,
      participants: participantNames.length > 0 ? participantNames : undefined,
      syncing: editMeeting?.syncing || false,
      priority: editMeeting?.priority || false,
    });

    onClose();
  };

  // Styled helper for text fields to match the image
  const inputFieldStyle = {
    mt: 0.5,
    '& .MuiOutlinedInput-root': {
      bgcolor: (theme: any) => (theme.palette.mode === 'dark' ? '#1E293B' : '#F1F5F9'),
      borderRadius: '8px',
      border: '1px solid',
      borderColor: (theme: any) => (theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0'),
      transition: 'all 0.2s ease',
      '& fieldset': { border: 'none' },
      '&:hover': {
        borderColor: (theme: any) => (theme.palette.mode === 'dark' ? '#475569' : '#CBD5E1'),
      },
      '&.Mui-focused': {
        borderColor: 'primary.main',
        boxShadow: (theme: any) => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`,
        bgcolor: (theme: any) => (theme.palette.mode === 'dark' ? '#1E293B' : '#FFFFFF'),
      },
    },
    '& .MuiInputBase-input::placeholder': {
      color: (theme: any) => (theme.palette.mode === 'dark' ? '#64748B' : '#94A3B8'),
      opacity: 1,
    },
  };

  const labelStyle = {
    fontWeight: 800,
    color: (theme: any) => (theme.palette.mode === 'dark' ? '#94A3B8' : '#475569'),
    letterSpacing: '0.08em',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            p: { xs: 2, sm: 3 },
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 1, overflowY: 'visible' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {/* Meeting Title Section */}
          <Box>
            <Typography variant="caption" sx={labelStyle}>
              Meeting Title
            </Typography>
            <TextField
              fullWidth
              placeholder="e.g. Q4 Strategic Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={Boolean(errors.title)}
              helperText={errors.title}
              sx={inputFieldStyle}
            />
          </Box>

          {/* Date/Time and Location Section */}
          <Grid container spacing={3}>
            {/* Date & Time */}
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={labelStyle}>
                Date & Time
              </Typography>
              <TextField
                type="datetime-local"
                fullWidth
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                error={Boolean(errors.dateTime)}
                helperText={errors.dateTime}
                InputProps={{
                  startAdornment: (
                    <CalendarTodayOutlinedIcon
                      sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }}
                    />
                  ),
                }}
                sx={inputFieldStyle}
              />
            </Grid>

            {/* Location */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={labelStyle}>
                  Location
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: 'text.secondary',
                      fontSize: '0.62rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    VIRTUAL
                  </Typography>
                  <Switch
                    size="small"
                    checked={isVirtual}
                    onChange={(e) => {
                      setIsVirtual(e.target.checked);
                      if (e.target.checked) {
                        setLocation('Virtual Video Conference');
                      } else {
                        setLocation('');
                      }
                    }}
                  />
                </Box>
              </Box>
              <TextField
                fullWidth
                placeholder={isVirtual ? 'Virtual Video Conference Link' : 'Conference Room A'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                error={Boolean(errors.location)}
                helperText={errors.location}
                InputProps={{
                  startAdornment: isVirtual ? (
                    <VideocamOutlinedIcon
                      sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }}
                    />
                  ) : (
                    <RoomOutlinedIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />
                  ),
                }}
                sx={inputFieldStyle}
              />
            </Grid>

            {/* Virtual Meeting Link */}
            {isVirtual && (
              <Grid item xs={12}>
                <Typography variant="caption" sx={labelStyle}>
                  Meeting Link
                </Typography>
                <TextField
                  fullWidth
                  placeholder="e.g. https://zoom.us/j/1234567890"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  error={Boolean(errors.link)}
                  helperText={errors.link}
                  InputProps={{
                    startAdornment: (
                      <VideocamOutlinedIcon
                        sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }}
                      />
                    ),
                  }}
                  sx={inputFieldStyle}
                />
              </Grid>
            )}
          </Grid>

          {/* Agenda Items Section */}
          <Box>
            <Typography variant="caption" sx={labelStyle}>
              Agenda Items
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
              {agendaItems.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TextField
                    fullWidth
                    placeholder={`Item ${index + 1}: Financial Overview`}
                    value={item}
                    onChange={(e) => handleAgendaItemChange(index, e.target.value)}
                    sx={inputFieldStyle}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveAgendaItem(index)}
                    sx={{
                      color: 'text.secondary',
                      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                      '&:hover': {
                        color: 'error.main',
                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                      },
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
            <Button
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleAddAgendaItem}
              sx={{
                color: (theme) => (theme.palette.mode === 'dark' ? '#8BB4FF' : '#1565C0'),
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                p: 0,
                mt: 1.5,
                minWidth: 0,
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
              }}
            >
              Add Agenda Item
            </Button>
          </Box>

          {/* Add Attendees — from centralized employee directory */}
          <Box>
            <Typography variant="caption" sx={labelStyle}>
              Attendees
            </Typography>
            <EmployeeMultiSelect
              value={attendeeIds}
              onChange={setAttendeeIds}
              label="Select employees"
              helperText="Pulled from Employees module (same data as Assets assignments)"
            />
          </Box>
        </Box>

        <Divider sx={{ mt: 4, mb: 3, borderColor: (theme) => theme.palette.divider }} />

        {/* Footer Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            onClick={onClose}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              fontSize: '0.9rem',
              borderRadius: '8px',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#1E88E5' : '#0D47A1'),
              color: '#FFFFFF',
              borderRadius: '8px',
              px: 3.5,
              py: 1.25,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.9rem',
              '&:hover': {
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#1565C0' : '#0A192F'),
              },
            }}
          >
            {editMeeting ? 'Save Changes' : 'Create Meeting'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
