import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { StatusChip } from '../../components/StatusChip';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { SearchField } from '../../components/SearchField';
import { formatCurrency, formatDate, getEmployeeName, daysUntil } from '../../utils/format';

export function SoftwarePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const assets = useAppSelector((s) => s.assets.items);
  const employees = useAppSelector((s) => s.employees.items);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees],
  );

  const software = useMemo(
    () => assets.filter((a) => a.category === 'software'),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return software.filter((a) => {
      const emp = a.assignedEmployeeId ? employeeMap[a.assignedEmployeeId] : null;
      const empName = emp ? getEmployeeName(emp.firstName, emp.lastName).toLowerCase() : '';
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        (a.manufacturer ?? '').toLowerCase().includes(q) ||
        empName.includes(q);
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [software, search, statusFilter, employeeMap]);

  const stats = useMemo(() => {
    const totalCost = software.reduce((s, a) => s + (a.purchaseCost || 0), 0);
    const assigned = software.filter((a) => a.assignedEmployeeId).length;
    const renewingSoon = software.filter((a) => {
      const d = daysUntil(a.warrantyExpiresAt);
      return d >= 0 && d <= 60;
    });
    return { totalCost, assigned, renewingSoon };
  }, [software]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <PageHeader
        title="Software SAM"
        subtitle={`${software.length} licenses and SaaS subscriptions · seat & renewal overview`}
      />

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.primary.main}` }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AttachMoneyIcon color="primary" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Annual / purchase cost
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                {formatCurrency(stats.totalCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.secondary.main}` }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PeopleIcon color="secondary" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Assigned seats
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                {stats.assigned}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  / {software.length}
                </Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.warning.main}` }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EventAvailableIcon color="warning" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Renewals ≤ 60 days
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                {stats.renewingSoon.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {stats.renewingSoon.length > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          sx={{ mb: 2 }}
        >
          <strong>{stats.renewingSoon.length}</strong> software item
          {stats.renewingSoon.length === 1 ? '' : 's'} renew within 60 days
          {stats.renewingSoon[0]
            ? ` — next: ${stats.renewingSoon[0].name} (${formatDate(stats.renewingSoon[0].warrantyExpiresAt)})`
            : ''}
          .
        </Alert>
      )}

      <Card>
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <SearchField
            placeholder="Search license, publisher, assignee…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ flex: 1, minWidth: 220 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="deployed">Deployed</MenuItem>
            <MenuItem value="in_stock">In stock</MenuItem>
            <MenuItem value="retired">Retired</MenuItem>
          </TextField>
        </Box>

        {software.length === 0 ? (
          <EmptyState
            icon={<CodeIcon />}
            title="No software assets found"
            description="Add assets with category “software” to track licenses and SaaS renewals here."
          />
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">No licenses match your filters.</Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>License / Name</TableCell>
                    <TableCell>Publisher</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Renewal</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((asset) => {
                    const emp = asset.assignedEmployeeId ? employeeMap[asset.assignedEmployeeId] : null;
                    const days = daysUntil(asset.warrantyExpiresAt);
                    const renewSoon = days >= 0 && days <= 60;
                    return (
                      <TableRow
                        key={asset.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {asset.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {asset.assetTag}
                          </Typography>
                        </TableCell>
                        <TableCell>{asset.manufacturer || '—'}</TableCell>
                        <TableCell>
                          <StatusChip status={asset.status} />
                        </TableCell>
                        <TableCell>
                          {emp ? getEmployeeName(emp.firstName, emp.lastName) : (
                            <Chip size="small" label="Unassigned" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography variant="body2">
                              {formatDate(asset.warrantyExpiresAt) || '—'}
                            </Typography>
                            {renewSoon && (
                              <Chip
                                size="small"
                                color="warning"
                                label={`${days}d`}
                                sx={{ height: 22 }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{formatCurrency(asset.purchaseCost)}</TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="View asset">
                            <IconButton size="small" onClick={() => navigate(`/assets/${asset.id}`)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </Card>

      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mt: 1.5, px: 0.5 }}
      >
        Note: true license-seat reconciliation with endpoint installed apps will land with the backend.
        This view uses software-category assets from inventory.
      </Typography>
    </Box>
  );
}
