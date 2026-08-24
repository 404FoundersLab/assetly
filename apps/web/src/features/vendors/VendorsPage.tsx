import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  IconButton,
  Link,
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
import { useAppSelector } from '../../hooks/storeHooks';
import { usePermissions } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { VendorFormDialog } from './VendorFormDialog';
import type { Vendor } from '../../types';

export function VendorsPage() {
  const vendors = useAppSelector((s) => s.vendors.items);
  const assets = useAppSelector((s) => s.assets.items);
  const { can } = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | undefined>();

  const countByVendor = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.vendorId] = (acc[a.vendorId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Box>
      <PageHeader
        title="Vendors"
        subtitle="Hardware and software suppliers"
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Vendors' }]}
        actions={
          can('vendor:write') ? (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
              Add Vendor
            </Button>
          ) : undefined
        }
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell>Contact Email</TableCell>
                <TableCell>Website</TableCell>
                <TableCell align="right">Assets</TableCell>
                {can('vendor:write') && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {vendor.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{vendor.contactEmail}</TableCell>
                  <TableCell>
                    {vendor.website ? (
                      <Link href={vendor.website} target="_blank" rel="noopener">
                        {vendor.website.replace('https://', '')}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="right">{countByVendor[vendor.id] ?? 0}</TableCell>
                  {can('vendor:write') && (
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => { setEditing(vendor); setFormOpen(true); }} aria-label="Edit vendor">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <VendorFormDialog open={formOpen} onClose={() => setFormOpen(false)} vendor={editing} />
    </Box>
  );
}
