import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  TextField,
  Typography,
  alpha,
  Autocomplete,
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';

import { PageHeader } from '../../components/PageHeader';
import { AssetQrPanel } from '../../components/AssetQrPanel';
import { LoadingButton } from '../../components/Loader';
import { reloadFromApi } from '../../components/DataBootstrap';

import { createAsset as createAssetApi } from '../../services/api/assets';
import { uploadImage } from '../../services/api/entities';
import { EmployeeFormDialog } from '../employees/EmployeeFormDialog';
import { STATUS_LABELS } from '../../data/demoData';
import { useAssetCategories } from '../../hooks/useAssetCategories';
import { DEVICE_FAMILY_META, isDeviceFamily } from '../../constants/deviceFamilies';
import {
  ASSET_STATUSES,
  LIFECYCLE_LABELS,
  LIFECYCLE_STAGES,
  createEmptyAssetForm,
  findEmployeeByAssigneeName,
  generateAssetTag,
  readImageAsDataUrl,
  type AssetFormState,
} from '../../utils/assetUtils';
import type { AssetStatus } from '../../types';

interface CreatedAsset {
  id: string;
  assetTag: string;
  name: string;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ mb: 2.5 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          color="text.secondary"
          sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}
        >
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

type EmployeeOption = {
  id?: string;
  firstName?: string;
  lastName?: string;
  inputValue?: string;
};
const filter = createFilterOptions<EmployeeOption>();

