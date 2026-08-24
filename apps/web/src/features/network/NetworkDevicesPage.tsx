import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
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
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RouterIcon from '@mui/icons-material/Router';
import SensorsIcon from '@mui/icons-material/Sensors';
import SensorsOffIcon from '@mui/icons-material/SensorsOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { generateDemoNetworkDevices, NETWORK_DEVICE_TYPE_LABELS } from '../../data/demoData';
import { replaceAllNetworkDevices } from '../../store/networkDevicesSlice';
import type { NetworkDeviceType } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';

const typeIcons: Record<NetworkDeviceType, string> = {
  cctv: '📹',
  wifi_router: '📶',
  switch: '🔀',
  gateway: '🌐',
  firewall: '🛡️',
  access_point: '📡',
};

export function NetworkDevicesPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const devices = useAppSelector((s) => s.networkDevices.items);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Re-seed if persisted store still has an empty list (pre-demo UI).
  useEffect(() => {
    if (devices.length === 0) {
      dispatch(replaceAllNetworkDevices(generateDemoNetworkDevices()));
    }
  }, [devices.length, dispatch]);

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.deviceTag.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.ipAddress.includes(q) ||
        d.location.toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || d.type === typeFilter;
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [devices, search, typeFilter, statusFilter]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const countsByType = useMemo(() => {
    const map: Record<string, number> = {};
    devices.forEach((d) => {
      map[d.type] = (map[d.type] ?? 0) + 1;
    });
    return map;
  }, [devices]);

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;
  const warningCount = devices.filter(
    (d) => d.status === 'warning' || d.status === 'maintenance',
  ).length;

  return (
    <Box>
      <PageHeader
        title="Network Devices"
        subtitle={`CCTV, WiFi, switches, gateways & firewalls · ${onlineCount}/${devices.length} online`}
      />

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.success.main}` }}>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SensorsIcon color="success" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Online
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                {onlineCount}
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.error.main}` }}>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SensorsOffIcon color="error" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Offline
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                {offlineCount}
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.warning.main}` }}>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <WarningAmberIcon color="warning" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Warning / maintenance
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                {warningCount}
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {(Object.keys(NETWORK_DEVICE_TYPE_LABELS) as NetworkDeviceType[]).map((type) => (
          <Chip
            key={type}
            label={`${typeIcons[type]} ${NETWORK_DEVICE_TYPE_LABELS[type]} (${countsByType[type] ?? 0})`}
            onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
            color={typeFilter === type ? 'primary' : 'default'}
            variant={typeFilter === type ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      <Card sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by name, IP, location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ minWidth: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Type"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All Types</MenuItem>
            {(Object.keys(NETWORK_DEVICE_TYPE_LABELS) as NetworkDeviceType[]).map((type) => (
              <MenuItem key={type} value={type}>
                {NETWORK_DEVICE_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="online">Online</MenuItem>
            <MenuItem value="offline">Offline</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
          </TextField>
        </Box>
      </Card>

      <Card>
        {devices.length === 0 ? (
          <EmptyState
            icon={<RouterIcon />}
            title="No network devices"
            description="Demo inventory will appear here once loaded."
          />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Device Tag</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((device) => (
                    <TableRow
                      key={device.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/network-devices/${device.id}`)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <RouterIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight={600}>
                            {device.deviceTag}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{device.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={NETWORK_DEVICE_TYPE_LABELS[device.type]}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {device.ipAddress}
                        </Typography>
                      </TableCell>
                      <TableCell>{device.location}</TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/network-devices/${device.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                          No devices match your filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
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
    </Box>
  );
}
