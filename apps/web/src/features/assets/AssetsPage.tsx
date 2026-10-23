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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InventoryIcon from '@mui/icons-material/Inventory2';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector, usePermissions } from '../../hooks/storeHooks';
import { StatusChip } from '../../components/StatusChip';
import { PageHeader } from '../../components/PageHeader';
import { SearchField } from '../../components/SearchField';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency, formatDate, daysUntil, getEmployeeName } from '../../utils/format';
import { assetMatchesSearch } from '../../utils/search';
import { STATUS_LABELS } from '../../data/demoData';
import { DEVICE_FAMILY_META } from '../../constants/deviceFamilies';
import { useAssetCategories } from '../../hooks/useAssetCategories';
import { deleteAsset, deleteAssets } from '../../services/api/assets';
import { reloadFromApi } from '../../components/DataBootstrap';
import type { Asset, DeviceFamily } from '../../types';
import { AssetImportDialog } from './AssetImportDialog';
import { AssetEditDialog } from './AssetEditDialog';

export function AssetsPage({ family = 'it_asset' }: { family?: DeviceFamily }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
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

  // Selection & bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);

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
        (warrantyFilter === 'expired'
          ? daysUntil(a.warrantyExpiresAt) < 0
          : daysUntil(a.warrantyExpiresAt) <= Number(warrantyFilter) && daysUntil(a.warrantyExpiresAt) >= 0);
      return matchSearch && matchStatus && matchCategory && matchWarranty;
    });
  }, [scoped, search, statusFilter, categoryFilter, warrantyFilter, employeeMap, vendorMap, labelOf]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const hasActiveFilters = Boolean(search || statusFilter !== 'all' || categoryFilter !== 'all' || warrantyFilter);

  const isAllPageSelected = paginated.length > 0 && paginated.every((a) => selectedIds.has(a.id));
  const isSomePageSelected = paginated.some((a) => selectedIds.has(a.id)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginated.forEach((a) => next.delete(a.id));
      } else {
        paginated.forEach((a) => next.add(a.id));
      }
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

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
        subtitle={`${filtered.length} of ${scoped.length} ${meta.title.toLowerCase()}${warrantyFilter ? (warrantyFilter === 'expired' ? ' · warranty expired' : ` · warranty expiring within ${warrantyFilter} days`) : ''}`}
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

      {/* Selected Action Toolbar */}
      {selectedIds.size > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: 'primary.50',
            border: 1,
            borderColor: 'primary.200',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${selectedIds.size} asset(s) selected`}
              color="primary"
              size="small"
              sx={{ fontWeight: 700 }}
            />
            {selectedIds.size < filtered.length && (
              <Button size="small" onClick={handleSelectAllFiltered}>
                Select all {filtered.length} {meta.title.toLowerCase()}
              </Button>
            )}
            <Button size="small" color="inherit" onClick={handleClearSelection}>
              Clear selection
            </Button>
          </Box>

          {can('asset:write') && (
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={() => {
                setAssetToDelete(null);
                setDeleteDialogOpen(true);
              }}
            >
              Delete {selectedIds.size} Selected
            </Button>
          )}
        </Paper>
      )}

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
                    {can('asset:write') && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={isSomePageSelected}
                          checked={isAllPageSelected}
                          onChange={handleToggleSelectAllPage}
                          inputProps={{ 'aria-label': 'Select all assets on page' }}
                        />
                      </TableCell>
                    )}
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
                    const isSelected = selectedIds.has(asset.id);
                    return (
                      <TableRow
                        key={asset.id}
                        hover
                        selected={isSelected}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      >
                        {can('asset:write') && (
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleSelect(asset.id)}
                              inputProps={{ 'aria-label': `Select asset ${asset.assetTag}` }}
                            />
                          </TableCell>
                        )}
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
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="View details">
                              <IconButton size="small" onClick={() => navigate(`/assets/${asset.id}`)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {can('asset:write') && (
                              <>
                                <Tooltip title="Edit asset">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => {
                                      setAssetToEdit(asset);
                                      setEditDialogOpen(true);
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete asset">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setAssetToDelete(asset);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
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
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Card>

      <AssetImportDialog open={importOpen} onClose={() => setImportOpen(false)} />

      {/* Inline Edit Asset Dialog */}
      {assetToEdit && (
        <AssetEditDialog
          open={editDialogOpen}
          asset={assetToEdit}
          onClose={() => {
            setEditDialogOpen(false);
            setAssetToEdit(null);
          }}
          onDeleted={() => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(assetToEdit.id);
              return next;
            });
          }}
        />
      )}

      {/* Delete Confirmation Dialog (Single or Bulk) */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteOutlineIcon />
          {assetToDelete ? 'Delete Asset' : `Delete ${selectedIds.size} Selected Asset(s)`}
        </DialogTitle>
        <DialogContent>
          {assetToDelete ? (
            <Typography variant="body2">
              Are you sure you want to delete asset <strong>{assetToDelete.assetTag}</strong> ({assetToDelete.name})?
            </Typography>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Are you sure you want to permanently delete <strong>{selectedIds.size}</strong> selected asset(s)?
              </Typography>
              <Box
                sx={{
                  maxHeight: 140,
                  overflowY: 'auto',
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.5,
                }}
              >
                {assets
                  .filter((a) => selectedIds.has(a.id))
                  .slice(0, 30)
                  .map((a) => (
                    <Chip key={a.id} label={a.assetTag} size="small" variant="outlined" />
                  ))}
                {selectedIds.size > 30 && (
                  <Chip label={`+${selectedIds.size - 30} more`} size="small" color="primary" />
                )}
              </Box>
            </>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            This will remove associated assignments and ownership history. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              try {
                if (assetToDelete) {
                  await deleteAsset(assetToDelete.id);
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(assetToDelete.id);
                    return next;
                  });
                } else {
                  await deleteAssets(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }
                await reloadFromApi(dispatch);
                setDeleteDialogOpen(false);
                setAssetToDelete(null);
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? 'Deleting…' : assetToDelete ? 'Delete Asset' : `Delete ${selectedIds.size} Assets`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
