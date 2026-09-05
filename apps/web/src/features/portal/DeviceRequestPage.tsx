import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../hooks/storeHooks';
import { isApiEnabled } from '../../services/api/config';
import { createAssetRequest, fetchAssetRequests } from '../../services/api/requests';
import { addRequest, replaceAllRequests } from '../../store/requestsSlice';
import {
  CATEGORY_LABELS,
  DEMO_DEPARTMENTS,
  DEMO_EMPLOYEES,
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
} from '../../data/demoData';
import type { AssetRequestType } from '../../types';
import { useAssetCategories } from '../../hooks/useAssetCategories';
import { LoadingButton } from '../../components/Loader';
import { ApiError } from '../../services/api/client';
import { EmployeeTicketsTab } from './EmployeeTicketsTab';

const REQUEST_TYPES: AssetRequestType[] = ['new', 'replacement', 'accessory'];

export function DeviceRequestPage() {
  const dispatch = useAppDispatch();
  const user = useAuthUser();
  const allRequests = useAppSelector((s) => s.requests.items);
  const departments = useAppSelector((s) => s.departments.items);
  const employees = useAppSelector((s) => s.employees.items);
  const assets = useAppSelector((s) => s.assets.items);
  const { requestSlugs, labelOf } = useAssetCategories();

  const [activeTab, setActiveTab] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [requestType, setRequestType] = useState<AssetRequestType>('new');
  const [category, setCategory] = useState('laptop');
  const [description, setDescription] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [assetsToReturn, setAssetsToReturn] = useState<typeof assets>([]);
  const [returnFeedback, setReturnFeedback] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const employeeProfile = useMemo(() => {
    if (!user?.employeeId) {
      return employees.find((e) => e.email?.toLowerCase() === user?.email?.toLowerCase());
    }
    return employees.find((e) => e.id === user.employeeId) ?? DEMO_EMPLOYEES.find((e) => e.id === user.employeeId);
  }, [employees, user]);

  const deptMap = useMemo(() => {
    const source = departments.length > 0 ? departments : DEMO_DEPARTMENTS;
    return Object.fromEntries(source.map((d) => [d.id, d.name]));
  }, [departments]);

  const myRequests = useMemo(() => {
    const employeeId = user?.employeeId ?? employeeProfile?.id;
    if (!employeeId) return allRequests.filter((r) => r.employeeEmail === user?.email);
    return allRequests.filter((r) => r.employeeId === employeeId);
  }, [allRequests, user, employeeProfile]);

  const myAssets = useMemo(() => {
    const employeeId = user?.employeeId ?? employeeProfile?.id;
    if (!employeeId) return [];
    return assets.filter((a) => a.assignedEmployeeId === employeeId);
  }, [assets, user, employeeProfile]);

  const loadRequests = useCallback(async () => {
    setFetching(true);
    try {
      const data = await fetchAssetRequests();
      dispatch(replaceAllRequests(data));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load your requests');
    } finally {
      setFetching(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!description.trim()) {
      setError('Please describe what you need and why.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        requestType,
        category,
        description: description.trim(),
        neededBy: neededBy || undefined,
      };

      const created = await createAssetRequest(payload);
      dispatch(addRequest(created));

      setDescription('');
      setNeededBy('');
      setSuccess('Your request has been submitted. IT will review it shortly.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReturnDialog = (assetsToRet: typeof assets) => {
    setAssetsToReturn(assetsToRet);
    setReturnFeedback('');
    setReturnDialogOpen(true);
  };

  const handleReturnSubmit = async () => {
    if (!returnFeedback.trim()) {
      setError('Please provide feedback or a reason for the return.');
      return;
    }

    setReturnSubmitting(true);
    try {
      const payload = {
        requestType: 'return' as const,
        category: assetsToReturn.length === 1 ? assetsToReturn[0].category : 'other',
        description: returnFeedback.trim(),
        assetIds: assetsToReturn.map(a => a.id),
      };

      const created = await createAssetRequest(payload);
      dispatch(addRequest(created));

      setSuccess(`Return request submitted for ${assetsToReturn.length} asset(s).`);
      setReturnDialogOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit return request');
    } finally {
      setReturnSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>
          My Portal
        </Typography>
        <LoadingButton
          variant="outlined"
          size="small"
          onClick={async () => {
            setRefreshTrigger((prev) => prev + 1);
            await loadRequests();
          }}
          loading={fetching}
          startIcon={<RefreshIcon />}
        >
          Refresh
        </LoadingButton>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v as number)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<DevicesOtherIcon />} iconPosition="start" label="Device Requests" />
        <Tab icon={<ConfirmationNumberIcon />} iconPosition="start" label="Support Tickets" />
      </Tabs>

      {activeTab === 1 ? (
        <EmployeeTicketsTab refreshTrigger={refreshTrigger} />
      ) : (
        <>
        <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Your details
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Name
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {user?.firstName} {user?.lastName}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {user?.email}
              </Typography>
              {user?.role !== 'employee' && (
                <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
                  (You are viewing this as {user?.role}. Log in as the employee to see their specific portal.)
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Department
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {employeeProfile ? deptMap[employeeProfile.departmentId] ?? '—' : '—'}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Request type</InputLabel>
                <Select
                  label="Request type"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as AssetRequestType)}
                >
                  {REQUEST_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {REQUEST_TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                >
                  {requestSlugs.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {labelOf(cat)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Business justification"
              placeholder="Describe what you need and why it is required for your work…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              multiline
              minRows={4}
              fullWidth
            />

            <TextField
              label="Needed by (optional)"
              type="date"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ maxWidth: 280 }}
            />

            <Box>
              <LoadingButton
                type="submit"
                variant="contained"
                loading={loading}
                startIcon={<SendIcon />}
                sx={{ minWidth: 160 }}
              >
                Submit request
              </LoadingButton>
            </Box>
          </Stack>
        </CardContent>
      </Card>


      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, mt: 4 }}>
        <Typography variant="h6" fontWeight={700}>
          My Assigned Devices
        </Typography>
        {myAssets.length > 0 && (
          <Button 
            variant="outlined" 
            color="warning" 
            size="small" 
            startIcon={<AssignmentReturnIcon />}
            onClick={() => handleOpenReturnDialog(myAssets)}
          >
            Return All
          </Button>
        )}
      </Box>

      <Card sx={{ mb: 4 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Asset Tag</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {myAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No devices currently assigned to you.
                  </TableCell>
                </TableRow>
              ) : (
                myAssets.map((asset) => (
                  <TableRow key={asset.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{asset.name}</TableCell>
                    <TableCell>
                      <Chip label={asset.assetTag} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{CATEGORY_LABELS[asset.category] ?? asset.category}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => handleOpenReturnDialog([asset])}
                      >
                        Return
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        My requests
      </Typography>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Needed by</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fetching && myRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Loading…
                  </TableCell>
                </TableRow>
              ) : myRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No requests yet. Submit your first request above.
                  </TableCell>
                </TableRow>
              ) : (
                myRequests.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell>{REQUEST_TYPE_LABELS[req.requestType]}</TableCell>
                    <TableCell>{CATEGORY_LABELS[req.category] ?? req.category}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" noWrap title={req.description}>
                        {req.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{req.neededBy ?? '—'}</TableCell>
                     <TableCell>
                      {req.reviewNotes ? (
                        <Tooltip title={`IT Note: ${req.reviewNotes}`} arrow placement="top">
                          <Chip
                            label={REQUEST_STATUS_LABELS[req.status]}
                            size="small"
                            color={REQUEST_STATUS_COLORS[req.status]}
                            sx={{ cursor: 'help' }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label={REQUEST_STATUS_LABELS[req.status]}
                          size="small"
                          color={REQUEST_STATUS_COLORS[req.status]}
                        />
                      )}
                    </TableCell>
                    <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Return Asset(s)</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You are initiating a return request for the following asset(s):
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
            {assetsToReturn.map(a => (
              <Chip key={a.id} label={`${a.name} (${a.assetTag})`} size="small" color="primary" variant="outlined" />
            ))}
          </Stack>
          <TextField
            fullWidth
            required
            label="Feedback / Reason for Return"
            placeholder="e.g. Leaving company, device broken, upgrading..."
            multiline
            minRows={3}
            value={returnFeedback}
            onChange={(e) => setReturnFeedback(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReturnDialogOpen(false)} disabled={returnSubmitting}>Cancel</Button>
          <LoadingButton 
            variant="contained" 
            color="primary" 
            onClick={handleReturnSubmit} 
            loading={returnSubmitting}
          >
            Submit Return Request
          </LoadingButton>
        </DialogActions>
      </Dialog>
        </> /* close tab 0 fragment */
      )} {/* end activeTab === 0 */}
    </Box>
  );
}
