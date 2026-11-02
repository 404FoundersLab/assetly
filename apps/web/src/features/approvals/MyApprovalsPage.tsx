import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { PageHeader } from '../../components/PageHeader';
import { useAuthUser } from '../../hooks/storeHooks';
import {
  fetchMyApprovals,
  submitApprovalAction,
  type ApprovalRequestDto,
} from '../../services/api/workflows';

export function MyApprovalsPage() {
  const user = useAuthUser();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [approvals, setApprovals] = useState<ApprovalRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Action Dialog state
  const [actionItem, setActionItem] = useState<{
    request: ApprovalRequestDto;
    action: 'approve' | 'reject';
  } | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadApprovals = async (targetTab = tab) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyApprovals(targetTab);
      setApprovals(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApprovals(tab);
  }, [tab]);

  const handleConfirmAction = async () => {
    if (!actionItem) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitApprovalAction(actionItem.request.id, actionItem.action, comment);
      setSuccessMsg(res.message);
      setActionItem(null);
      setComment('');
      await loadApprovals();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Approval In-box"
        subtitle="Review and sanction requests routed to you based on your organizational role or manager reporting hierarchy."
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => void loadApprovals()}>
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, val) => setTab(val)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab value="pending" label="Pending Your Review" />
        <Tab value="all" label="All Company Requests" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : approvals.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center', bgcolor: 'background.paper' }}>
          <AssignmentTurnedInIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" fontWeight={600}>
            {tab === 'pending' ? 'Inbox Zero! No Pending Approvals' : 'No Requests Found'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {tab === 'pending'
              ? 'You have approved or reviewed all assigned workflow stages.'
              : 'There are no active or previous approval requests registered in your organization.'}
          </Typography>
        </Card>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Request</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Requester</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Module</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Current Stage</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Submitted On</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvals.map((r) => {
                const isRequester = r.requesterId === user?.id;
                const isPending = r.status === 'pending';

                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {r.title}
                      </Typography>
                      {r.description && (
                        <Typography variant="caption" color="text.secondary">
                          {r.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {r.requesterName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.requesterEmail} ({r.requesterRole})
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.entityType.replace('_', ' ').toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        Level {r.currentStepOrder} of {r.totalSteps}: <strong>{r.currentStepName}</strong>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.status.toUpperCase()}
                        color={
                          r.status === 'approved'
                            ? 'success'
                            : r.status === 'rejected'
                            ? 'error'
                            : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {isPending && !isRequester ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleOutlineIcon />}
                            onClick={() => {
                              setActionItem({ request: r, action: 'approve' });
                              setComment('');
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<HighlightOffIcon />}
                            onClick={() => {
                              setActionItem({ request: r, action: 'reject' });
                              setComment('');
                            }}
                          >
                            Reject
                          </Button>
                        </Stack>
                      ) : isPending && isRequester ? (
                        <Tooltip title="Self-approval is blocked by policy">
                          <Chip label="Your Submission" size="small" variant="outlined" />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Completed
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Approve / Reject Dialog */}
      <Dialog
        open={Boolean(actionItem)}
        onClose={() => (submitting ? undefined : setActionItem(null))}
        maxWidth="xs"
        fullWidth
      >
        {actionItem && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              {actionItem.action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Are you sure you want to {actionItem.action}{' '}
                <strong>{actionItem.request.title}</strong> submitted by{' '}
                <strong>{actionItem.request.requesterName}</strong>?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={actionItem.action === 'reject' ? 'Rejection Reason (Required)' : 'Approval Comments (Optional)'}
                required={actionItem.action === 'reject'}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  actionItem.action === 'reject'
                    ? 'State the reason for rejecting this request...'
                    : 'Add optional notes or conditions for approval...'
                }
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setActionItem(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color={actionItem.action === 'approve' ? 'success' : 'error'}
                onClick={() => void handleConfirmAction()}
                disabled={submitting || (actionItem.action === 'reject' && !comment.trim())}
              >
                {submitting ? 'Processing...' : actionItem.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
