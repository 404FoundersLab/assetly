import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CategoryIcon from '@mui/icons-material/Category';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { usePermissions } from '../../hooks/storeHooks';
import { useAssetCategories } from '../../hooks/useAssetCategories';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { DeviceTypeFormDialog } from './DeviceTypeFormDialog';
import { deleteAssetCategory } from '../../services/api/entities';
import { reloadFromApi } from '../../components/DataBootstrap';
import { DEVICE_FAMILIES, DEVICE_FAMILY_LABELS } from '../../constants/deviceFamilies';
import type { AssetDeviceType } from '../../types';

export function DeviceTypesPage() {
  const dispatch = useAppDispatch();
  const { all } = useAssetCategories();
  const assets = useAppSelector((s) => s.assets.items);
  const { can } = usePermissions();
  const canWrite = can('asset_type:write');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetDeviceType | undefined>();
  const [error, setError] = useState<string | null>(null);

  const countBySlug = useMemo(
    () =>
      assets.reduce<Record<string, number>>((acc, a) => {
        acc[a.category] = (acc[a.category] ?? 0) + 1;
        return acc;
      }, {}),
    [assets],
  );

  const handleDelete = async (row: AssetDeviceType) => {
    if ((countBySlug[row.slug] ?? 0) > 0) {
      setError('This type is used by assets. Deactivate it instead of deleting.');
      return;
    }
    if (!window.confirm(`Delete device type “${row.label}”?`)) return;
    setError(null);
    try {
      await deleteAssetCategory(row.id);
      await reloadFromApi(dispatch);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete device type');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Device types"
        subtitle="Assign each type to IT Assets, Peripherals, Network devices, or Store devices."
        breadcrumbs={[{ label: 'IT Assets', to: '/assets' }, { label: 'Device types' }]}
        actions={
          canWrite ? (
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              Add type
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {all.length === 0 ? (
        <EmptyState
          icon={<CategoryIcon />}
          title="No device types"
          description="Add the first device type to start classifying assets."
        />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Menu</TableCell>
                  <TableCell>Used on</TableCell>
                  <TableCell>Requests</TableCell>
                  <TableCell>Status</TableCell>
                  {canWrite && <TableCell align="center">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {DEVICE_FAMILIES.flatMap((family) => {
                  const rows = all.filter((row) => row.family === family);
                  if (rows.length === 0) return [];
                  return [
                    <TableRow key={`family-${family}`}>
                      <TableCell
                        colSpan={canWrite ? 7 : 6}
                        sx={{ bgcolor: 'action.hover', fontWeight: 700, py: 1 }}
                      >
                        {DEVICE_FAMILY_LABELS[family]}
                      </TableCell>
                    </TableRow>,
                    ...rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {row.label}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {row.slug}
                          </Typography>
                        </TableCell>
                        <TableCell>{DEVICE_FAMILY_LABELS[row.family]}</TableCell>
                        <TableCell>{countBySlug[row.slug] ?? 0} assets</TableCell>
                        <TableCell>{row.showInRequests ? 'Yes' : '—'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.isActive ? 'Active' : 'Inactive'}
                            color={row.isActive ? 'success' : 'default'}
                            variant={row.isActive ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        {canWrite && (
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              aria-label="Edit device type"
                              onClick={() => {
                                setEditing(row);
                                setFormOpen(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              aria-label="Delete device type"
                              onClick={() => void handleDelete(row)}
                              disabled={row.id.startsWith('default-')}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    )),
                  ];
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <DeviceTypeFormDialog open={formOpen} onClose={() => setFormOpen(false)} deviceType={editing} />
    </Box>
  );
}
