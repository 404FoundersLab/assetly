import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Grid, alpha } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../../components/PageHeader';
import { ExecutiveInsightsBanner } from './modal/ExecutiveInsightsBanner';
import { MeetingCard, MeetingData } from './modal/MeetingCard';
import { NewMeetingModal } from './modal/NewMeetingModal';
import { UpcomingMeetingDetailsModal } from './modal/UpcomingMeetingDetailsModal';
import { ReadReportModal } from './modal/ReadReportModal';
import { generateDemoMeetings } from '../../../data/execDocsDemo';


export function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingData[]>(() => generateDemoMeetings());
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  // Dialog states
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingData | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<MeetingData | null>(null);

  const handleOpenNewMeeting = () => {
    setEditingMeeting(null);
    setIsNewMeetingOpen(true);
  };

  const handleOpenEditMeeting = (meeting: MeetingData) => {
    if (meeting.status === 'COMPLETED') {
      navigate('/exec-docs/meetings/details', { state: { meeting } });
    } else {
      setSelectedMeeting(meeting);
      setIsAgendaOpen(true);
    }
  };

  const handleSaveMeeting = (newMeeting: Omit<MeetingData, 'id'> & { id?: string }) => {
    if (newMeeting.id) {
      // Edit existing
      setMeetings((prev) =>
        prev.map((m) => (m.id === newMeeting.id ? (newMeeting as MeetingData) : m))
      );
    } else {
      // Add new
      const meetingToAdd: MeetingData = {
        ...newMeeting,
        id: `meet-${Date.now()}`,
      };
      setMeetings((prev) => [...prev, meetingToAdd]);
    }
  };

  const handleDeleteMeeting = (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  const handleStatusChange = (id: string, newStatus: 'CONFIRMED' | 'TENTATIVE' | 'COMPLETED') => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
  };

  const handleViewAgenda = (meeting: MeetingData) => {
    if (meeting.status === 'COMPLETED') {
      navigate('/exec-docs/meetings/details', { state: { meeting } });
    } else {
      setSelectedMeeting(meeting);
      setIsAgendaOpen(true);
    }
  };

  // Filter meetings based on tab selection
  const filteredMeetings = meetings.filter((meeting) => {
    if (activeTab === 'upcoming') {
      return meeting.status === 'CONFIRMED' || meeting.status === 'TENTATIVE';
    } else {
      return meeting.status === 'COMPLETED';
    }
  });

  const headerActions = (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {/* Premium Tab Toggle Pill */}
      <Box
        sx={{
          display: 'flex',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(26, 35, 50, 0.05)',
          borderRadius: '24px',
          p: 0.5,
          mr: { xs: 1.5, sm: 2 },
        }}
      >
        <Button
          onClick={() => setActiveTab('upcoming')}
          sx={{
            borderRadius: '20px',
            px: { xs: 2, sm: 3 },
            py: 0.75,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: activeTab === 'upcoming' ? 'text.primary' : 'text.secondary',
            bgcolor:
              activeTab === 'upcoming'
                ? (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : '#FFFFFF'
                : 'transparent',
            boxShadow:
              activeTab === 'upcoming'
                ? '0 2px 8px rgba(0, 0, 0, 0.08)'
                : 'none',
            '&:hover': {
              bgcolor:
                activeTab === 'upcoming'
                  ? (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.18)'
                        : '#FFFFFF'
                  : 'action.hover',
            },
          }}
        >
          Upcoming
        </Button>
        <Button
          onClick={() => setActiveTab('completed')}
          sx={{
            borderRadius: '20px',
            px: { xs: 2, sm: 3 },
            py: 0.75,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: activeTab === 'completed' ? 'text.primary' : 'text.secondary',
            bgcolor:
              activeTab === 'completed'
                ? (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : '#FFFFFF'
                : 'transparent',
            boxShadow:
              activeTab === 'completed'
                ? '0 2px 8px rgba(0, 0, 0, 0.08)'
                : 'none',
            '&:hover': {
              bgcolor:
                activeTab === 'completed'
                  ? (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.18)'
                        : '#FFFFFF'
                  : 'action.hover',
            },
          }}
        >
          Completed
        </Button>
      </Box>

      {/* New Meeting Button */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleOpenNewMeeting}
        sx={{
          borderRadius: '20px',
          px: 3,
          py: 1,
          fontWeight: 700,
          textTransform: 'none',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? '#1E88E5' : '#0D47A1',
          boxShadow: (theme) =>
            `0 4px 14px ${alpha(
              theme.palette.mode === 'dark'
                ? theme.palette.primary.main
                : '#0D47A1',
              0.3
            )}`,
          '&:hover': {
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? '#1565C0' : '#0A192F',
            boxShadow: (theme) =>
              `0 6px 20px ${alpha(
                theme.palette.mode === 'dark'
                  ? theme.palette.primary.main
                  : '#0D47A1',
                0.4
              )}`,
          },
        }}
      >
        New Meeting
      </Button>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Your Agenda"
        subtitle={`${filteredMeetings.length} meetings scheduled for this ${
          activeTab === 'upcoming' ? 'week' : 'past period'
        }`}
        breadcrumbs={[
          { label: 'Dashboard', to: '/exec-docs' },
          { label: 'Meetings' },
        ]}
        actions={headerActions}
      />

      {/* Hero Insights Banner */}
      <ExecutiveInsightsBanner onReadReport={() => setIsReportOpen(true)} />

      {/* Meeting Cards Grid */}
      <Grid container spacing={3}>
        {filteredMeetings.map((meeting) => (
          <Grid item xs={12} sm={6} md={4} key={meeting.id}>
            <MeetingCard
              meeting={meeting}
              onViewAgenda={handleViewAgenda}
              onDelete={handleDeleteMeeting}
              onEdit={handleOpenEditMeeting}
              onChangeStatus={handleStatusChange}
            />
          </Grid>
        ))}
        {filteredMeetings.length === 0 && (
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '200px',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 3,
                color: 'text.secondary',
                p: 4,
                textAlign: 'center',
              }}
            >
              No meetings found under "{activeTab}" filter.
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Dialog Modals */}
      <NewMeetingModal
        open={isNewMeetingOpen}
        onClose={() => setIsNewMeetingOpen(false)}
        onSave={handleSaveMeeting}
        editMeeting={editingMeeting}
      />

      <UpcomingMeetingDetailsModal
        open={isAgendaOpen}
        onClose={() => setIsAgendaOpen(false)}
        meeting={selectedMeeting}
        onSave={handleSaveMeeting}
        onStatusChange={handleStatusChange}
      />

      <ReadReportModal open={isReportOpen} onClose={() => setIsReportOpen(false)} />
    </Box>
  );
}

