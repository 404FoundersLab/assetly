import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  Button,
  Grid,
  TextField,
  IconButton,
  Avatar,
  Paper,
  alpha,
  Divider,
  Switch,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import AddIcon from '@mui/icons-material/Add';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { MeetingData } from './MeetingCard';

// Convert "October 24, 2024" + "09:00 AM" → "2024-10-24T09:00" for input[type=datetime-local]
const toDateTimeLocal = (dateStr: string, timeStr: string): string => {
  try {
    const parsedDate = Date.parse(dateStr);
    if (isNaN(parsedDate)) return '';
    const d = new Date(parsedDate);
    const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if (m[3].toUpperCase() === 'PM' && h < 12) h += 12;
      if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
      d.setHours(h, min);
    }
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

// Parse "2024-10-24T09:00" → { date: "October 24, 2024", time: "09:00 AM" }
const fromDateTimeLocal = (val: string) => {
  if (!val) return { date: '', time: '' };
  try {
    const d = new Date(val);
    const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    let h = d.getHours();
    const min = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return { date, time: `${h.toString().padStart(2, '0')}:${min} ${ampm}` };
  } catch {
    return { date: '', time: '' };
  }
};

interface UpcomingMeetingDetailsModalProps {
  open: boolean;
  onClose: () => void;
  meeting: MeetingData | null;
  onSave: (meeting: MeetingData) => void;
  onStatusChange?: (id: string, newStatus: 'CONFIRMED' | 'TENTATIVE' | 'COMPLETED') => void;
}

export function UpcomingMeetingDetailsModal({
  open,
  onClose,
  meeting,
  onSave,
  onStatusChange,
}: UpcomingMeetingDetailsModalProps) {
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState(''); // ISO string for date+time pickers
  const [location, setLocation] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [agendaItems, setAgendaItems] = useState<string[]>([]);
  const [showAddAgenda, setShowAddAgenda] = useState(false);
  const [newAgendaText, setNewAgendaText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<{ name: string; role: string; status: string }[]>([]);

  const [showInviteInput, setShowInviteInput] = useState(false);
  const [newInviteeName, setNewInviteeName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file) => {
        let sizeText = '';
        if (file.size < 1024 * 1024) {
          sizeText = `${(file.size / 1024).toFixed(1)} KB`;
        } else {
          sizeText = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        }
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const type = ['pdf', 'docx'].includes(extension) ? extension : 'other';
        return {
          name: file.name,
          size: sizeText,
          updated: 'Just now',
          type,
        };
      });
      setFiles((prev) => [...prev, ...newFiles]);
    }
    // Reset so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [files, setFiles] = useState([
    { name: 'Q3_Performance_Report.pdf', size: '2.4 MB', updated: 'Updated 2 days ago', type: 'pdf' },
    { name: '2024_Strategic_Goals.docx', size: '1.1 MB', updated: 'Updated yesterday', type: 'docx' },
  ]);

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      setDateTime(toDateTimeLocal(meeting.date, meeting.time));
      setLocation(meeting.location);
      const virtual =
        meeting.location.toLowerCase().includes('virtual') ||
        meeting.location.toLowerCase().includes('zoom') ||
        meeting.location.toLowerCase().includes('online') ||
        meeting.location.toLowerCase().includes('video');
      setIsVirtual(virtual);
      setMeetingLink(meeting.link || '');
      setAgendaItems(
        meeting.agendaItems && meeting.agendaItems.length > 0
          ? meeting.agendaItems
          : meeting.participants && meeting.participants.length > 0
          ? [
              'Q3 Performance Recap & Key Learnings',
              'Q4 Strategic Roadmap & Resource Allocation',
              'Risk Assessment & Mitigation Strategies',
            ]
          : ['Q3 Performance Recap & Key Learnings', 'Q4 Strategic Roadmap & Resource Allocation']
      );
      // Seed attendees from meeting participants
      const defaultStatus = meeting.status === 'COMPLETED' ? 'Present' : 'Yes';
      const roles = ['Chairperson', 'Legal Counsel', 'CFO', 'CTO', 'VP Operations'];
      const participants = meeting.participants && meeting.participants.length > 0
        ? meeting.participants
        : ['Sarah Jenkins', 'Marcus Halloway', 'David Chen'];
      setAttendees(
        participants.map((name, i) => ({
          name,
          role: roles[i % roles.length],
          status: defaultStatus,
        }))
      );
      setShowInviteInput(false);
      setNewInviteeName('');
      setLastSaved(null);
    }
  // Only reset when a DIFFERENT meeting is opened, not on every re-open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting?.id]);

  if (!meeting) return null;

  const handleMarkAsCompleted = () => {
    if (onStatusChange) {
      onStatusChange(meeting.id, 'COMPLETED');
    }
    onClose();
  };

  const handleSaveChanges = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSaved(timeStr);
    const { date, time } = fromDateTimeLocal(dateTime);
    onSave({
      ...meeting,
      title,
      date,
      time,
      location,
      agendaItems,
      link: isVirtual ? meetingLink : undefined,
    });
    onClose();
  };

  const handleConfirmAgendaItem = () => {
    const trimmed = newAgendaText.trim();
    if (trimmed) {
      setAgendaItems((prev) => [...prev, trimmed]);
    }
    setNewAgendaText('');
    setShowAddAgenda(false);
  };

  const handleCancelAgendaItem = () => {
    setNewAgendaText('');
    setShowAddAgenda(false);
  };

  const inputFieldStyle = {
    mt: 1,
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      bgcolor: (theme: any) => theme.palette.mode === 'dark' ? '#1E293B' : '#F8FAFC',
      '& fieldset': {
        borderColor: (theme: any) => theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0',
      },
      '&:hover fieldset': {
        borderColor: (theme: any) => theme.palette.mode === 'dark' ? '#475569' : '#CBD5E1',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'primary.main',
      },
    },
  };

  const labelStyle = {
    fontWeight: 700,
    fontSize: '0.75rem',
    color: 'text.secondary',
  };

  const sectionCardStyle = {
    p: 3,
    borderRadius: 3,
    border: '1px solid',
    borderColor: (theme: any) => theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0',
    bgcolor: 'background.paper',
    boxShadow: 'none',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0B0F14' : '#F8FAFC',
            backgroundImage: 'none',
          },
        },
      }}
    >
      {/* Close button top right */}
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          color: 'text.secondary',
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
          '&:hover': { bgcolor: 'action.hover' },
          zIndex: 10,
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ p: { xs: 3, md: 5 } }}>
        {/* Top Header Row */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Chip
              label="Upcoming"
              size="small"
              icon={
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    ml: 1,
                  }}
                />
              }
              sx={{
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(21, 101, 192, 0.15)' : 'rgba(21, 101, 192, 0.08)',
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.65rem',
                borderRadius: '4px',
                '& .MuiChip-icon': { ml: 0.5, mr: -0.5 },
              }}
            />
            <Chip
              label={`Scheduled for ${fromDateTimeLocal(dateTime).date || meeting.date}`}
              size="small"
              sx={{
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1E293B' : '#E2E8F0',
                color: 'text.secondary',
                fontWeight: 700,
                fontSize: '0.65rem',
                borderRadius: '4px',
              }}
            />
          </Box>

           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
              {title}
            </Typography>
          </Box>
        </Box>

        {/* Layout Grid */}
        <Grid container spacing={4}>
          {/* Left Column (Meeting Details & Agenda Items) */}
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Meeting Details Card */}
              <Paper sx={sectionCardStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <InfoOutlinedIcon sx={{ color: '#0D47A1' }} />
                    <Typography variant="h6" fontWeight={800}>
                      Meeting Details
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Meeting ID: #REV-2024-Q4
                  </Typography>
                </Box>

                <Grid container spacing={2.5}>
                  {/* Meeting Title Input */}
                  <Grid item xs={12}>
                    <Typography sx={labelStyle}>Meeting Title</Typography>
                    <TextField
                      fullWidth
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      sx={inputFieldStyle}
                    />
                  </Grid>

                  {/* Date Picker */}
                  <Grid item xs={12} sm={6}>
                    <Typography sx={labelStyle}>Date</Typography>
                    <TextField
                      fullWidth
                      type="date"
                      value={dateTime ? dateTime.slice(0, 10) : ''}
                      onChange={(e) => {
                        const timePart = dateTime ? dateTime.slice(11, 16) : '09:00';
                        setDateTime(e.target.value ? `${e.target.value}T${timePart}` : '');
                      }}
                      InputProps={{
                        startAdornment: (
                          <CalendarTodayOutlinedIcon
                            sx={{ color: 'primary.main', fontSize: '1.1rem', mr: 1 }}
                          />
                        ),
                      }}
                      sx={{
                        ...inputFieldStyle,
                        '& input[type="date"]::-webkit-calendar-picker-indicator': {
                          opacity: 0.6,
                          cursor: 'pointer',
                        },
                      }}
                    />
                  </Grid>

                  {/* Time Picker */}
                  <Grid item xs={12} sm={6}>
                    <Typography sx={labelStyle}>Time</Typography>
                    <TextField
                      fullWidth
                      type="time"
                      value={dateTime ? dateTime.slice(11, 16) : ''}
                      onChange={(e) => {
                        const datePart = dateTime ? dateTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
                        setDateTime(e.target.value ? `${datePart}T${e.target.value}` : '');
                      }}
                      InputProps={{
                        startAdornment: (
                          <AccessTimeOutlinedIcon
                            sx={{ color: 'primary.main', fontSize: '1.1rem', mr: 1 }}
                          />
                        ),
                      }}
                      sx={{
                        ...inputFieldStyle,
                        '& input[type="time"]::-webkit-calendar-picker-indicator': {
                          opacity: 0.6,
                          cursor: 'pointer',
                        },
                      }}
                    />
                  </Grid>

                  {/* Location Input */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
                      <Typography sx={labelStyle}>Location</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: isVirtual ? 'primary.main' : 'text.secondary',
                            fontSize: '0.68rem',
                            letterSpacing: '0.05em',
                            transition: 'color 0.2s',
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
                              setMeetingLink('');
                            }
                          }}
                        />
                      </Box>
                    </Box>
                    <TextField
                      fullWidth
                      placeholder={isVirtual ? 'Virtual Video Conference' : 'e.g. Main Boardroom'}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      InputProps={{
                        endAdornment: isVirtual ? (
                          <VideocamOutlinedIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                        ) : (
                          <RoomOutlinedIcon sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                        ),
                      }}
                      sx={inputFieldStyle}
                    />
                  </Grid>

                  {/* Meeting Link (Virtual only) */}
                  {isVirtual && (
                    <Grid item xs={12}>
                      <Typography sx={labelStyle}>Meeting Link</Typography>
                      <TextField
                        fullWidth
                        placeholder="e.g. https://zoom.us/j/1234567890"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <VideocamOutlinedIcon
                              sx={{ color: 'primary.main', fontSize: '1.1rem', mr: 1 }}
                            />
                          ),
                        }}
                        sx={inputFieldStyle}
                      />
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Agenda Items Card */}
              <Paper sx={sectionCardStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ListAltIcon sx={{ color: '#0D47A1' }} />
                    <Typography variant="h6" fontWeight={800}>
                      Agenda Items
                    </Typography>
                  </Box>
                  {!showAddAgenda && (
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setShowAddAgenda(true)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        color: 'primary.main',
                        p: 0,
                        '&:hover': { bgcolor: 'transparent' },
                      }}
                    >
                      Add Item
                    </Button>
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {agendaItems.map((item, index) => (
                    <Box
                      key={index}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      sx={{
                        p: editingIndex === index ? 1.5 : 2,
                        borderRadius: 2.5,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                        border: '1px solid',
                        borderColor: editingIndex === index
                          ? 'primary.main'
                          : (theme) => theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <Chip
                        label={String(index + 1).padStart(2, '0')}
                        size="small"
                        sx={{
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0F172A' : '#E2E8F0',
                          color: 'text.secondary',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          height: 22,
                          flexShrink: 0,
                        }}
                      />

                      {editingIndex === index ? (
                        /* ── Inline edit mode ── */
                        <>
                          <TextField
                            autoFocus
                            fullWidth
                            size="small"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const trimmed = editingText.trim();
                                if (trimmed) {
                                  setAgendaItems((prev) =>
                                    prev.map((it, i) => (i === index ? trimmed : it))
                                  );
                                }
                                setEditingIndex(null);
                                setEditingText('');
                              }
                              if (e.key === 'Escape') {
                                setEditingIndex(null);
                                setEditingText('');
                              }
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                bgcolor: (theme) =>
                                  theme.palette.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                                '& fieldset': { borderColor: 'primary.main' },
                                '&:hover fieldset': { borderColor: 'primary.dark' },
                                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                              },
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => {
                              const trimmed = editingText.trim();
                              if (trimmed) {
                                setAgendaItems((prev) =>
                                  prev.map((it, i) => (i === index ? trimmed : it))
                                );
                              }
                              setEditingIndex(null);
                              setEditingText('');
                            }}
                            sx={{
                              bgcolor: '#0D47A1',
                              color: '#fff',
                              borderRadius: '8px',
                              flexShrink: 0,
                              '&:hover': { bgcolor: '#0A192F' },
                            }}
                          >
                            <CheckCircleOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingIndex(null);
                              setEditingText('');
                            }}
                            sx={{
                              bgcolor: (theme) =>
                                theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0',
                              color: 'text.secondary',
                              borderRadius: '8px',
                              flexShrink: 0,
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </>
                      ) : (
                        /* ── Read mode ── */
                        <>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ color: 'text.primary', flex: 1 }}
                          >
                            {item}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditingText(item);
                            }}
                            sx={{
                              opacity: hoveredIndex === index ? 1 : 0,
                              transition: 'opacity 0.18s ease',
                              color: 'text.secondary',
                              borderRadius: '8px',
                              flexShrink: 0,
                              '&:hover': {
                                color: 'primary.main',
                                bgcolor: (theme) =>
                                  alpha(theme.palette.primary.main, 0.08),
                              },
                            }}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  ))}
                </Box>

                {/* Inline Add Agenda Input */}
                {showAddAgenda && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2.5,
                      border: '1.5px dashed',
                      borderColor: 'primary.main',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(13,71,161,0.08)'
                          : 'rgba(13,71,161,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <TextField
                      autoFocus
                      fullWidth
                      size="small"
                      placeholder="Type agenda item and press ✓ to add…"
                      value={newAgendaText}
                      onChange={(e) => setNewAgendaText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmAgendaItem();
                        if (e.key === 'Escape') handleCancelAgendaItem();
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                          '& fieldset': {
                            borderColor: 'primary.main',
                          },
                          '&:hover fieldset': { borderColor: 'primary.dark' },
                          '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                        },
                      }}
                    />
                    <IconButton
                      onClick={handleConfirmAgendaItem}
                      size="small"
                      sx={{
                        bgcolor: '#0D47A1',
                        color: '#fff',
                        borderRadius: '8px',
                        '&:hover': { bgcolor: '#0A192F' },
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircleOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={handleCancelAgendaItem}
                      size="small"
                      sx={{
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0',
                        color: 'text.secondary',
                        borderRadius: '8px',
                        '&:hover': { bgcolor: 'action.hover' },
                        flexShrink: 0,
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Paper>
            </Box>
          </Grid>

          {/* Right Column (Attendees & Attachments) */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Attendees Card */}
              <Paper sx={sectionCardStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Attendees
                  </Typography>
                  <Chip
                    label={`${attendees.length} INVITEE${attendees.length !== 1 ? 'S' : ''}`}
                    size="small"
                    sx={{
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
                      fontWeight: 700,
                      fontSize: '0.62rem',
                    }}
                  />
                </Box>

                {/* Attendee list */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
                  {attendees.map((attendee, idx) => {
                    const isCompleted = meeting.status === 'COMPLETED';
                    // For upcoming: Yes / No  |  For completed: Present / Absent
                    const positiveStatus = isCompleted ? 'Present' : 'Yes';
                    const negativeStatus = isCompleted ? 'Absent' : 'No';
                    const isPositive = attendee.status === positiveStatus;
                    const toggleStatus = () =>
                      setAttendees((prev) =>
                        prev.map((a, i) =>
                          i === idx
                            ? { ...a, status: isPositive ? negativeStatus : positiveStatus }
                            : a
                        )
                      );
                    return (
                      <Box
                        key={attendee.name}
                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              bgcolor: 'primary.light',
                            }}
                          >
                            {attendee.name.split(' ').map((n) => n[0]).join('')}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                              {attendee.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {attendee.role}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Clickable status badge */}
                        <Chip
                          label={attendee.status}
                          size="small"
                          onClick={toggleStatus}
                          sx={{
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            borderRadius: '6px',
                            height: 22,
                            bgcolor: isPositive
                              ? (theme) => alpha(theme.palette.success.main, 0.12)
                              : (theme) => alpha(theme.palette.error.main, 0.10),
                            color: isPositive ? 'success.main' : 'error.main',
                            border: '1px solid',
                            borderColor: isPositive
                              ? (theme) => alpha(theme.palette.success.main, 0.3)
                              : (theme) => alpha(theme.palette.error.main, 0.25),
                            '&:hover': {
                              bgcolor: isPositive
                                ? (theme) => alpha(theme.palette.success.main, 0.2)
                                : (theme) => alpha(theme.palette.error.main, 0.18),
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>

                {/* Inline invite input */}
                {showInviteInput && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 2,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1.5px dashed',
                      borderColor: 'primary.main',
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    }}
                  >
                    <PersonAddOutlinedIcon sx={{ color: 'primary.main', fontSize: '1.1rem', flexShrink: 0 }} />
                    <TextField
                      autoFocus
                      fullWidth
                      size="small"
                      placeholder="Full name… (press Enter to add)"
                      value={newInviteeName}
                      onChange={(e) => setNewInviteeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const name = newInviteeName.trim();
                          if (name) {
                            const defaultStatus = meeting.status === 'COMPLETED' ? 'Present' : 'Yes';
                            setAttendees((prev) => [...prev, { name, role: 'Invitee', status: defaultStatus }]);
                          }
                          setNewInviteeName('');
                          setShowInviteInput(false);
                        }
                        if (e.key === 'Escape') {
                          setNewInviteeName('');
                          setShowInviteInput(false);
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          '& fieldset': { borderColor: 'primary.main' },
                          '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                        },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => {
                        const name = newInviteeName.trim();
                        if (name) {
                          const defaultStatus = meeting.status === 'COMPLETED' ? 'Present' : 'Yes';
                          setAttendees((prev) => [...prev, { name, role: 'Invitee', status: defaultStatus }]);
                        }
                        setNewInviteeName('');
                        setShowInviteInput(false);
                      }}
                      sx={{
                        bgcolor: '#0D47A1', color: '#fff', borderRadius: '8px', flexShrink: 0,
                        '&:hover': { bgcolor: '#0A192F' },
                      }}
                    >
                      <CheckCircleOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => { setNewInviteeName(''); setShowInviteInput(false); }}
                      sx={{
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0',
                        color: 'text.secondary', borderRadius: '8px', flexShrink: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PersonAddOutlinedIcon />}
                  onClick={() => setShowInviteInput((v) => !v)}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? '#334155' : '#CBD5E1',
                    color: 'text.primary',
                    fontWeight: 700,
                    '&:hover': { borderColor: 'text.primary', bgcolor: 'action.hover' },
                  }}
                >
                  {showInviteInput ? 'Cancel' : 'Add Invitee'}
                </Button>
              </Paper>

              {/* Attachments Card */}
              <Paper sx={sectionCardStyle}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2.5 }}>
                  Attachments
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3.5 }}>
                  {files.map((file, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1E293B' : '#F1F5F9',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box
                        sx={{
                          bgcolor: file.type === 'pdf' ? 'error.main' : 'primary.main',
                          borderRadius: 1,
                          p: 0.75,
                          display: 'flex',
                          color: '#FFFFFF',
                        }}
                      >
                        <InsertDriveFileIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary' }}
                        >
                          {file.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                          {file.size} - {file.updated}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                        sx={{
                          color: 'text.secondary',
                          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                          '&:hover': {
                            color: 'error.main',
                            bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                          },
                          flexShrink: 0,
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>

                {/* Dashed upload box */}
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '1px dashed',
                    borderColor: 'primary.main',
                    borderRadius: 2.5,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  <input
                    type="file"
                    multiple
                    hidden
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.xlsx"
                  />
                  <CloudUploadOutlinedIcon sx={{ color: 'primary.main', fontSize: '1.75rem', mb: 1 }} />
                  <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary', mb: 0.5 }}>
                    Drop files here to upload
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    PDF, DOCX, XLSX (Max 50MB)
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />

      {/* Dialog Actions Footer */}
      <DialogActions sx={{ px: { xs: 3, md: 5 }, py: 2.5, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: lastSaved ? 'success.main' : 'text.secondary' }}>
          <CloudDoneOutlinedIcon fontSize="small" />
          <Typography variant="caption" fontWeight={600}>
            {lastSaved ? `Changes saved at ${lastSaved}` : 'Unsaved changes'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={onClose}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              color: 'text.secondary',
              px: 3,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={handleSaveChanges}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: '#0D47A1',
              color: '#0D47A1',
              fontWeight: 700,
              px: 3.5,
              '&:hover': { bgcolor: 'rgba(13, 71, 161, 0.06)', borderColor: '#0A192F' },
            }}
          >
            Save Changes
          </Button>
          <Button
            variant="contained"
            onClick={handleMarkAsCompleted}
            startIcon={<CheckCircleOutlinedIcon />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              bgcolor: '#0D47A1',
              color: '#FFFFFF',
              fontWeight: 700,
              px: 3.5,
              '&:hover': { bgcolor: '#0A192F' },
            }}
          >
            Mark as Completed
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
