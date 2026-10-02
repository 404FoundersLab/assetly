import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { PageHeader } from '../../../components/PageHeader';

interface HRRequest {
  id: string;
  type: string;
  employeeName: string;
  department: string;
  purpose: string;
  appliedDate: string;
  status: 'pending' | 'completed' | 'in_progress';
}

const INITIAL_REQUESTS: HRRequest[] = [
  { id: '1', type: 'Bonafide Certificate', employeeName: 'Sarah Chen', department: 'Engineering', purpose: 'Visa / Embassy application for international tech conference', appliedDate: '2026-10-01', status: 'completed' },
  { id: '2', type: 'Salary / Income Certificate', employeeName: 'Alex Thompson', department: 'Engineering', purpose: 'Home loan verification with bank', appliedDate: '2026-10-02', status: 'in_progress' },
  { id: '3', type: 'Address Proof Letter', employeeName: 'Jordan Smith', department: 'Human Resources', purpose: 'Apartment lease agreement KYC', appliedDate: '2026-10-02', status: 'pending' },
  { id: '4', type: 'Health Insurance Nominee Update', employeeName: 'Priya Patel', department: 'Finance', purpose: 'Add newborn dependent to corporate mediclaim policy', appliedDate: '2026-09-29', status: 'completed' },
];

export function HRRequestsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [requests, setRequests] = useState<HRRequest[]>(INITIAL_REQUESTS);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ type: 'Bonafide Certificate', employeeName: 'Current User', purpose: '' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq: HRRequest = {
      id: String(Date.now()),
      type: form.type,
      employeeName: 'Vasanth (Admin)',
      department: 'Executive',
      purpose: form.purpose || 'Official employee request',
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'pending',
    };

    setRequests([newReq, ...requests]);
    setOpenModal(false);
    setForm({ type: 'Bonafide Certificate', employeeName: '', purpose: '' });
  };

  const handleStatusChange = (id: string, newStatus: HRRequest['status']) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="HR Helpdesk & Letter Requests"
        subtitle="Process employee bonafide certificates, salary letters, insurance endorsements, and grievance queries"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            New HR Request
          </Button>
        }
      />

      {/* Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, mt: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Request ID</TableCell>
                <TableCell>Document / Service Type</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Purpose & Notes</TableCell>
                <TableCell>Applied Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>#{r.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon sx={{ fontSize: 18 }} />
                      {r.type}
                    </Box>
                  </TableCell>
                  <TableCell>{r.employeeName}</TableCell>
                  <TableCell>{r.department}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{r.purpose}</TableCell>
                  <TableCell>{r.appliedDate}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.status.replace('_', ' ').toUpperCase()}
                      size="small"
                      color={r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'primary' : 'warning'}
                      sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {r.status !== 'completed' && (
                        <Tooltip title="Mark Completed & Issue">
                          <IconButton
                            size="small"
                            onClick={() => handleStatusChange(r.id, 'completed')}
                            sx={{ color: '#10B981', bgcolor: alpha('#10B981', 0.1) }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 800 }}>Submit HR Request</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                select
                required
                fullWidth
                label="Request Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <MenuItem value="Bonafide Certificate">Bonafide Certificate (Employment Proof)</MenuItem>
                <MenuItem value="Salary / Income Certificate">Salary / Income Certificate</MenuItem>
                <MenuItem value="Address Proof Letter">Address Proof Letter (KYC)</MenuItem>
                <MenuItem value="Health Insurance Nominee Update">Health Insurance Nominee Update</MenuItem>
                <MenuItem value="Relocation Allowance Claim">Relocation Allowance Claim</MenuItem>
                <MenuItem value="Experience Letter / Relieving Draft">Experience Letter / Relieving Draft</MenuItem>
              </TextField>
              <TextField
                required
                fullWidth
                multiline
                rows={3}
                label="Purpose & Addressee"
                placeholder="State the institution/bank/embassy name and why this document is required..."
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
              Submit Request
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
