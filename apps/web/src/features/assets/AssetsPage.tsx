import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InventoryIcon from '@mui/icons-material/Inventory2';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { usePermissions } from '../../hooks/storeHooks';
import { StatusChip } from '../../components/StatusChip';
import { PageHeader } from '../../components/PageHeader';
import { SearchField } from '../../components/SearchField';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency, formatDate, daysUntil, getEmployeeName } from '../../utils/format';
import { assetMatchesSearch } from '../../utils/search';
import { STATUS_LABELS } from '../../data/demoData';
import { DEVICE_FAMILY_META } from '../../constants/deviceFamilies';
import { useAssetCategories } from '../../hooks/useAssetCategories';
import type { DeviceFamily } from '../../types';
import { AssetImportDialog } from './AssetImportDialog';

export function AssetsPage({ family = 'it_asset' }: { family?: DeviceFamily }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const warrantyFilter = searchParams.get('warranty');
  const assets = useAppSelector((s) => s.assets.items);
  const employees = useAppSelector((s) => s.employees.items);
  const vendors = useAppSelector((s) => s.vendors.items);
  const { can } = usePermissions();
  const { familyOf, typesInFamily, labelOf } = useAssetCategories();
  const meta = DEVICE_FAMILY_META[family];
  const familyTypes = typesInFamily(family);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [importOpen, setImportOpen] = useState(false);

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees],
  );
  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.name])),
    [vendors],
  );

  const scoped = useMemo(
    () => assets.filter((a) => familyOf(a.category) === family),
    [assets, family, familyOf],
  );

  const filtered = useMemo(() => {
    return scoped.filter((a) => {
      const assignee = a.assignedEmployeeId ? employeeMap[a.assignedEmployeeId] : undefined;
      const matchSearch = assetMatchesSearch(a, search, {
        assigneeName: assignee ? getEmployeeName(assignee.firstName, assignee.lastName) : undefined,
        vendorName: vendorMap[a.vendorId],
        categoryLabel: labelOf(a.category),
        statusLabel: STATUS_LABELS[a.status],
      });
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
      const matchWarranty =
        !warrantyFilter ||
        (daysUntil(a.warrantyExpiresAt) <= Number(warrantyFilter) && daysUntil(a.warrantyExpiresAt) >= 0);
      return matchSearch && matchStatus && matchCategory && matchWarranty;
    });
  }, [scoped, search, statusFilter, categoryFilter, warrantyFilter, employeeMap, vendorMap, labelOf]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const hasActiveFilters = Boolean(search || statusFilter !== 'all' || categoryFilter !== 'all' || warrantyFilter);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    if (warrantyFilter) navigate(meta.path);
    setPage(0);
  };

  const exportCsv = () => {
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['Asset Tag', 'Name', 'Status', 'Category', 'Serial', 'Assignee', 'Warranty'];
    const rows = filtered.map((a) => [
      a.assetTag,
      a.name,
      a.status,
      a.category,
      a.serialNumber,
      a.assignedEmployeeId ? getEmployeeName(employeeMap[a.assignedEmployeeId].firstName, employeeMap[a.assignedEmployeeId].lastName) : '',
      a.warrantyExpiresAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${family}-export.csv`;
    link.click();
  };

  return (
    <Box>
      <PageHeader
        title={meta.title}
        subtitle={`${filtered.length} of ${scoped.length} ${meta.title.toLowerCase()}${warrantyFilter ? ` · warranty expiring within ${warrantyFilter} days` : ''}`}
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: meta.menu }]}
        actions={
          <>
            <Button
              startIcon={<FileDownloadIcon />}
              variant="outlined"
              onClick={exportCsv}
              disabled={filtered.length === 0}
            >
              Export CSV
            </Button>
            {can('asset:write') && (
              <>
                <Button startIcon={<UploadFileIcon />} variant="outlined" onClick={() => setImportOpen(true)}>
                  Import Excel
                </Button>
                <Button startIcon={<AddIcon />} variant="contained" onClick={() => navigate(meta.newPath)}>
                  Add {family === 'it_asset' ? 'asset' : 'device'}
                </Button>
              </>
            )}
          </>
        }
      />

      <Card sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchField
            placeholder="Search tag, name, serial, assignee..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flex: 1, minWidth: { xs: '100%', sm: 280 } }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="deployed">Deployed</MenuItem>
            <MenuItem value="in_stock">In Stock</MenuItem>
            <MenuItem value="in_repair">In Repair</MenuItem>
            <MenuItem value="retired">Retired</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All types</MenuItem>
            {familyTypes.map((t) => (
              <MenuItem key={t.slug} value={t.slug}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          {warrantyFilter && (
            <Chip
              label={`Warranty ≤ ${warrantyFilter} days`}
              onDelete={() => navigate(meta.path)}
              color="warning"
              size="small"
            />
          )}
          {hasActiveFilters && (
            <Button
              size="small"
              startIcon={<FilterAltOffIcon />}
              onClick={clearFilters}
              sx={{ ml: { sm: 'auto' } }}
            >
              Clear filters
            </Button>
          )}
        </Box>
      </Card>

      <Card>
        {scoped.length === 0 ? (
          <EmptyState
            icon={<InventoryIcon />}
            title={`No ${meta.title.toLowerCase()} yet`}
            description={meta.subtitle}
            action={
              can('asset:write')
                ? {
                    label: 'Import from Excel',
                    onClick: () => setImportOpen(true),
                    icon: <UploadFileIcon />,
                  }
                : undefined
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FilterAltOffIcon />}
            title="No matching assets"
            description="Try adjusting your search or filters to find what you're looking for."
            action={{ label: 'Clear filters', onClick: clearFilters, icon: <FilterAltOffIcon /> }}
          />
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 340px)' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset Tag</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assignee</TableCell>
                    <TableCell>Warranty</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((asset) => {
                    const emp = asset.assignedEmployeeId ? employeeMap[asset.assignedEmployeeId] : null;
                    const warrantyDays = daysUntil(asset.warrantyExpiresAt);
                    return (
                      <TableRow
                        key={asset.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      >
                        <TableCell>
                          <Box component="span" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {asset.assetTag}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box component="span" sx={{ display: 'block', fontSize: '0.875rem' }}>
                            {asset.name}
                          </Box>
                          <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {[asset.manufacturer, asset.serialNumber].filter(Boolean).join(' · ') || '—'}
                          </Box>
                        </TableCell>
                        <TableCell>{labelOf(asset.category)}</TableCell>
                        <TableCell>
                          <StatusChip status={asset.status} />
                        </TableCell>
                        <TableCell>
                          {emp ? getEmployeeName(emp.firstName, emp.lastName) : '—'}
                        </TableCell>
                        <TableCell>
                          <Box
                            component="span"
                            sx={{
                              display: 'block',
                              fontSize: '0.875rem',
                              color: warrantyDays <= 30 ? 'warning.main' : 'text.primary',
                            }}
                          >
                            {formatDate(asset.warrantyExpiresAt)}
                          </Box>
                          {warrantyDays <= 90 && warrantyDays >= 0 && (
                            <Box component="span" sx={{ fontSize: '0.75rem', color: 'warning.main' }}>
                              {warrantyDays}d left
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(asset.currentValue)}</TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="View details">
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
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </Card>

      <AssetImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </Box>
  );
}
