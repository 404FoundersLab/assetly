import { useMemo, useRef, useState, useTransition } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as XLSX from 'xlsx';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { DialogLoader, LoadingButton } from '../../components/Loader';
import { reloadFromApi } from '../../components/DataBootstrap';
import { importInventory as importInventoryApi } from '../../services/api/assets';
import { CATEGORY_LABELS } from '../../data/demoData';
import type { AssetCategory, AssetStatus } from '../../types';
import {
  buildImportRows,
  detectColumnMapping,
  guessManufacturer,
  guessVendorId,
  IMPORT_FIELD_LABELS,
  ImportEmployeeRegistry,
  parseUserField,
  parseWorksheet,
  type ColumnMapping,
  type ExcelColumnInfo,
  type ImportAssetRow,
  type ImportFieldKey,
} from '../../utils/excelImport';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = ['Upload file', 'Map columns', 'Review & edit', 'Import'];

const CATEGORY_OPTIONS: AssetCategory[] = [
  'laptop', 'desktop', 'server', 'mobile', 'monitor', 'keyboard', 'mouse', 'webcam', 'headset',
  'esl', 'gateway', 'newton', 'epd_23_inch', 'firmware_kit', 'other',
];

const STATUS_OPTIONS: AssetStatus[] = ['in_stock', 'deployed', 'in_repair', 'retired'];

