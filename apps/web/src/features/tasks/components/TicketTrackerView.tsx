import React, { useState } from 'react';
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
  alpha,
  useTheme,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AddTaskIcon from '@mui/icons-material/AddTask';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import type { SupportTicket, TicketPriority, TicketStatus } from '../../../types';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../../hooks/storeHooks';
import { updateTicket } from '../../../store/ticketsSlice';

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
}

export function TicketTrackerView({ onConvertToTask }: TicketTrackerViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const tickets = useAppSelector((s) => s.tickets.items);
  const tasks = useAppSelector((s) => s.tasks.items);
  const employees = useAppSelector((s) => s.employees.items);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('resolved');
  const [assignedTo, setAssignedTo] = useState('');

  // Fallback demo tickets if store is empty
  const activeTickets: SupportTicket[] = tickets.length > 0 ? tickets : [
    {
      id: 'TICK-204',
      tenantId: '11111111-1111-1111-1111-111111111111',
      employeeId: '44444444-4444-4444-4444-444444444402',
      employeeName: 'Mike Johnson',
      employeeEmail: 'mike.johnson@solumtechnologies.com',
      departmentName: 'Engineering',
      title: 'Intermittent VPN Handshake timeouts on European Frankfurt Gateway',
      description: 'Engineers working remotely in Munich & London lose tunnel connection during heavy file transfers.',
      category: 'network',
      priority: 'high',
      status: 'in_progress',
      assignedTo: 'user-itadmin',
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-20T14:30:00Z',
    },
    {
      id: 'TICK-302',
      tenantId: '11111111-1111-1111-1111-111111111111',
      employeeId: '44444444-4444-4444-4444-444444444401',
      employeeName: 'Sarah Chen',
      employeeEmail: 'sarah.chen@solumtechnologies.com',
      departmentName: 'Engineering',
      title: 'Redis session store latency degradation in staging environment',
      description: 'Staging cluster needs vertical scale-up and HA replication node setup.',
      category: 'software',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'user-itadmin',
      createdAt: '2026-10-17T09:15:00Z',
      updatedAt: '2026-10-19T11:00:00Z',
    },
    {
      id: 'TICK-101',
      tenantId: '11111111-1111-1111-1111-111111111111',
      employeeId: '44444444-4444-4444-4444-444444444406',
      employeeName: 'David Brown',
      employeeEmail: 'david.brown@solumtechnologies.com',
      departmentName: 'Engineering',
      title: 'High memory consumption in EDR background agent daemon',
      description: 'Memory grows past 1.2GB over 48 hours without restarting.',
      category: 'software',
      priority: 'critical',
      status: 'resolved',
      assignedTo: 'user-itadmin',
      resolutionNotes: 'Patched bounded socket queue and released hotfix v1.14.2.',
      createdAt: '2026-10-14T08:00:00Z',
      updatedAt: '2026-10-21T16:00:00Z',
    },
    {
      id: 'TICK-405',
      tenantId: '11111111-1111-1111-1111-111111111111',
      employeeId: '44444444-4444-4444-4444-444444444405',
      employeeName: 'Priya Patel',
      employeeEmail: 'priya.patel@solumtechnologies.com',
      departmentName: 'Finance',
      title: 'Dual 4K Monitor DisplayPort adapter signal flickering',
      description: 'External display drops to black screen when docking station is under charge.',
      category: 'hardware',
      priority: 'medium',
      status: 'open',
      createdAt: '2026-10-21T13:45:00Z',
      updatedAt: '2026-10-21T13:45:00Z',
    },
  ];

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
    setSelectedTicket(null);
  };

  return (
    <Box>
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
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeTickets.map((ticket) => {
                const priority = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium;
                const statusMeta = STATUS_CHIPS[ticket.status] || STATUS_CHIPS.open;

                // Check if a work task links to this ticket
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
                    </TableCell>
                  </TableRow>
                );
              })}
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
          <Button onClick={() => setSelectedTicket(null)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSaveResolution}
            variant="contained"
            sx={{ bgcolor: '#EC4899', '&:hover': { bgcolor: '#DB2777' }, fontWeight: 700 }}
          >
            Save Ticket Updates
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
