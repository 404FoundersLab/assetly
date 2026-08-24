import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Autocomplete,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { usePermissions } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { SearchField } from '../../components/SearchField';
import { EmptyState } from '../../components/EmptyState';
import { fetchAssetRequests, reviewAssetRequest } from '../../services/api/requests';
import { fetchTickets, updateTicket as updateTicketApi } from '../../services/api/tickets';
import { replaceAllRequests, updateRequest } from '../../store/requestsSlice';
import { replaceAllTickets, updateTicket } from '../../store/ticketsSlice';
import { reloadFromApi } from '../../components/DataBootstrap';
import {
  CATEGORY_LABELS,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
} from '../../data/demoData';
import type { AssetRequest, AssetRequestStatus, SupportTicket, TicketStatus } from '../../types';
import { LoadingButton } from '../../components/Loader';
import { ApiError } from '../../services/api/client';

type StatusFilter = 'all' | AssetRequestStatus;

const TICKET_STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open',        label: 'Open'        },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved'    },
  { value: 'closed',      label: 'Closed'      },
];

const TICKET_STATUS_CHIP: Record<TicketStatus, { label: string; color: 'default' | 'info' | 'success' | 'warning' | 'error' }> = {
  open:        { label: 'Open',        color: 'info'    },
  in_progress: { label: 'In Progress', color: 'warning' },
  resolved:    { label: 'Resolved',    color: 'success' },
  closed:      { label: 'Closed',      color: 'default' },
};

const PRIORITY_COLOR: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#7c3aed',
};

const CATEGORY_EMOJI: Record<string, string> = {
  hardware: '🖥️', software: '💻', access: '🔐', network: '📡', other: '🔧',
};

