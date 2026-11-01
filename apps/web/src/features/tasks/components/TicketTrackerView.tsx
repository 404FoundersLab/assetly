import React, { useState, useMemo } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  Select,
  InputAdornment,
  Snackbar,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AddTaskIcon from '@mui/icons-material/AddTask';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import type { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '../../../types';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../../hooks/storeHooks';
import {
  updateTicket,
  deleteTicket,
  deleteAllTickets,
  replaceAllTickets,
  INITIAL_TICKETS,
} from '../../../store/ticketsSlice';
import { deleteTicket as deleteTicketApi } from '../../../services/api/tickets';

const PRIORITY_COLORS: Record<TicketPriority, { color: string; bg: string }> = {
  critical: { color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)' },
  high: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  medium: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  low: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
};

const STATUS_CHIPS: Record<TicketStatus, { label: string; color: 'info' | 'warning' | 'success' | 'default' }> = {
  open: { label: 'Open', color: 'info' },
  in_progress: { label: 'In Progress', color: 'warning' },
  resolved: { label: 'Resolved', color: 'success' },
  closed: { label: 'Closed', color: 'default' },
};

interface TicketTrackerViewProps {
  onConvertToTask: (ticket: SupportTicket) => void;
  onOpenCreateTicket?: () => void;
}

export function TicketTrackerView({ onConvertToTask, onOpenCreateTicket }: TicketTrackerViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const tickets = useAppSelector((s) => s.tickets.items);
  const tasks = useAppSelector((s) => s.tasks.items);
  const employees = useAppSelector((s) => s.employees.items);

  const canManage =
    user?.role === 'tenant_admin' || user?.role === 'platform_admin' || user?.role === 'it_admin';

  // Read strictly from store - do NOT fallback to INITIAL_TICKETS if user emptied/deleted them
  const activeTicketsList: SupportTicket[] = Array.isArray(tickets) ? tickets : [];

  // Search & Filtering State
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Modal / Action State
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('resolved');
  const [assignedTo, setAssignedTo] = useState('');
  const [ticketToDelete, setTicketToDelete] = useState<SupportTicket | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const filteredTickets = useMemo(() => {
    return activeTicketsList.filter((ticket) => {
      const searchMatch =
        !search ||
        ticket.id.toLowerCase().includes(search.toLowerCase()) ||
        ticket.title.toLowerCase().includes(search.toLowerCase()) ||
        (ticket.description && ticket.description.toLowerCase().includes(search.toLowerCase())) ||
        (ticket.employeeName && ticket.employeeName.toLowerCase().includes(search.toLowerCase())) ||
        ticket.category.toLowerCase().includes(search.toLowerCase());

      const statusMatch = filterStatus === 'all' || ticket.status === filterStatus;
      const categoryMatch = filterCategory === 'all' || ticket.category === filterCategory;

      return searchMatch && statusMatch && categoryMatch;
    });
  }, [activeTicketsList, search, filterStatus, filterCategory]);

  const handleOpenResolutionDialog = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTicketStatus(ticket.status);
    setResolutionNotes(ticket.resolutionNotes || '');
    setAssignedTo(ticket.assignedTo || '');
  };

  const handleSaveResolution = () => {
    if (!selectedTicket) return;
    dispatch(
      updateTicket({
        ...selectedTicket,
        status: ticketStatus,
        resolutionNotes: resolutionNotes.trim() || undefined,
        assignedTo: assignedTo || undefined,
        updatedAt: new Date().toISOString(),
      })
    );
    setSnackbarMessage(`Ticket ${selectedTicket.id} updated successfully.`);
    setSelectedTicket(null);
  };

  const handleConfirmDelete = () => {
    if (!ticketToDelete) return;
    const deletedId = ticketToDelete.id;
    dispatch(deleteTicket(deletedId));
    // Also try API delete in background if configured
    deleteTicketApi(deletedId).catch(() => {});
    setSnackbarMessage(`Ticket ${deletedId} deleted permanently.`);
    setTicketToDelete(null);
  };

  const handleConfirmDeleteAll = () => {
    dispatch(deleteAllTickets());
    setSnackbarMessage('All tickets removed from system.');
    setDeleteAllOpen(false);
  };

  const handleRestoreDemoTickets = () => {
    dispatch(replaceAllTickets(INITIAL_TICKETS));
    setSnackbarMessage('Initial demo tickets restored.');
  };

  return (
    <Box>
      {/* Top Filter and Action Bar */}
      <Card
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: '16px',
          bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
          border: '1px solid',
          borderColor: theme.palette.divider,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          {/* Status Filter Chips */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mr: 0.5 }}>
              STATUS:
            </Typography>
            <Chip
              label={`All (${activeTicketsList.length})`}
              onClick={() => setFilterStatus('all')}
              color={filterStatus === 'all' ? 'primary' : 'default'}
              variant={filterStatus === 'all' ? 'filled' : 'outlined'}
              size="small"
              sx={{ fontWeight: 700, borderRadius: '8px' }}
            />
            {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map((st) => {
              const count = activeTicketsList.filter((t) => t.status === st).length;
              const isSelected = filterStatus === st;
              return (
                <Chip
                  key={st}
                  label={`${STATUS_CHIPS[st].label} (${count})`}
                  onClick={() => setFilterStatus(st)}
                  color={STATUS_CHIPS[st].color}
                  variant={isSelected ? 'filled' : 'outlined'}
                  size="small"
                  sx={{ fontWeight: 700, borderRadius: '8px' }}
                />
              );
            })}
          </Stack>

          {/* Search, Category Filter, and Action Buttons */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 200 } }}
            />

            <TextField
              select
              size="small"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              sx={{ width: 120 }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="hardware">Hardware</MenuItem>
              <MenuItem value="software">Software</MenuItem>
              <MenuItem value="network">Network</MenuItem>
              <MenuItem value="access">Access</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>

            {onOpenCreateTicket && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={onOpenCreateTicket}
                sx={{
                  bgcolor: '#EC4899',
                  '&:hover': { bgcolor: '#DB2777' },
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '9px',
                  whiteSpace: 'nowrap',
                  height: 38,
                  px: 2,
                }}
              >
                New Ticket
              </Button>
            )}

            {canManage && activeTicketsList.length > 0 && (
              <Tooltip title="Delete All Tickets">
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteSweepIcon sx={{ fontSize: 18 }} />}
                  onClick={() => setDeleteAllOpen(true)}
                  sx={{
                    borderRadius: '9px',
                    textTransform: 'none',
                    fontWeight: 700,
                    height: 38,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Clear All
                </Button>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Card>

      {/* Tickets Table */}
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
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Ticket ID</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Issue & Category</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Requester</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }}>Linked Work Task</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => {
                  const priority = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium;
                  const statusMeta = STATUS_CHIPS[ticket.status] || STATUS_CHIPS.open;
                  const linkedTask = tasks.find((t) => t.ticketReferenceId === ticket.id);

                  return (
                    <TableRow key={ticket.id} hover>
                      {/* Ticket ID */}
                      <TableCell sx={{ py: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ConfirmationNumberIcon sx={{ fontSize: 16, color: '#EC4899' }} />
                          <Typography variant="body2" fontWeight={800} color="#EC4899">
                            {ticket.id}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Title & Category */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {ticket.title}
                        </Typography>
                        {ticket.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              maxWidth: 420,
                              mt: 0.25,
                            }}
                          >
                            {ticket.description}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip
                            label={ticket.category}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Created {ticket.createdAt?.slice(0, 10)}
                          </Typography>
                          {ticket.resolutionNotes && (
                            <Chip
                              label="Notes Added"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.62rem' }}
                            />
                          )}
                        </Stack>
                      </TableCell>

                      {/* Requester */}
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 26, height: 26, fontSize: '0.72rem', bgcolor: '#3B82F6' }}>
                            {ticket.employeeName ? ticket.employeeName[0] : 'E'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {ticket.employeeName || 'Staff Member'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ticket.departmentName || 'General'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Priority */}
                      <TableCell>
                        <Chip
                          label={ticket.priority}
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

                      {/* Status */}
                      <TableCell>
                        <Chip
                          label={statusMeta.label}
                          color={statusMeta.color}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                        />
                      </TableCell>

                      {/* Linked Work Task */}
                      <TableCell>
                        {linkedTask ? (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.75,
                              px: 1.25,
                              py: 0.5,
                              borderRadius: '8px',
                              bgcolor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                            }}
                          >
                            <Typography variant="caption" fontWeight={700} color="primary">
                              {linkedTask.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({linkedTask.status.replace('_', ' ')})
                            </Typography>
                          </Box>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddTaskIcon sx={{ fontSize: '14px !important' }} />}
                            onClick={() => onConvertToTask(ticket)}
                            sx={{
                              fontSize: '0.72rem',
                              py: 0.25,
                              px: 1,
                              borderRadius: '8px',
                              textTransform: 'none',
                              fontWeight: 700,
                            }}
                          >
                            Create Work Task
                          </Button>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          <Tooltip title="Manage Ticket & Resolution">
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                              onClick={() => handleOpenResolutionDialog(ticket)}
                              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                            >
                              Update
                            </Button>
                          </Tooltip>

                          {canManage && (
                            <Tooltip title="Delete Ticket">
                              <IconButton
                                size="small"
                                onClick={() => setTicketToDelete(ticket)}
                                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                              >
                                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                    {activeTicketsList.length === 0 ? (
                      <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                        <Typography variant="subtitle1" fontWeight={700} color="text.secondary" gutterBottom>
                          No support tickets in the system.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          All tickets have been resolved or deleted. Create a new support ticket or restore initial demo tickets.
                        </Typography>
                        <Stack direction="row" spacing={1.5} justifyContent="center">
                          {onOpenCreateTicket && (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={onOpenCreateTicket}
                              sx={{ bgcolor: '#EC4899', '&:hover': { bgcolor: '#DB2777' }, textTransform: 'none', fontWeight: 700 }}
                            >
                              New Ticket
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          No support tickets match the selected filters.
                        </Typography>
                        {(search || filterStatus !== 'all' || filterCategory !== 'all') && (
                          <Button
                            size="small"
                            startIcon={<FilterAltOffIcon />}
                            onClick={() => {
                              setSearch('');
                              setFilterStatus('all');
                              setFilterCategory('all');
                            }}
                            sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                          >
                            Reset Filters
                          </Button>
                        )}
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Ticket Resolution / Status Dialog */}
      <Dialog
        open={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, pb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: 'rgba(236, 72, 153, 0.12)',
                color: '#EC4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ConfirmationNumberIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Update Ticket {selectedTicket?.id}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedTicket?.title}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setSelectedTicket(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <FormControl fullWidth>
              <Typography variant="caption" fontWeight={700} sx={{ mb: 0.5 }}>
                TICKET LIFECYCLE STATUS
              </Typography>
              <Select
                value={ticketStatus}
                onChange={(e) => setTicketStatus(e.target.value as TicketStatus)}
              >
                <MenuItem value="open">Open (Unresolved)</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved (Fix verified)</MenuItem>
                <MenuItem value="closed">Closed (Completed)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <Typography variant="caption" fontWeight={700} sx={{ mb: 0.5 }}>
                ASSIGNED TECHNICIAN / ENGINEER
              </Typography>
              <Select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">Unassigned</MenuItem>
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.jobTitle})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Resolution Notes / Root Cause Analysis"
              multiline
              rows={3}
              fullWidth
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Detail actions taken to resolve this ticket..."
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setSelectedTicket(null)} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveResolution}
            variant="contained"
            sx={{ bgcolor: '#EC4899', '&:hover': { bgcolor: '#DB2777' }, fontWeight: 700, textTransform: 'none', borderRadius: '8px' }}
          >
            Save Ticket Updates
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Ticket Confirmation Dialog */}
      <Dialog
        open={Boolean(ticketToDelete)}
        onClose={() => setTicketToDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <DeleteOutlineIcon />
          Delete Ticket
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Are you sure you want to delete ticket <strong>{ticketToDelete?.id}</strong>: "{ticketToDelete?.title}"?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This action is permanent and will not restore automatically.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTicketToDelete(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
          >
            Delete Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <DeleteSweepIcon />
          Clear All Tickets
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Are you sure you want to delete all <strong>{activeTicketsList.length}</strong> support tickets?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This will permanently remove all tickets from your dashboard. You can restore sample demo tickets at any time.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteAllOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteAll}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
          >
            Clear All Tickets
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarMessage(null)} severity="success" sx={{ width: '100%', borderRadius: '10px' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TicketTrackerView;
