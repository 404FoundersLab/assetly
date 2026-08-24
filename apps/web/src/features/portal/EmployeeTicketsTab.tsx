import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AddIcon from '@mui/icons-material/Add';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { replaceAllTickets, addTicket } from '../../store/ticketsSlice';
import { fetchTickets, createTicket } from '../../services/api/tickets';
import { LoadingButton } from '../../components/Loader';
import { ApiError } from '../../services/api/client';
import type { TicketCategory, TicketPriority } from '../../types';

const CATEGORY_OPTIONS: { value: TicketCategory; label: string; emoji: string }[] = [
  { value: 'hardware',  label: 'Hardware Issue',      emoji: '🖥️'  },
  { value: 'software',  label: 'Software / App',       emoji: '💻'  },
  { value: 'access',    label: 'Access & Permissions', emoji: '🔐'  },
  { value: 'network',   label: 'Network / Internet',   emoji: '📡'  },
  { value: 'other',     label: 'Other',                emoji: '🔧'  },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low',      label: 'Low'      },
  { value: 'medium',   label: 'Medium'   },
  { value: 'high',     label: 'High'     },
  { value: 'critical', label: 'Critical' },
];

const STATUS_CHIP: Record<string, { label: string; color: 'default' | 'info' | 'success' | 'warning' | 'error' }> = {
  open:        { label: 'Open',        color: 'info'    },
  in_progress: { label: 'In Progress', color: 'warning' },
  resolved:    { label: 'Resolved',    color: 'success' },
  closed:      { label: 'Closed',      color: 'default' },
};

const PRIORITY_COLOR: Record<string, string> = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#7c3aed',
};

interface EmployeeTicketsTabProps {
  refreshTrigger?: number;
}

export function EmployeeTicketsTab({ refreshTrigger }: EmployeeTicketsTabProps) {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const tickets = useAppSelector((s) => s.tickets.items);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('hardware');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const data = await fetchTickets();
      dispatch(replaceAllTickets(data));
    } catch {
      /* silently skip if table not yet migrated */
    } finally {
      setFetching(false);
    }
  }, [dispatch]);

  useEffect(() => { void load(); }, [load, refreshTrigger]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('hardware');
    setPriority('medium');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createTicket({ title: title.trim(), description: description.trim(), category, priority });
      dispatch(addTicket(created));
      setSuccess('Ticket submitted! IT will review it shortly.');
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Hero CTA card */}
      <Card
        sx={{
          mb: 3,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha('#3b82f6', 0.15)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`
            : `linear-gradient(135deg, ${alpha('#3b82f6', 0.06)} 0%, ${alpha('#8b5cf6', 0.04)} 100%)`,
          border: `1px solid ${alpha('#3b82f6', 0.2)}`,
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', p: 3 }}>
          <Box
            sx={{
              width: 52, height: 52, borderRadius: 2.5,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <ConfirmationNumberIcon sx={{ color: '#fff', fontSize: 26 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>IT Support Tickets</Typography>
            <Typography variant="body2" color="text.secondary">
              Having a problem? Raise a ticket and our IT team will get back to you.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', flexShrink: 0 }}
          >
            New Ticket
          </Button>
        </CardContent>
      </Card>

      {/* Ticket list */}
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes from IT</TableCell>
                <TableCell>Raised</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fetching && tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Loading tickets…
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <ConfirmationNumberIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography variant="body2" color="text.secondary">
                      No tickets yet. Click <strong>New Ticket</strong> above to raise one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => {
                  const cat = CATEGORY_OPTIONS.find((c) => c.value === t.category);
                  const st  = STATUS_CHIP[t.status] ?? { label: t.status, color: 'default' as const };
                  return (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{t.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 260 }} noWrap>
                          {t.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{cat?.emoji} {cat?.label ?? t.category}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_COLOR[t.priority] ?? '#94a3b8', flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{t.priority}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={st.label} color={st.color} size="small" />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="caption" color="text.secondary" noWrap title={t.resolutionNotes}>
                          {t.resolutionNotes ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* New ticket dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>🎫 Raise a Support Ticket</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <TextField
              label="Title"
              placeholder="Short summary of the issue…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.emoji} {o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Priority</InputLabel>
                <Select
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PRIORITY_COLOR[o.value], flexShrink: 0 }} />
                        {o.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Description"
              placeholder="Describe the problem in detail — steps to reproduce, error messages, impacted work…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setDialogOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={() => void handleSubmit()}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
          >
            Submit Ticket
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