export function RequestsPage() {
  const dispatch = useAppDispatch();
  const requests = useAppSelector((s) => s.requests.items);
  const tickets  = useAppSelector((s) => s.tickets.items);
  const assets   = useAppSelector((s) => s.assets.items);
  const { can } = usePermissions();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<AssetRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'fulfilled' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Ticket review state
  const [ticketTarget, setTicketTarget] = useState<SupportTicket | null>(null);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('open');
  const [ticketNotes, setTicketNotes] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAssetRequests();
      dispatch(replaceAllRequests(data));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const data = await fetchTickets();
      dispatch(replaceAllTickets(data));
    } catch {
      /* silently skip if table not migrated yet */
    } finally {
      setTicketsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadRequests();
    void loadTickets();
  }, [loadRequests, loadTickets]);

  const availableAssets = useMemo(() => {
    return assets.filter((a) => a.status === 'in_stock');
  }, [assets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        req.employeeName,
        req.employeeEmail,
        req.departmentName,
        req.description,
        REQUEST_TYPE_LABELS[req.requestType],
        CATEGORY_LABELS[req.category],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, search, statusFilter]);

  const openReview = (req: AssetRequest, action: 'approved' | 'rejected' | 'fulfilled') => {
    setReviewTarget(req);
    setReviewAction(action);
    setReviewNotes(req.reviewNotes ?? '');
  };

  const closeReview = () => {
    setReviewTarget(null);
    setReviewAction(null);
    setReviewNotes('');
    setSelectedAsset(null);
  };

  const handleReviewSubmit = async () => {
    if (!reviewTarget || !reviewAction) return;
    if (reviewAction === 'fulfilled' && reviewTarget.requestType !== 'return' && !selectedAsset) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const updated = await reviewAssetRequest(
        reviewTarget.id,
        reviewAction,
        reviewNotes || undefined,
        selectedAsset?.id
      );
      dispatch(updateRequest(updated));
      await reloadFromApi(dispatch);
      closeReview();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update request');
    } finally {
      setSubmitting(false);
    }
  };

  const openTicketReview = (t: SupportTicket) => {
    setTicketTarget(t);
    setTicketStatus(t.status);
    setTicketNotes(t.resolutionNotes ?? '');
  };

  const handleTicketSubmit = async () => {
    if (!ticketTarget) return;
    setTicketSubmitting(true);
    try {
      const updated = await updateTicketApi(ticketTarget.id, {
        status: ticketStatus,
        resolutionNotes: ticketNotes || undefined,
      });
      dispatch(updateTicket(updated));
      setTicketTarget(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update ticket');
    } finally {
      setTicketSubmitting(false);
    }
  };

  if (!can('request:review')) {
    return (
      <Box>
        <PageHeader title="Device Requests" breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Requests' }]} />
        <Alert severity="warning">You do not have permission to review device requests.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Requests & Tickets"
        subtitle="Manage employee device requests and IT support tickets"
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Requests' }]}
        actions={
          <LoadingButton
            variant="outlined"
            size="small"
            onClick={async () => {
              await loadRequests();
              await loadTickets();
            }}
            loading={loading || ticketsLoading}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </LoadingButton>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v as number)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<AssignmentIcon />} iconPosition="start" label={`Device Requests (${requests.length})`} />
        <Tab icon={<ConfirmationNumberIcon />} iconPosition="start" label={`Support Tickets (${tickets.length})`} />
      </Tabs>

      {activeTab === 0 && (
        <>
        <Card sx={{ mb: 2, p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SearchField
            placeholder="Search employee, department, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <MenuItem value="all">All statuses</MenuItem>
              {Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Card>

      <Card>
        {loading && requests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading requests…</Box>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<AssignmentIcon />}
            title="No requests found"
            description="Employee device requests will appear here for review."
          />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Needed by</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {req.employeeName ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {req.employeeEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>{req.departmentName ?? '—'}</TableCell>
                    <TableCell>{REQUEST_TYPE_LABELS[req.requestType]}</TableCell>
                    <TableCell>{CATEGORY_LABELS[req.category] ?? req.category}</TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Typography variant="body2" noWrap title={req.description}>
                        {req.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{req.neededBy ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={REQUEST_STATUS_LABELS[req.status]}
                        size="small"
                        color={REQUEST_STATUS_COLORS[req.status]}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {req.status === 'submitted' && (
                          <>
                            <Tooltip title="Approve">
                              <Button
                                size="small"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => openReview(req, 'approved')}
                              >
                                Approve
                              </Button>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <Button
                                size="small"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => openReview(req, 'rejected')}
                              >
                                Reject
                              </Button>
                            </Tooltip>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <Tooltip title="Mark as fulfilled">
                            <Button
                              size="small"
                              startIcon={<DoneAllIcon />}
                              onClick={() => openReview(req, 'fulfilled')}
                            >
                              Fulfill
                            </Button>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

        <Dialog open={Boolean(reviewTarget)} onClose={closeReview} maxWidth="sm" fullWidth>
          <DialogTitle>
            {reviewAction === 'approved' && 'Approve request'}
            {reviewAction === 'rejected' && 'Reject request'}
            {reviewAction === 'fulfilled' && 'Mark request fulfilled'}
          </DialogTitle>
          <DialogContent>
            {reviewTarget && (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {reviewTarget.employeeName} · {REQUEST_TYPE_LABELS[reviewTarget.requestType]} ·{' '}
                  {CATEGORY_LABELS[reviewTarget.category]}
                </Typography>
                <Typography variant="body2">{reviewTarget.description}</Typography>
                
                {reviewAction === 'fulfilled' && reviewTarget.requestType !== 'return' && (
                  <Autocomplete
                    options={availableAssets}
                    getOptionLabel={(option) => `${option.name} (${option.assetTag}) — ${option.category}`}
                    value={selectedAsset}
                    onChange={(_, newValue) => setSelectedAsset(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Asset (searchable by Tag or Name)"
                        required
                        placeholder="Search asset tag or name..."
                      />
                    )}
                    fullWidth
                  />
                )}

                <TextField
                  label="Notes for employee (optional)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeReview}>Cancel</Button>
            <LoadingButton
              variant="contained"
              color={reviewAction === 'rejected' ? 'error' : 'primary'}
              loading={submitting}
              disabled={reviewAction === 'fulfilled' && reviewTarget?.requestType !== 'return' && !selectedAsset}
              onClick={handleReviewSubmit}
            >
              Confirm
            </LoadingButton>
          </DialogActions>
        </Dialog>
        </> /* close tab 0 fragment */
      )} {/* end Tab 0 */}

      {/* ── Tab 1: Support Tickets ── */}
      {activeTab === 1 && (
        <>
          <Card>
            {ticketsLoading && tickets.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading tickets…</Box>
            ) : tickets.length === 0 ? (
              <EmptyState
                icon={<ConfirmationNumberIcon />}
                title="No tickets yet"
                description="Employee support tickets will appear here."
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Raised</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tickets.map((t) => {
                      const st = TICKET_STATUS_CHIP[t.status];
                      return (
                        <TableRow key={t.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{t.employeeName ?? '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">{t.employeeEmail}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{t.title}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220, display: 'block' }}>
                              {t.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {CATEGORY_EMOJI[t.category]} {t.category}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_COLOR[t.priority] ?? '#94a3b8' }} />
                              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{t.priority}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={st.label} color={st.color} size="small" />
                          </TableCell>
                          <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Update ticket">
                              <Button size="small" startIcon={<EditIcon />} onClick={() => openTicketReview(t)}>
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
            )}
          </Card>

          {/* Ticket update dialog */}
          <Dialog open={Boolean(ticketTarget)} onClose={() => setTicketTarget(null)} maxWidth="sm" fullWidth>
            <DialogTitle fontWeight={700}>Update Ticket</DialogTitle>
            <DialogContent dividers>
              {ticketTarget && (
                <Stack spacing={2.5} sx={{ pt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>{ticketTarget.employeeName}</strong> — {ticketTarget.title}
                  </Typography>
                  <Typography variant="body2">{ticketTarget.description}</Typography>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      label="Status"
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value as TicketStatus)}
                    >
                      {TICKET_STATUS_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Resolution / Notes for employee"
                    value={ticketNotes}
                    onChange={(e) => setTicketNotes(e.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTicketTarget(null)}>Cancel</Button>
              <LoadingButton
                variant="contained"
                loading={ticketSubmitting}
                onClick={() => void handleTicketSubmit()}
              >
                Save Changes
              </LoadingButton>
            </DialogActions>
          </Dialog>
        </>
      )} {/* end Tab 1 */}
    </Box>
  );
}
