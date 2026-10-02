import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  alpha,
  useTheme,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CelebrationIcon from '@mui/icons-material/Celebration';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../../../components/PageHeader';

interface Holiday {
  id: string;
  name: string;
  date: string;
  dayOfWeek: string;
  type: 'Public / Mandatory' | 'Optional / Restricted' | 'Company Day Off';
  description: string;
}

const INITIAL_HOLIDAYS: Holiday[] = [
  { id: '1', name: 'New Year Day', date: 'Jan 01, 2026', dayOfWeek: 'Thursday', type: 'Public / Mandatory', description: 'Global holiday celebrating the start of 2026.' },
  { id: '2', name: 'Republic Day', date: 'Jan 26, 2026', dayOfWeek: 'Monday', type: 'Public / Mandatory', description: 'National holiday marking the adoption of the Constitution.' },
  { id: '3', name: 'Holi Festival of Colors', date: 'Mar 17, 2026', dayOfWeek: 'Tuesday', type: 'Public / Mandatory', description: 'Spring festive celebration across regions.' },
  { id: '4', name: 'Good Friday', date: 'Apr 03, 2026', dayOfWeek: 'Friday', type: 'Public / Mandatory', description: 'Commemoration of the Passion of Jesus Christ.' },
  { id: '5', name: 'Eid al-Fitr', date: 'Apr 20, 2026', dayOfWeek: 'Monday', type: 'Public / Mandatory', description: 'Celebration concluding the holy month of Ramadan.' },
  { id: '6', name: 'Independence Day', date: 'Aug 15, 2026', dayOfWeek: 'Saturday', type: 'Public / Mandatory', description: 'National Independence Day celebration.' },
  { id: '7', name: 'Gandhi Jayanti', date: 'Oct 02, 2026', dayOfWeek: 'Friday', type: 'Public / Mandatory', description: 'National holiday celebrating Mahatma Gandhi.' },
  { id: '8', name: 'Dussehra / Vijayadashami', date: 'Oct 20, 2026', dayOfWeek: 'Tuesday', type: 'Public / Mandatory', description: 'Celebration of the victory of good over evil.' },
  { id: '9', name: 'Diwali (Deepavali)', date: 'Nov 08, 2026', dayOfWeek: 'Sunday', type: 'Public / Mandatory', description: 'Festival of lights.' },
  { id: '10', name: 'Christmas Day', date: 'Dec 25, 2026', dayOfWeek: 'Friday', type: 'Public / Mandatory', description: 'Worldwide festive holiday celebration.' },
  { id: '11', name: 'Annual Company Foundation Day', date: 'Dec 28, 2026', dayOfWeek: 'Monday', type: 'Company Day Off', description: 'Annual foundation milestone and wellness break.' },
];

export function HolidaysPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [holidays, setHolidays] = useState<Holiday[]>(INITIAL_HOLIDAYS);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', dayOfWeek: 'Friday', type: 'Public / Mandatory' as Holiday['type'], description: '' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.date) return;

    const newH: Holiday = {
      id: String(Date.now()),
      ...form,
    };

    setHolidays([...holidays, newH]);
    setOpenModal(false);
    setForm({ name: '', date: '', dayOfWeek: 'Friday', type: 'Public / Mandatory', description: '' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Remove this holiday from company calendar?')) {
      setHolidays(holidays.filter((h) => h.id !== id));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Company Holiday Calendar"
        subtitle="Official statutory holidays, public observances, and optional festive leave schedule for 2026"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Add Holiday
          </Button>
        }
      />

      {/* Banner Next Holiday */}
      <Card
        sx={{
          p: 3,
          mb: 4,
          mt: 1,
          borderRadius: '20px',
          border: `1px solid ${alpha('#10B981', 0.3)}`,
          background: isDark
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)'
            : 'linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              bgcolor: '#10B981',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            <CelebrationIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={700} color="#10B981" sx={{ letterSpacing: '0.04em' }}>
              UPCOMING COMPANY HOLIDAY
            </Typography>
            <Typography variant="h5" fontWeight={800}>
              Dussehra / Vijayadashami — Oct 20, 2026 (Tuesday)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mandatory paid public holiday across all global offices.
            </Typography>
          </Box>
        </Box>
        <Chip label="18 Days Away" color="primary" sx={{ fontWeight: 800, fontSize: '0.8rem', height: 28 }} />
      </Card>

      {/* Holiday Grid */}
      <Grid container spacing={2.5}>
        {holidays.map((h) => (
          <Grid item xs={12} sm={6} md={4} key={h.id}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#10B981' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ fontSize: '0.75rem' }}>
                    {h.date} • {h.dayOfWeek}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem', mt: 0.25 }}>
                    {h.name}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => handleDelete(h.id)} sx={{ color: 'text.secondary' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <Chip
                label={h.type}
                size="small"
                sx={{
                  alignSelf: 'flex-start',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  mb: 1.5,
                  bgcolor: h.type === 'Company Day Off' ? alpha('#6366F1', 0.15) : alpha('#10B981', 0.15),
                  color: h.type === 'Company Day Off' ? '#6366F1' : '#10B981',
                }}
              />

              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                {h.description}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add Holiday Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 800 }}>Add Holiday</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                required
                fullWidth
                label="Holiday Name"
                placeholder="e.g. Thanksgiving Day"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <TextField
                required
                fullWidth
                label="Date & Month"
                placeholder="e.g. Nov 26, 2026"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <TextField
                required
                fullWidth
                label="Day of Week"
                placeholder="e.g. Thursday"
                value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
              />
              <TextField
                select
                required
                fullWidth
                label="Holiday Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Holiday['type'] })}
              >
                <MenuItem value="Public / Mandatory">Public / Mandatory</MenuItem>
                <MenuItem value="Optional / Restricted">Optional / Restricted</MenuItem>
                <MenuItem value="Company Day Off">Company Day Off</MenuItem>
              </TextField>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                placeholder="Details or regional applicability..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
              Save Holiday
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