export function NewAssetPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const vendors = useAppSelector((s) => s.vendors.items);
  const employees = useAppSelector((s) => s.employees.items);
  const departments = useAppSelector((s) => s.departments.items);
  const assets = useAppSelector((s) => s.assets.items);
  const { slugs, labelOf, types } = useAssetCategories();
  const [searchParams] = useSearchParams();
  const familyParam = searchParams.get('family');
  const selectedFamily = isDeviceFamily(familyParam ?? '') ? familyParam : undefined;
  const typeSlugs = useMemo(
    () => (selectedFamily ? types.filter((t) => t.family === selectedFamily).map((t) => t.slug) : slugs),
    [selectedFamily, types, slugs],
  );
  const familyMeta = selectedFamily ? DEVICE_FAMILY_META[selectedFamily] : DEVICE_FAMILY_META.it_asset;

  const [form, setForm] = useState<AssetFormState>(() =>
    createEmptyAssetForm(typeSlugs[0] ?? 'laptop'),
  );

  useEffect(() => {
    if (typeSlugs.length && !typeSlugs.includes(form.category)) {
      setForm((prev) => ({ ...prev, category: typeSlugs[0] }));
    }
  }, [typeSlugs, form.category]);

  const isHardware = ['laptop', 'desktop', 'server', 'mobile', 'network'].includes(form.category);
  const hardwareAssets = useMemo(
    () => assets.filter(a => ['laptop', 'desktop', 'server', 'mobile', 'network'].includes(a.category)),
    [assets]
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdItem, setCreatedItem] = useState<CreatedAsset | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);

  const set = (field: keyof AssetFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const departmentOptions = useMemo(
    () => departments.map((d) => d.name),
    [departments],
  );

  const handleImageChange = async (file: File | null) => {
    setImageFile(file);
    if (!file) {
      setImagePreview(null);
      setForm((prev) => ({ ...prev, imageUrl: undefined }));
      return;
    }
    const dataUrl = await readImageAsDataUrl(file);
    setImagePreview(dataUrl);
    setForm((prev) => ({ ...prev, imageUrl: dataUrl }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.assetTag.trim() || !form.name.trim()) return;

    setLoading(true);
    try {
      const assignedEmployeeId = isHardware ? findEmployeeByAssigneeName(form.assignedTo, employees) : undefined;
      const assignedAssetId = !isHardware && form.assignedAssetId ? form.assignedAssetId : undefined;
      const purchaseCost = Number(form.purchaseCost) || 0;
      const currentValue = Number(form.currentValue) || purchaseCost;
      const repairCost = Number(form.repairCost) || 0;
      const status: AssetStatus = assignedEmployeeId || assignedAssetId ? 'deployed' : (form.status as AssetStatus);

      const notes = [form.specs && `Specs: ${form.specs}`, form.notes].filter(Boolean).join('\n\n') || undefined;
      const assignedBy = `${user.firstName} ${user.lastName}`;

      let imageUrl = form.imageUrl;
      if (imageUrl && imageFile) {
        const uploaded = await uploadImage(imageUrl, imageFile.name);
        imageUrl = uploaded.url;
      }
      const created = await createAssetApi({
        id: crypto.randomUUID(),
        tenantId: user.tenantId,
        assetTag: form.assetTag.trim(),
        name: form.name.trim(),
        category: form.category,
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        serialNumber: form.category !== 'software' ? form.serialNumber.trim() : '',
        activationKey: form.category === 'software' ? form.activationKey?.trim() : undefined,
        status,
        lifecycleStage: form.lifecycleStage,
        purchaseDate: form.purchaseDate || new Date().toISOString().split('T')[0],
        purchaseCost,
        currentValue,
        repairCost,
        location: form.location.trim() || 'HQ',
        vendorId: form.vendorId,
        warrantyExpiresAt: form.warrantyExpiresAt || createEmptyAssetForm().warrantyExpiresAt,
        specs: form.specs.trim() || undefined,
        department: form.department.trim() || undefined,
        imageUrl,
        notes,
        assignedEmployeeId,
        assignedAssetId,
        assignedBy: assignedEmployeeId || assignedAssetId ? assignedBy : undefined,
        qrOrigin: window.location.origin,
        audit: {
          userId: user.id,
          userName: assignedBy,
          action: 'CREATE',
          entityType: 'asset',
          entityId: 'new',
          entityLabel: form.assetTag.trim(),
          details: `Created ${form.name.trim()}${imageFile ? ' with image' : ''}`,
        },
      });
      await reloadFromApi(dispatch);
      setCreatedItem({ id: created.id, assetTag: created.assetTag, name: created.name });
    } finally {
      setLoading(false);
    }
  };

  const resetForAnother = () => {
    setCreatedItem(null);
    setForm(createEmptyAssetForm(typeSlugs[0] ?? 'laptop'));
    setImageFile(null);
    setImagePreview(null);
  };

  if (createdItem) {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto' }}>
        <Card sx={{ textAlign: 'center', p: { xs: 3, sm: 4 } }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: alpha('#2E7D32', 0.12),
              color: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Asset Created!
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {createdItem.name} · {createdItem.assetTag}
          </Typography>

          <AssetQrPanel
            assetId={createdItem.id}
            assetTag={createdItem.assetTag}
            size={200}
            showDownload
            caption="Scan to open asset lookup · Download and stick on the device"
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
            <Button variant="contained" onClick={resetForAnother} startIcon={<RefreshIcon />}>
              Add Another Asset
            </Button>
            <Button variant="outlined" component={RouterLink} to={familyMeta.path}>
              View {familyMeta.menu}
            </Button>
            <Button
              variant="text"
              component={RouterLink}
              to={`/assets/${createdItem.id}`}
            >
              Open Asset Details
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title={`Add ${familyMeta.singular}`}
        subtitle="A QR code will be generated automatically after saving"
        breadcrumbs={[
          { label: familyMeta.menu, to: familyMeta.path },
          { label: 'New item' },
        ]}
      />

      <Box component="form" onSubmit={handleSubmit}>
        <FormSection title="Identity">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Asset Tag"
                value={form.assetTag}
                onChange={(e) => set('assetTag', e.target.value)}
                InputProps={{ sx: { fontFamily: 'monospace' } }}
                helperText={
                  <Button
                    size="small"
                    onClick={() => set('assetTag', generateAssetTag())}
                    sx={{ p: 0, minWidth: 0, textTransform: 'none' }}
                  >
                    Regenerate tag
                  </Button>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                required
                label="Type"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {typeSlugs.map((c) => (
                  <MenuItem key={c} value={c}>
                    {labelOf(c)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Asset Name"
                placeholder="e.g. MacBook Pro 14 — Rahul's Machine"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {ASSET_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Lifecycle"
                value={form.lifecycleStage}
                onChange={(e) => set('lifecycleStage', e.target.value)}
              >
                {LIFECYCLE_STAGES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {LIFECYCLE_LABELS[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </FormSection>

        <FormSection title={form.category === 'software' ? 'Software Details' : 'Hardware Details'}>
          <Grid container spacing={2}>
            {form.category === 'software' ? (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Activation Key"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={form.activationKey || ''}
                  onChange={(e) => set('activationKey', e.target.value)}
                />
              </Grid>
            ) : (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Serial Number"
                  placeholder="SN-XXXX"
                  value={form.serialNumber}
                  onChange={(e) => set('serialNumber', e.target.value)}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={form.category === 'software' ? 6 : 6}>
              <TextField
                fullWidth
                label={form.category === 'software' ? 'Publisher' : 'Manufacturer'}
                placeholder={form.category === 'software' ? 'Microsoft, Adobe...' : 'Apple, Dell, HP...'}
                value={form.manufacturer}
                onChange={(e) => set('manufacturer', e.target.value)}
              />
            </Grid>
            {form.category !== 'software' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Model"
                  placeholder='MacBook Pro M3 14"'
                  value={form.model}
                  onChange={(e) => set('model', e.target.value)}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Specs / Description"
                placeholder={form.category === 'software' ? 'License details, seats...' : '16GB RAM, 512GB SSD...'}
                value={form.specs}
                onChange={(e) => set('specs', e.target.value)}
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection title="Purchase & Financials">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={form.category === 'software' ? 6 : 4}>
              <TextField
                fullWidth
                type="date"
                label="Purchase Date"
                InputLabelProps={{ shrink: true }}
                value={form.purchaseDate}
                onChange={(e) => set('purchaseDate', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={form.category === 'software' ? 6 : 4}>
              <TextField
                fullWidth
                type="number"
                label="Purchase Price"
                placeholder="85000"
                value={form.purchaseCost}
                onChange={(e) => {
                  set('purchaseCost', e.target.value);
                  if (!form.currentValue) set('currentValue', e.target.value);
                }}
                inputProps={{ min: 0 }}
              />
            </Grid>
            {form.category !== 'software' && (
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Current Value"
                  placeholder="65000"
                  value={form.currentValue}
                  onChange={(e) => set('currentValue', e.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            )}
            {form.category !== 'software' && (
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Repair Charges"
                  placeholder="0"
                  value={form.repairCost}
                  onChange={(e) => set('repairCost', e.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={form.category === 'software' ? 6 : 6}>
              <TextField
                fullWidth
                type="date"
                label={form.category === 'software' ? "Validity Date" : "Warranty Expiry"}
                InputLabelProps={{ shrink: true }}
                value={form.warrantyExpiresAt}
                onChange={(e) => set('warrantyExpiresAt', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Vendor"
                value={form.vendorId}
                onChange={(e) => set('vendorId', e.target.value)}
              >
                {vendors.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </FormSection>

        <FormSection title="Assignment & Location">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {isHardware ? (
                <Autocomplete
                  value={form.assignedTo}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                      set('assignedTo', newValue);
                    } else if (newValue && newValue.inputValue) {
                      setShowEmployeeForm(true);
                      set('assignedTo', newValue.inputValue);
                    } else {
                      set('assignedTo', newValue ? `${newValue.firstName} ${newValue.lastName}` : '');
                    }
                  }}
                  filterOptions={(options, params) => {
                    const filtered = filter(options, params);
                    const { inputValue } = params;
                    const isExisting = options.some((option) => inputValue.toLowerCase() === `${option.firstName} ${option.lastName}`.toLowerCase());
                    if (inputValue !== '' && !isExisting) {
                      filtered.push({
                        inputValue,
                        firstName: `Add "${inputValue}"`,
                        lastName: '',
                      });
                    }
                    return filtered;
                  }}
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  options={employees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName } as EmployeeOption))}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    if (option.inputValue) return option.inputValue;
                    return `${option.firstName} ${option.lastName}`;
                  }}
                  renderOption={(props, option) => <li {...props}>{option.inputValue ? `Add "${option.inputValue}"` : `${option.firstName} ${option.lastName}`}</li>}
                  freeSolo
                  renderInput={(params) => (
                    <TextField {...params} label="Assigned To Employee" placeholder="Employee name" helperText="Matches existing employees by name; sets status to Deployed when found. If not found, you can add them." />
                  )}
                />
              ) : (
                <Autocomplete
                  value={hardwareAssets.find(a => a.id === form.assignedAssetId) || null}
                  onChange={(_, newValue) => set('assignedAssetId', newValue ? newValue.id : '')}
                  options={hardwareAssets}
                  getOptionLabel={(option) => `${option.assetTag} - ${option.name}`}
                  renderOption={(props, option) => <li {...props}>{option.assetTag} - {option.name}</li>}
                  renderInput={(params) => (
                    <TextField {...params} label="Assigned To Asset" placeholder="Select target hardware" helperText="Assign this item to an existing hardware asset." />
                  )}
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Department"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
                SelectProps={{ displayEmpty: true }}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">— None —</MenuItem>
                {departmentOptions.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                placeholder="Office Floor 2, Remote..."
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection title="Image">
          <Box
            sx={{
              border: '2px dashed',
              borderColor: imagePreview ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: imagePreview ? alpha('#1565C0', 0.04) : 'background.default',
            }}
          >
            {imagePreview ? (
              <Box>
                <Box
                  component="img"
                  src={imagePreview}
                  alt="Asset preview"
                  sx={{
                    maxHeight: 200,
                    maxWidth: '100%',
                    borderRadius: 2,
                    mb: 2,
                    objectFit: 'contain',
                  }}
                />
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  {imageFile?.name}
                </Typography>
                <Button size="small" onClick={() => void handleImageChange(null)}>
                  Remove image
                </Button>
              </Box>
            ) : (
              <>
                <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Upload a photo of the device (stored locally in this demo)
                </Typography>
                <Button variant="outlined" component="label">
                  Choose Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => void handleImageChange(e.target.files?.[0] ?? null)}
                  />
                </Button>
              </>
            )}
          </Box>
        </FormSection>

        <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
          <LoadingButton
            type="submit"
            variant="contained"
            disabled={loading || !form.assetTag || !form.name}
            loading={loading}
            loadingLabel="Saving…"
          >
            Save & Generate QR
          </LoadingButton>
          <Button variant="outlined" onClick={() => navigate(familyMeta.path)}>
            Cancel
          </Button>
        </Box>
      </Box>
      <EmployeeFormDialog open={showEmployeeForm} onClose={() => setShowEmployeeForm(false)} />
    </Box>
  );
}