export function AssetImportDialog({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const employees = useAppSelector((s) => s.employees.items);
  const vendors = useAppSelector((s) => s.vendors.items);
  const existingTags = useAppSelector((s) => s.assets.items.map((a) => a.assetTag.toLowerCase()));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelColumns, setExcelColumns] = useState<ExcelColumnInfo[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    assetName: null,
    serialNumber: null,
    category: null,
    assetTag: null,
    user: null,
  });
  const [importRows, setImportRows] = useState<ImportAssetRow[]>([]);
  const [rawExcelRows, setRawExcelRows] = useState<Record<string, unknown>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewRowsPerPage, setReviewRowsPerPage] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [, startTransition] = useTransition();

  const existingTagSet = useMemo(() => new Set(existingTags), [existingTags]);

  const paginatedRows = useMemo(() => {
    const start = reviewPage * reviewRowsPerPage;
    return importRows.slice(start, start + reviewRowsPerPage);
  }, [importRows, reviewPage, reviewRowsPerPage]);

  const validRows = useMemo(
    () => importRows.filter((row) => row.errors.length === 0 && row.assetTag && row.assetName),
    [importRows],
  );

  const reset = () => {
    setStep(0);
    setFileName('');
    setExcelHeaders([]);
    setExcelColumns([]);
    setColumnMapping({
      assetName: null,
      serialNumber: null,
      category: null,
      assetTag: null,
      user: null,
    });
    setImportRows([]);
    setRawExcelRows([]);
    setParseError(null);
    setReviewPage(0);
    setIsProcessing(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setParseError('The Excel file has no worksheets.');
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const { headers, rows, columns } = parseWorksheet(sheet);

      if (headers.length === 0) {
        setParseError('No column headers found. Ensure row 1 contains: Asset Name, Serial Number, Category, Asset Tag, User.');
        return;
      }

      const mapping = detectColumnMapping(headers);
      setFileName(file.name);
      setExcelHeaders(headers);
      setExcelColumns(columns);
      setColumnMapping(mapping);
      setRawExcelRows(rows);
      const built = buildImportRows(rows, mapping, employees, user!.tenantId);
      setImportRows(built.rows);
      setStep(1);

      if (rows.length === 0) {
        setParseError('Headers detected but no data rows found below the header row.');
      }
    } catch {
      setParseError('Could not read the Excel file. Please upload a valid .xlsx or .xls file.');
    }
  };

  const applyMapping = () => {
    setIsProcessing(true);
    setReviewPage(0);
    window.setTimeout(() => {
      const built = buildImportRows(rawExcelRows, columnMapping, employees, user!.tenantId);
      startTransition(() => {
        setImportRows(built.rows);
        setStep(2);
        setIsProcessing(false);
      });
    }, 0);
  };

  const updateRow = (rowId: string, patch: Partial<ImportAssetRow>) => {
    setImportRows((rows) =>
      rows.map((row) => {
        if (row.rowId !== rowId) return row;
        const updated = { ...row, ...patch };

        let userParsedWarnings: string[] = [];

        if (patch.userRaw !== undefined) {
          const registry = new ImportEmployeeRegistry(employees, user!.tenantId);
          const userParsed = parseUserField(updated.userRaw, employees, registry);
          updated.location = userParsed.location;
          updated.status = userParsed.assignedEmployeeId ? 'deployed' : userParsed.status;
          updated.assignedEmployeeId = userParsed.assignedEmployeeId;
          updated.assignedEmployeeName = userParsed.assignedEmployeeName;
          updated.notes = userParsed.notes;
          userParsedWarnings = userParsed.warnings;
        }

        const errors: string[] = [];
        const warnings = [
          ...row.warnings.filter(
            (w) =>
              !w.startsWith('Duplicate') &&
              !w.startsWith('User') &&
              !w.startsWith('Status') &&
              !w.includes('User column'),
          ),
          ...userParsedWarnings,
        ];

        if (!updated.assetName) errors.push('Asset Name is required');
        if (!updated.assetTag) errors.push('Asset Tag is required');
        if (!updated.serialNumber) warnings.push('Serial number is missing');
        if (existingTagSet.has(updated.assetTag.toLowerCase())) {
          warnings.push('Duplicate asset tag already exists in inventory');
        }

        return { ...updated, errors, warnings };
      }),
    );
  };

  const handleImport = async () => {
    if (!user || isImporting) return;

    setIsImporting(true);
    try {
    const registry = new ImportEmployeeRegistry([], user!.tenantId);
    const resolvedRows = validRows.map((row) => {
      if (!row.userRaw.trim()) return row;
      const parsed = parseUserField(row.userRaw, registry.getNewEmployees(), registry);
      return {
        ...row,
        location: row.location || parsed.location,
        status: parsed.assignedEmployeeId ? 'deployed' as const : row.status,
        assignedEmployeeId: row.assignedEmployeeId ?? parsed.assignedEmployeeId,
        assignedEmployeeName: row.assignedEmployeeName ?? parsed.assignedEmployeeName,
        notes: row.notes ?? parsed.notes,
      };
    });

    const importedEmployees = registry.getNewEmployees();
    const assignedBy = `${user.firstName} ${user.lastName}`;
    const today = new Date().toISOString().split('T')[0];
    const warrantyDefault = new Date();
    warrantyDefault.setFullYear(warrantyDefault.getFullYear() + 1);
    const warrantyDate = warrantyDefault.toISOString().split('T')[0];
    const now = new Date().toISOString();

    const items = resolvedRows.map((row, i) => {
      const id = `asset-import-${Date.now()}-${i}`;
      const manufacturer = row.manufacturer || guessManufacturer(row.assetName);
      return {
        id,
        tenantId: user.tenantId,
        assetTag: row.assetTag,
        name: row.assetName,
        category: row.category,
        manufacturer,
        model: row.assetName,
        serialNumber: row.serialNumber,
        status: row.status,
        lifecycleStage: 'active' as const,
        purchaseDate: today,
        purchaseCost: 0,
        currentValue: 0,
        repairCost: 0,
        location: row.location || 'HQ',
        vendorId: guessVendorId(manufacturer, vendors),
        assignedEmployeeId: row.assignedEmployeeId,
        warrantyExpiresAt: warrantyDate,
        notes: row.notes,
        createdAt: now,
      };
    });

    const fixedAssignments = items.flatMap((item, i) => {
      const row = resolvedRows[i];
      if (!row?.assignedEmployeeId) return [];
      return [{
        id: `assign-import-${Date.now()}-${i}`,
        tenantId: user.tenantId,
        assetId: item.id,
        employeeId: row.assignedEmployeeId,
        assignedAt: now,
        assignedBy,
        notes: 'Imported from Excel',
      }];
    });

    const ownershipHistory = fixedAssignments.map((a, i) => ({
      id: `hist-import-${Date.now()}-${i}`,
      tenantId: user.tenantId,
      assetId: a.assetId,
      eventType: 'ASSIGNED',
      description: 'Assigned during Excel import',
      performedBy: assignedBy,
      createdAt: now,
    }));

    const auditDetails = `Replaced inventory with ${items.length} assets and ${importedEmployees.length} employees from ${fileName}`;

    try {
      await importInventoryApi({
        items,
        employees: importedEmployees,
        assignedBy,
        qrOrigin: window.location.origin,
        audit: {
          userId: user.id,
          userName: assignedBy,
          action: 'CREATE',
          entityType: 'asset',
          entityId: 'bulk-import',
          entityLabel: 'Bulk Import',
          details: auditDetails,
        },
      });
      await reloadFromApi(dispatch);
      handleClose();
    } catch {
      setParseError('Import failed. Check backend connection and try again.');
    }
    } finally {
      setIsImporting(false);
    }
  };

  const missingMappings = (Object.keys(IMPORT_FIELD_LABELS) as ImportFieldKey[]).filter(
    (key) => !columnMapping[key],
  );

  return (
    <Dialog open={open} onClose={isImporting ? undefined : handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Import Assets from Excel</DialogTitle>
      <DialogContent sx={{ position: 'relative' }}>
        {isImporting && <DialogLoader message="Importing assets…" />}
        <Stepper activeStep={step} sx={{ mb: 3, mt: 1 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {parseError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parseError}
          </Alert>
        )}

        {step === 0 && (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: 'background.default',
            }}
          >
            <UploadFileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Upload Excel spreadsheet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Expected columns: Asset Name, Serial Number (S/N), Category, Asset Tag, User
            </Typography>
            <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
              Import replaces all existing assets and employees with data from your spreadsheet.
            </Alert>
            <Button variant="contained" onClick={() => fileInputRef.current?.click()}>
              Choose .xlsx / .xls file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              File: <strong>{fileName}</strong> — {excelHeaders.length} column(s) detected. Map Excel
              columns to platform fields. Unmapped columns can be filled manually in the next step.
            </Alert>

            {excelColumns.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Preview — columns detected in your file
                </Typography>
                <TableContainer sx={{ maxHeight: 140, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {excelColumns.map((col) => (
                          <TableCell key={col.id} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {col.header.split('·')[0].trim()}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        {excelColumns.map((col) => (
                          <TableCell key={col.id} sx={{ color: 'text.secondary', fontStyle: col.sample ? 'normal' : 'italic' }}>
                            {col.sample || '(empty)'}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {(Object.keys(IMPORT_FIELD_LABELS) as ImportFieldKey[]).map((field) => (
              <Box key={field} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <Typography sx={{ minWidth: 220 }} fontWeight={600}>
                  {IMPORT_FIELD_LABELS[field]}
                </Typography>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={columnMapping[field] ?? ''}
                  onChange={(e) =>
                    setColumnMapping((prev) => ({
                      ...prev,
                      [field]: e.target.value || null,
                    }))
                  }
                >
                  <MenuItem value="">— Not mapped —</MenuItem>
                  {excelColumns.map((col) => (
                    <MenuItem key={col.id} value={col.header}>
                      {col.label}
                    </MenuItem>
                  ))}
                </TextField>
                {columnMapping[field] ? (
                  <Chip label="Mapped" color="success" size="small" variant="outlined" />
                ) : (
                  <Chip label="Missing" color="warning" size="small" variant="outlined" />
                )}
              </Box>
            ))}

            {missingMappings.length > 0 && (
              <Alert severity="warning">
                {missingMappings.length} column(s) not mapped — you can edit missing values manually before
                import.
              </Alert>
            )}
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`${importRows.length} rows parsed`} />
              <Chip label={`${validRows.length} ready to import`} color="success" />
              <Chip
                label={`${importRows.length - validRows.length} need fixes`}
                color={importRows.length - validRows.length > 0 ? 'warning' : 'default'}
              />
            </Box>

            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset Tag</TableCell>
                    <TableCell>Asset Name</TableCell>
                    <TableCell>Serial</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>User / Location</TableCell>
                    <TableCell>Assignee</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRows.map((row) => (
                    <TableRow
                      key={row.rowId}
                      sx={{
                        bgcolor:
                          row.errors.length > 0
                            ? 'rgba(211, 47, 47, 0.08)'
                            : row.warnings.length > 0
                              ? 'rgba(237, 108, 2, 0.08)'
                              : 'inherit',
                      }}
                    >
                      <TableCell>
                        <TextField
                          size="small"
                          value={row.assetTag}
                          onChange={(e) => updateRow(row.rowId, { assetTag: e.target.value })}
                          error={!row.assetTag}
                          sx={{ minWidth: 90 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={row.assetName}
                          onChange={(e) =>
                            updateRow(row.rowId, {
                              assetName: e.target.value,
                              manufacturer: e.target.value,
                            })
                          }
                          error={!row.assetName}
                          sx={{ minWidth: 180 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={row.serialNumber}
                          onChange={(e) => updateRow(row.rowId, { serialNumber: e.target.value })}
                          sx={{ minWidth: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={row.category}
                          onChange={(e) =>
                            updateRow(row.rowId, {
                              category: e.target.value as AssetCategory,
                              categoryRaw: e.target.value,
                            })
                          }
                          sx={{ minWidth: 120 }}
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <MenuItem key={cat} value={cat}>
                              {CATEGORY_LABELS[cat]}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={row.userRaw}
                          onChange={(e) => updateRow(row.rowId, { userRaw: e.target.value })}
                          sx={{ minWidth: 140 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {row.assignedEmployeeName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={row.status}
                          onChange={(e) =>
                            updateRow(row.rowId, { status: e.target.value as AssetStatus })
                          }
                          sx={{ minWidth: 110 }}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status.replace('_', ' ')}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {[...row.errors, ...row.warnings].join(' · ') || 'OK'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={importRows.length}
              page={reviewPage}
              onPageChange={(_, page) => setReviewPage(page)}
              rowsPerPage={reviewRowsPerPage}
              onRowsPerPageChange={(e) => {
                setReviewRowsPerPage(parseInt(e.target.value, 10));
                setReviewPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        )}

        {step === 3 && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Ready to import <strong>{validRows.length}</strong> asset(s) and create{' '}
              <strong>
                {new Set(validRows.filter((r) => r.assignedEmployeeName).map((r) => r.assignedEmployeeName)).size}
              </strong>{' '}
              employee(s) from <strong>{fileName}</strong>. This will replace all current assets and employees.
            </Alert>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Asset Tag</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Serial</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assignee / Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validRows.map((row) => (
                    <TableRow key={row.rowId}>
                      <TableCell>{row.assetTag}</TableCell>
                      <TableCell>{row.assetName}</TableCell>
                      <TableCell>{CATEGORY_LABELS[row.category]}</TableCell>
                      <TableCell>{row.serialNumber || '—'}</TableCell>
                      <TableCell>{row.status.replace('_', ' ')}</TableCell>
                      <TableCell>
                        {row.assignedEmployeeName || row.location || row.userRaw || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isImporting}>
          Cancel
        </Button>
        {step > 0 && step < 3 && (
          <Button onClick={() => setStep((s) => s - 1)} disabled={isImporting}>
            Back
          </Button>
        )}
        {step === 1 && (
          <LoadingButton
            variant="contained"
            onClick={applyMapping}
            disabled={isProcessing || isImporting}
            loading={isProcessing}
            loadingLabel="Preparing review…"
          >
            Continue to review
          </LoadingButton>
        )}
        {step === 2 && (
          <Button variant="contained" onClick={() => setStep(3)} disabled={validRows.length === 0 || isImporting}>
            Continue ({validRows.length} valid)
          </Button>
        )}
        {step === 3 && (
          <LoadingButton
            variant="contained"
            onClick={() => void handleImport()}
            disabled={validRows.length === 0 || isImporting}
            loading={isImporting}
            loadingLabel="Importing…"
          >
            Import {validRows.length} assets
          </LoadingButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
