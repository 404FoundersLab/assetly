import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  Grid,
  Checkbox,
  Avatar,
  AvatarGroup,
  Divider,
  Paper,
  alpha,
  IconButton,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import GetAppOutlinedIcon from '@mui/icons-material/GetAppOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import AttachmentIcon from '@mui/icons-material/Attachment';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { MeetingData } from './modal/MeetingCard';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'color': [] }, { 'background': [] }],
    ['blockquote', 'code-block'],
    ['clean']
  ]
};

export function CompletedReportPage() {
  const locationState = useLocation();
  const navigate = useNavigate();
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryHtml, setSummaryHtml] = useState(`
    <div style="font-size: 0.875rem;">
      <p style="font-style: italic; margin-bottom: 16px; font-weight: 600;">
        Summary: <span style="font-weight: 400;">The board convened to evaluate Q3 performance and set the trajectory for Q4. Primary focus was placed on the EMEA expansion progress.</span>
      </p>
      <p style="font-weight: 700; margin-bottom: 12px;">Key Discussion Points:</p>
      <ul style="padding-left: 24px; margin-bottom: 24px; color: #475569;">
        <li style="margin-bottom: 8px;">EMEA revenue exceeded projections by 14%, largely driven by the Enterprise segment.</li>
        <li style="margin-bottom: 8px;">Concerns raised regarding the churn rate in small to medium business tiers.</li>
        <li style="margin-bottom: 8px;">The CTO presented a roadmap for the transition to a headless CMS architecture by Q2 next year.</li>
      </ul>
    </div>
  `);

  // Fallback default completed meeting details if accessed directly
  const defaultMeeting: MeetingData = {
    id: 'meet-completed-default',
    title: 'Q4 Strategic Review',
    status: 'COMPLETED',
    date: 'October 24, 2024',
    time: '09:00 AM',
    location: 'Main Boardroom (Executive Wing)',
    participants: ['Jameson Davies', 'Sarah Chen', 'Marcus Thorne'],
  };

  const meeting: MeetingData = (locationState.state?.meeting as MeetingData) || defaultMeeting;

  const [tasks, setTasks] = useState([
    { id: 1, text: 'Prepare EMEA hiring plan', priority: 'URGENT', assignee: 'Sarah Chen', date: 'Oct 30', checked: false },
    { id: 2, text: 'SaaS Migration Audit', priority: 'DRAFT', assignee: 'Marcus Thorne', date: 'Nov 05', checked: true },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState([
    { name: 'Q3_Performance_Report.pdf', size: '4.2 MB - PDF File', color: 'error.main' },
    { name: 'EMEA_Hiring_Strategy.docx', size: '1.1 MB - DOCX File', color: 'primary.main' },
  ]);

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
        const isPdf = extension === 'pdf';
        return {
          name: file.name,
          size: `${sizeText} - ${extension.toUpperCase()} File`,
          color: isPdf ? 'error.main' : 'primary.main',
        };
      });
      setFiles((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t))
    );
  };

  const cardStyle = {
    p: 3,
    borderRadius: 3,
    border: '1px solid',
    borderColor: (theme: any) => theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0',
    bgcolor: 'background.paper',
    boxShadow: 'none',
  };

  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 2.5,
  };

  const labelStyle = {
    fontWeight: 800,
    color: (theme: any) => theme.palette.mode === 'dark' ? '#94A3B8' : '#475569',
    letterSpacing: '0.08em',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
  };

  return (
    <Box sx={{ py: 1 }}>
      {/* Back to Meetings button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/exec-docs/meetings')}
        sx={{
          mb: 3,
          textTransform: 'none',
          fontWeight: 700,
          color: 'text.secondary',
          '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
        }}
      >
        Back to Meetings
      </Button>

      {/* Header Block */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip
            label="BOARD OF DIRECTORS"
            size="small"
            sx={{
              bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1E293B' : '#E2E8F0',
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.65rem',
              borderRadius: '4px',
            }}
          />
          <Chip
            label="COMPLETED"
            size="small"
            icon={
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  ml: 1,
                }}
              />
            }
            sx={{
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.15)' : '#E2E8F0',
              color: (theme) => theme.palette.mode === 'dark' ? 'success.main' : '#2E7D32',
              fontWeight: 700,
              fontSize: '0.65rem',
              borderRadius: '4px',
              '& .MuiChip-icon': { ml: 0.5, mr: -0.5 },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1.5, letterSpacing: '-0.02em' }}>
              {meeting.title} Meeting
            </Typography>
            <Box sx={{ display: 'flex', gap: 2.5, color: 'text.secondary', flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                <Typography variant="body2" fontWeight={600}>{meeting.date}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <AccessTimeOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                <Typography variant="body2" fontWeight={600}>{meeting.time} - 11:30 AM EST</Typography>
              </Box>
            </Box>
          </Box>

          {/* Header Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                borderColor: (theme) => theme.palette.mode === 'dark' ? '#334155' : '#CBD5E1',
                color: 'text.primary',
                fontWeight: 700,
                px: 2.5,
                py: 1,
                bgcolor: 'background.paper',
                '&:hover': { borderColor: 'text.primary', bgcolor: 'action.hover' },
              }}
            >
              Save Changes
            </Button>
            <Button
              variant="outlined"
              startIcon={<GetAppOutlinedIcon />}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                borderColor: (theme) => theme.palette.mode === 'dark' ? '#334155' : '#CBD5E1',
                color: 'text.primary',
                fontWeight: 700,
                px: 2.5,
                py: 1,
                bgcolor: 'background.paper',
                '&:hover': { borderColor: 'text.primary', bgcolor: 'action.hover' },
              }}
            >
              Export PDF
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircleOutlinedIcon />}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                bgcolor: '#0D47A1',
                color: '#FFFFFF',
                fontWeight: 700,
                px: 2.5,
                py: 1,
                '&:hover': { bgcolor: '#0A192F' },
              }}
            >
              Finalize Minutes
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Two-Column Grid */}
      <Grid container spacing={4}>
        {/* Left Column (Decision Records & Minutes & Agenda) */}
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>


            {/* Card 2: Minutes & Agenda */}
            <Paper sx={cardStyle}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <PlaylistPlayIcon sx={{ color: '#0D47A1' }} />
                <Typography variant="h6" fontWeight={800}>
                  Minutes & Agenda
                </Typography>
              </Box>

              {/* Agenda Items */}
              <Typography variant="caption" sx={{ ...labelStyle, mb: 1.5, display: 'block' }}>
                Agenda Items
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                {[
                  { num: '1.0', text: 'Market expansion and international subsidiary performance review.' },
                  { num: '2.0', text: 'FY24 Budget allocation for R&D and Enterprise SaaS migration.' },
                  { num: '3.0', text: 'Confidential Executive compensation and board restructuring.' },
                ].map((item) => (
                  <Box key={item.num} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Chip
                      label={item.num}
                      size="small"
                      sx={{
                        bgcolor: '#0D47A1',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        borderRadius: '4px',
                        height: 20,
                      }}
                    />
                    <Typography variant="body2" fontWeight={500} sx={{ color: 'text.primary', pt: 0.1 }}>
                      {item.text}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Summary Quote Box */}
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  borderLeft: '4px solid #0D47A1',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? '#334155' : '#E2E8F0',
                  borderLeftColor: '#0D47A1',
                  position: 'relative',
                }}
              >
                {!isEditingSummary ? (
                  <>
                    <IconButton 
                      size="small" 
                      onClick={() => setIsEditingSummary(true)}
                      sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary' }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <Box dangerouslySetInnerHTML={{ __html: summaryHtml }} sx={{ pr: 4, '& p': { m: 0 } }} />
                  </>
                ) : (
                  <Box sx={{
                    '& .ql-container': {
                      minHeight: '150px',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                    },
                    '& .ql-toolbar': {
                      borderTopLeftRadius: '4px',
                      borderTopRightRadius: '4px',
                    },
                    '& .ql-container.ql-snow': {
                      borderBottomLeftRadius: '4px',
                      borderBottomRightRadius: '4px',
                    }
                  }}>
                    <ReactQuill 
                      theme="snow"
                      value={summaryHtml} 
                      onChange={setSummaryHtml} 
                      modules={quillModules}
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                      <Button 
                        onClick={() => setIsEditingSummary(false)} 
                        variant="contained" 
                        size="small"
                        sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: '#0D47A1' }}
                      >
                        Done Editing
                      </Button>
                    </Box>
                  </Box>
                )}

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 136, 229, 0.08)' : 'rgba(21, 101, 192, 0.05)',
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 136, 229, 0.15)' : 'rgba(21, 101, 192, 0.1)',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#1565C0', fontWeight: 600 }}>
                    The committee agreed that further investment in localized customer success teams is required to maintain momentum in new territories.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Grid>

        {/* Right Column (Action Items, Attendees, Attachments) */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Card 3: Action Items */}
            <Paper sx={cardStyle}>
              <Box sx={sectionHeaderStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AssignmentTurnedInIcon sx={{ color: '#0D47A1' }} />
                  <Typography variant="subtitle1" fontWeight={800}>
                    Action Items
                  </Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Tasks checkboxes */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {tasks.map((task) => (
                  <Box
                    key={task.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={task.checked}
                      onChange={() => handleToggleTask(task.id)}
                      sx={{ mt: -0.2, color: 'text.secondary', '&.Mui-checked': { color: 'primary.main' } }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{
                            textDecoration: task.checked ? 'line-through' : 'none',
                            color: task.checked ? 'text.secondary' : 'text.primary',
                            fontSize: '0.85rem',
                          }}
                        >
                          {task.text}
                        </Typography>
                        <Chip
                          label={task.priority}
                          size="small"
                          sx={{
                            borderRadius: '4px',
                            height: 18,
                            fontSize: '0.55rem',
                            fontWeight: 800,
                            bgcolor:
                              task.priority === 'URGENT'
                                ? 'rgba(211, 47, 47, 0.08)'
                                  : 'rgba(95, 107, 122, 0.08)',
                              color:
                                task.priority === 'URGENT' ? 'error.main' : 'text.secondary',
                              border: 'none',
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Avatar
                              sx={{
                                width: 18,
                                height: 18,
                                fontSize: '0.6rem',
                                bgcolor: 'primary.light',
                              }}
                            >
                              {task.assignee.split(' ').map((n) => n[0]).join('')}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              {task.assignee}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {task.date}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Card 4: Attendees */}
              <Paper sx={cardStyle}>
                <Box sx={sectionHeaderStyle}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <GroupIcon sx={{ color: '#0D47A1' }} />
                    <Typography variant="subtitle1" fontWeight={800}>
                      Attendees
                    </Typography>
                  </Box>
                  <Chip
                    label="3 PRESENT"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(21, 101, 192, 0.06)',
                      color: '#1565C0',
                      fontWeight: 700,
                      fontSize: '0.62rem',
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2.5 }}>
                  {[
                    { name: 'Jameson Davies', role: 'CEO / Chairperson', initial: 'JD', status: 'Present' },
                    { name: 'Sarah Chen', role: 'CFO', initial: 'SC', status: 'Present' },
                    { name: 'Marcus Thorne', role: 'CTO', initial: 'MT', status: 'Present' },
                  ].map((attendee) => (
                    <Box
                      key={attendee.name}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
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
                          {attendee.initial}
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
                      <Typography 
                        variant="caption" 
                        fontWeight={700} 
                        sx={{ color: attendee.status === 'Present' ? 'success.main' : 'error.main', textTransform: 'uppercase' }}
                      >
                        {attendee.status}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Card 5: Attachments */}
              <Paper sx={cardStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <AttachmentIcon sx={{ color: '#0D47A1' }} />
                  <Typography variant="subtitle1" fontWeight={800}>
                    Attachments
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {files.map((doc, idx) => (
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
                          bgcolor: doc.color,
                          borderRadius: 1,
                          p: 0.75,
                          display: 'flex',
                          color: '#FFFFFF',
                        }}
                      >
                        <InsertDriveFileIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary' }}
                        >
                          {doc.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                          {doc.size}
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

                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '1px dashed',
                    borderColor: 'primary.main',
                    borderRadius: 2.5,
                    p: 3,
                    mt: 2.5,
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
      </Box>
  );
}
