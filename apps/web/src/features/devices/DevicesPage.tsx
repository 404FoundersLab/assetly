import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { usePermissions } from '../../hooks/storeHooks';
import { StatusChip } from '../../components/StatusChip';
import { CATEGORY_LABELS, STATUS_LABELS } from '../../data/demoData';
import { PERIPHERAL_CATEGORIES } from '../../types';
import { formatCurrency, getEmployeeName } from '../../utils/format';
import { assetMatchesSearch } from '../../utils/search';

const categoryIcons: Record<string, string> = {
  monitor: '🖥️',
  keyboard: '⌨️',
  mouse: '🖱️',
  webcam: '📷',
  headset: '🎧',
};

export function DevicesPage() {
  const navigate = useNavigate();
  const allAssets = useAppSelector((s) => s.assets.items);
  const employees = useAppSelector((s) => s.employees.items);
  const vendors = useAppSelector((s) => s.vendors.items);
  const { can } = usePermissions();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const devices = useMemo(
    () => allAssets.filter((a) => PERIPHERAL_CATEGORIES.includes(a.category)),
    [allAssets],
  );

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees],
  );
  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.name])),
    [vendors],
  );

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const assignee = d.assignedEmployeeId ? employeeMap[d.assignedEmployeeId] : undefined;
      const matchSearch = assetMatchesSearch(d, search, {
        assigneeName: assignee ? getEmployeeName(assignee.firstName, assignee.lastName) : undefined,
        vendorName: vendorMap[d.vendorId],
        categoryLabel: CATEGORY_LABELS[d.category],
        statusLabel: STATUS_LABELS[d.status],
      });
      const matchCategory = categoryFilter === 'all' || d.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [devices, search, categoryFilter, employeeMap, vendorMap]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const countsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    devices.forEach((d) => {
      map[d.category] = (map[d.category] ?? 0) + 1;
    });
    return map;
  }, [devices]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Devices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitors, keyboards, mice, webcams & headsets · {devices.length} items
          </Typography>
        </Box>
        {can('asset:write') && (
          <Button variant="contained" onClick={() => navigate('/assets')}>
            Add via Assets
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {PERIPHERAL_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={`${categoryIcons[cat] ?? ''} ${CATEGORY_LABELS[cat]} (${countsByCategory[cat] ?? 0})`}
            onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
            color={categoryFilter === cat ? 'primary' : 'default'}
            variant={categoryFilter === cat ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      <Card sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search tag, name, serial, category, status, assignee, location..."
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
            label="Category"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {PERIPHERAL_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device Tag</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Manufacturer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((device) => {
                const emp = device.assignedEmployeeId ? employeeMap[device.assignedEmployeeId] : null;
                return (
                  <TableRow
                    key={device.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/assets/${device.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {device.assetTag}
                      </Typography>
                    </TableCell>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={CATEGORY_LABELS[device.category]}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{device.manufacturer}</TableCell>
                    <TableCell>
                      <StatusChip status={device.status} />
                    </TableCell>
                    <TableCell>
                      {emp ? getEmployeeName(emp.firstName, emp.lastName) : '—'}
                    </TableCell>
                    <TableCell>{device.location}</TableCell>
                    <TableCell align="right">{formatCurrency(device.currentValue)}</TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={() => navigate(`/assets/${device.id}`)}>
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
      </Card>
    </Box>
  );
}
