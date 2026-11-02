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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { PageHeader } from '../../components/PageHeader';
import { fetchMyRequests, type ApprovalRequestDto } from '../../services/api/workflows';

export function MyRequestsPage() {
  const [requests, setRequests] = useState<ApprovalRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestDto | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyRequests();
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'approved':
        return <Chip icon={<CheckCircleIcon />} label="Approved" color="success" size="small" />;
      case 'rejected':
        return <Chip icon={<CancelIcon />} label="Rejected" color="error" size="small" />;
      case 'cancelled':
        return <Chip label="Cancelled" size="small" />;
      default:
        return <Chip icon={<HourglassEmptyIcon />} label="In Review" color="warning" size="small" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="My Requests & Approvals"
        subtitle="Track the real-time status and multi-stage workflow approvals of all your submitted requests."
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => void loadRequests()}>
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center', bgcolor: 'background.paper' }}>
          <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" fontWeight={600}>
            No Requests Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            When you submit a leave request, IT asset request, or purchase requisition, its multi-level approval timeline will appear here.
          </Typography>
        </Card>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Request Details</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Module</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Current Approval Level</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Approver</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
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
                    <Typography variant="body2">
                      {r.currentApproverName || r.currentApproverRole || 'Designated Approver'}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(r.status)}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setSelectedRequest(r)}
                    >
                      View Timeline
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Details & Approval History Timeline Dialog */}
      <Dialog
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedRequest && (
          <>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700}>
                Workflow Approval Timeline
              </Typography>
              <IconButton onClick={() => setSelectedRequest(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {selectedRequest.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Submitted by {selectedRequest.requesterName} ({selectedRequest.requesterRole}) on {new Date(selectedRequest.createdAt).toLocaleString()}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                  {getStatusChip(selectedRequest.status)}
                  <Chip
                    label={`Step ${selectedRequest.currentStepOrder} / ${selectedRequest.totalSteps}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Approval Progress & Audit Trail:
              </Typography>

              {(!selectedRequest.history || selectedRequest.history.length === 0) ? (
                <Typography variant="body2" color="text.secondary">
                  No approval history recorded yet.
                </Typography>
              ) : (
                <Stepper orientation="vertical">
                  {selectedRequest.history.map((h, idx) => {
                    const isReject = h.action === 'rejected';
                    const isApprove = h.action === 'approved';
                    const isSkip = h.action === 'auto_skipped';

                    return (
                      <Step key={h.id || idx} active completed={isApprove || isSkip}>
                        <StepLabel
                          error={isReject}
                          optional={
                            <Typography variant="caption" color="text.secondary">
                              {new Date(h.createdAt).toLocaleString()}
                            </Typography>
                          }
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {h.stepName} —{' '}
                            <span style={{ textTransform: 'capitalize' }}>
                              {h.action.replace('_', ' ')}
                            </span>
                          </Typography>
                        </StepLabel>
                        <StepContent>
                          <Typography variant="body2" color="text.secondary">
                            By: <strong>{h.actorName}</strong> ({h.actorRole})
                          </Typography>
                          {h.comment && (
                            <Box sx={{ mt: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                              <Typography variant="body2" fontStyle="italic">
                                &ldquo;{h.comment}&rdquo;
                              </Typography>
                            </Box>
                          )}
                        </StepContent>
                      </Step>
                    );
                  })}
                </Stepper>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedRequest(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
