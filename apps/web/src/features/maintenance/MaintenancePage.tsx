import { useMemo, useState } from 'react';
import {
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
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { StatusChip } from '../../components/StatusChip';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { SearchField } from '../../components/SearchField';
import { formatCurrency, getEmployeeName } from '../../utils/format';
import { CATEGORY_LABELS } from '../../data/demoData';

type QueueFilter = 'all' | 'in_repair' | 'maintenance';

export function MaintenancePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const assets = useAppSelector((s) => s.assets.items);
  const employees = useAppSelector((s) => s.employees.items);
  const vendors = useAppSelector((s) => s.vendors.items);

  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees],
  );
  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.name])),
    [vendors],
  );

  const queue = useMemo(() => {
    return assets.filter(
      (a) => a.status === 'in_repair' || a.lifecycleStage === 'maintenance',
    );
  }, [assets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue.filter((a) => {
      if (queueFilter === 'in_repair' && a.status !== 'in_repair') return false;
      if (queueFilter === 'maintenance' && a.lifecycleStage !== 'maintenance') return false;
      if (!q) return true;
      const emp = a.assignedEmployeeId ? employeeMap[a.assignedEmployeeId] : null;
      const empName = emp ? getEmployeeName(emp.firstName, emp.lastName).toLowerCase() : '';
      return (
        a.name.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        empName.includes(q) ||
        (vendorMap[a.vendorId] ?? '').toLowerCase().includes(q)
      );
    });
  }, [queue, search, queueFilter, employeeMap, vendorMap]);

  const stats = useMemo(() => {
    const inRepair = queue.filter((a) => a.status === 'in_repair').length;
    const lifecycleMaint = queue.filter((a) => a.lifecycleStage === 'maintenance').length;
    const repairSpend = queue.reduce((s, a) => s + (a.repairCost || 0), 0);
    return { inRepair, lifecycleMaint, repairSpend };
  }, [queue]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <PageHeader
        title="Maintenance"
        subtitle={`${queue.length} assets in repair or maintenance · work-order style queue`}
      />

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.error.main}` }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <HandymanIcon color="error" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  In repair
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                {stats.inRepair}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.warning.main}` }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ScheduleIcon color="warning" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Lifecycle: maintenance
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                {stats.lifecycleMaint}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.info.main}` }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AttachMoneyIcon color="info" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Repair cost (queue)
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                {formatCurrency(stats.repairSpend)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <SearchField
            placeholder="Search asset, assignee, vendor…"
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
            label="Queue"
            value={queueFilter}
            onChange={(e) => {
              setQueueFilter(e.target.value as QueueFilter);
              setPage(0);
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All in queue</MenuItem>
            <MenuItem value="in_repair">In repair only</MenuItem>
            <MenuItem value="maintenance">Lifecycle maintenance</MenuItem>
          </TextField>
        </Box>

        {queue.length === 0 ? (
          <EmptyState
            icon={<BuildIcon />}
            title="No assets in maintenance"
            description="Mark assets as in_repair or set lifecycle stage to maintenance to populate this queue."
          />
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">No assets match your filters.</Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Work item</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assignee</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Lifecycle</TableCell>
                    <TableCell align="right">Repair cost</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((asset) => {
                    const emp = asset.assignedEmployeeId ? employeeMap[asset.assignedEmployeeId] : null;
                    return (
                      <TableRow
                        key={asset.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {asset.assetTag}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {asset.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{CATEGORY_LABELS[asset.category] || asset.category}</TableCell>
                        <TableCell>
                          <StatusChip status={asset.status} />
                        </TableCell>
                        <TableCell>
                          {emp ? getEmployeeName(emp.firstName, emp.lastName) : '—'}
                        </TableCell>
                        <TableCell>{vendorMap[asset.vendorId] || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={asset.lifecycleStage.replace(/_/g, ' ')}
                            variant="outlined"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {asset.repairCost ? formatCurrency(asset.repairCost) : '—'}
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Open asset">
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
        Full work orders (technician, SLA, RMA) will connect when the maintenance API is added.
      </Typography>
    </Box>
  );
}
