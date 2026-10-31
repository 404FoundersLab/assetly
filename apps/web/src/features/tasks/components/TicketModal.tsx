import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Box,
  Typography,
  IconButton,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import type { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '../../../types';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../../hooks/storeHooks';
import { addTicket } from '../../../store/ticketsSlice';

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (ticketId: string) => void;
}

export function TicketModal({ open, onClose, onCreated }: TicketModalProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const employees = useAppSelector((s) => s.employees.items);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('software');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [status, setStatus] = useState<TicketStatus>('open');
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [assignedTo, setAssignedTo] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;

    const emp = employees.find((e) => e.id === employeeId);
    const employeeName = emp ? `${emp.firstName} ${emp.lastName}` : (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Staff Member');
    const employeeEmail = emp?.email || user?.email || '';
    const departmentName = emp?.jobTitle ? `${emp.jobTitle} Dept` : 'General';

    const newTicketPayload: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId: user?.tenantId || '11111111-1111-1111-1111-111111111111',
      employeeId: employeeId || '44444444-4444-4444-4444-444444444401',
      employeeName,
      employeeEmail,
      departmentName,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status,
      assignedTo: assignedTo.trim() || undefined,
    };

    dispatch(addTicket(newTicketPayload));

    // Reset form
    setTitle('');
    setDescription('');
    setCategory('software');
    setPriority('medium');
    setStatus('open');
    setAssignedTo('');

    if (onCreated) onCreated('NEW');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          bgcolor: isDark ? '#1E293B' : '#FFFFFF',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              bgcolor: 'rgba(236, 72, 153, 0.12)',
              color: '#EC4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ConfirmationNumberIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.01em">
              Create Support Ticket
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Report an IT incident, hardware malfunction, or system request
            </Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2.5}>
          {/* Title */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Issue Summary / Subject *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Intermittent VPN Handshake timeouts on European Gateway"
              size="small"
              autoFocus
            />
          </Grid>

          {/* Category */}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              size="small"
            >
              <MenuItem value="hardware">Hardware / Device</MenuItem>
              <MenuItem value="software">Software / Application</MenuItem>
              <MenuItem value="network">Network / VPN / WiFi</MenuItem>
              <MenuItem value="access">Access / Permissions</MenuItem>
              <MenuItem value="other">Other Inquiry</MenuItem>
            </TextField>
          </Grid>

          {/* Priority */}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Urgency / Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              size="small"
            >
              <MenuItem value="low">Low (Standard)</MenuItem>
              <MenuItem value="medium">Medium (Moderate impact)</MenuItem>
              <MenuItem value="high">High (Impairs work)</MenuItem>
              <MenuItem value="critical">Critical (Blocking operations)</MenuItem>
            </TextField>
          </Grid>

          {/* Requester Employee */}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Requester / Employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              size="small"
            >
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.jobTitle})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Lifecycle Status */}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Initial Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              size="small"
            >
              <MenuItem value="open">Open (Unassigned)</MenuItem>
              <MenuItem value="in_progress">In Progress (Active)</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </TextField>
          </Grid>

          {/* Assigned IT Staff */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Assigned IT Staff / Tech Lead"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g. IT Helpdesk / John Doe"
              size="small"
              helperText="Optional: Person responsible for resolving this issue"
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Detailed Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              placeholder="Provide exact error messages, affected device tags, or reproduction steps..."
              size="small"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: theme.palette.divider,
        }}
      >
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!title.trim()}
          sx={{
            bgcolor: '#EC4899',
            '&:hover': { bgcolor: '#DB2777' },
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '8px',
            px: 3,
          }}
        >
          Submit Ticket
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TicketModal;
