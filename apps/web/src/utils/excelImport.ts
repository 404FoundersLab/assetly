import * as XLSX from 'xlsx';
import { COMPANY_EMAIL_DOMAIN } from '../constants/brand';
import type { AssetCategory, AssetStatus, Employee, Vendor } from '../types';

export type ImportFieldKey = 'assetName' | 'serialNumber' | 'category' | 'assetTag' | 'user';

export interface ColumnMapping {
  assetName: string | null;
  serialNumber: string | null;
  category: string | null;
  assetTag: string | null;
  user: string | null;
}

export interface ImportAssetRow {
  rowId: string;
  assetName: string;
  serialNumber: string;
  categoryRaw: string;
  category: AssetCategory;
  assetTag: string;
  userRaw: string;
  location: string;
  manufacturer: string;
  status: AssetStatus;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  notes?: string;
  warnings: string[];
  errors: string[];
}

export interface ExcelColumnInfo {
  id: string;
  header: string;
  label: string;
  sample: string;
}

export interface ParsedExcelSheet {
  columns: ExcelColumnInfo[];
  headers: string[];
  rows: Record<string, unknown>[];
  headerRowIndex: number;
}

const FIELD_ALIASES: Record<ImportFieldKey, string[]> = {
  assetName: ['asset name', 'name', 'asset', 'device name', 'machine name', 'product name'],
  serialNumber: [
    'serial numbers of machines ( s/n)',
    'serial numbers of machines (s/n)',
    'serial numbers of machines',
    'serial number of machines',
    'serial number',
    'serial numbers',
    'serial no',
    'serial',
    's/n',
    'sn',
    'machine s/n',
  ],
  category: ['category', 'type', 'asset category', 'device type', 'asset type'],
  assetTag: ['asset tag', 'tag', 'asset id', 'asset code', 'ce tag', 'asset no', 'asset number'],
  user: ['user', 'assigned to', 'assignee', 'employee', 'assigned user', 'owner', 'location user'],
};

function cleanCell(value: unknown): string {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max = 36): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function colLetter(index: number): string {
  let n = index;
  let label = '';
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function isPlaceholderHeader(value: string): boolean {
  return !value || value.startsWith('__EMPTY') || value.startsWith('__');
}

export function normalizeHeader(value: unknown): string {
  return cleanCell(value).toLowerCase();
}

function getCellValue(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  if (!cell) return '';
  return cleanCell(cell.w ?? cell.v);
}

function readSheetMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  const ref = sheet['!ref'];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  // Cap scan to first 1000 rows — Excel often reports a huge used range (e.g. A1:E1048576)
  range.e.r = Math.min(range.e.r, range.s.r + 999);

  const matrix: unknown[][] = [];
  let emptyStreak = 0;

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: unknown[] = [];
    let rowHasData = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const val = getCellValue(sheet, r, c);
      row.push(val);
      if (val) rowHasData = true;
    }

    if (!rowHasData) {
      if (matrix.length === 0) continue;
      emptyStreak++;
      if (emptyStreak >= 10) break;
      continue;
    }

    emptyStreak = 0;
    matrix.push(row);
  }

  return matrix;
}

function trimEmptyColumns(matrix: unknown[][]): unknown[][] {
  if (matrix.length === 0) return matrix;

  let lastCol = 0;
  matrix.forEach((row) => {
    for (let i = (row?.length ?? 0) - 1; i >= 0; i--) {
      if (cleanCell(row[i])) {
        lastCol = Math.max(lastCol, i);
        break;
      }
    }
  });

  return matrix.map((row) => (row ?? []).slice(0, lastCol + 1));
}

function scoreHeaderRow(row: unknown[]): number {
  const cells = row.map(cleanCell).filter(Boolean);
  if (cells.length < 2) return 0;

  const joined = cells.map(normalizeHeader).join(' | ');
  let score = cells.length;

  if (joined.includes('asset')) score += 5;
  if (joined.includes('serial') || joined.includes('s/n')) score += 5;
  if (joined.includes('category')) score += 3;
  if (joined.includes('tag')) score += 3;
  if (joined.includes('user')) score += 3;

  // Penalize rows that look like data (serial codes, model names only)
  if (/^ce-\d/i.test(joined)) score -= 2;
  if (joined.includes('dell') && !joined.includes('asset')) score -= 1;

  return score;
}

function findHeaderRowIndex(matrix: unknown[][]): number {
  let bestIndex = 0;
  let bestScore = 0;

  for (let i = 0; i < Math.min(15, matrix.length); i++) {
    const score = scoreHeaderRow(matrix[i] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestScore > 0 ? bestIndex : 0;
}

function buildColumns(
  headerRow: unknown[],
  firstDataRow: unknown[] | undefined,
): ExcelColumnInfo[] {
  const seen = new Map<string, number>();

  return headerRow.map((cell, idx) => {
    const rawHeader = cleanCell(cell);
    const sample = cleanCell(firstDataRow?.[idx]);
    let header = rawHeader;

    if (isPlaceholderHeader(header)) {
      header = sample ? `${colLetter(idx)} — ${truncate(sample, 24)}` : `Column ${colLetter(idx)}`;
    }

    const count = seen.get(header) ?? 0;
    seen.set(header, count + 1);
    if (count > 0) header = `${header} (${count + 1})`;

    const id = `col-${idx}-${header}`;
    const label = sample && rawHeader && !isPlaceholderHeader(rawHeader)
      ? `${header}  ·  e.g. "${truncate(sample)}"`
      : header;

    return { id, header, label, sample };
  }).filter((col) => col.header || col.sample);
}

function matrixToRecords(matrix: unknown[][], headerRowIndex: number): ParsedExcelSheet {
  const headerRow = matrix[headerRowIndex] ?? [];
  const dataRows = matrix.slice(headerRowIndex + 1);
  const firstDataRow = dataRows.find((row) => row.some((cell) => cleanCell(cell)));

  const maxCols = Math.max(
    headerRow.length,
    ...dataRows.map((row) => row?.length ?? 0),
  );

  const paddedHeaderRow = Array.from({ length: maxCols }, (_, idx) => headerRow[idx] ?? '');
  const columns = buildColumns(paddedHeaderRow, firstDataRow);
  const headers = columns.map((c) => c.header);

  const rows = dataRows
    .map((cells) => {
      const record: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        record[col.header] = cleanCell(cells?.[idx]);
      });
      return record;
    })
    .filter((row) => {
      const values = Object.values(row).map((v) => cleanCell(v));
      const filled = values.filter(Boolean);
      // Require at least 2 non-empty cells to count as a data row
      return filled.length >= 2;
    });

  return { columns, headers, rows, headerRowIndex };
}

/** Parse worksheet — always reads cells directly from the sheet grid */
export function parseWorksheet(sheet: XLSX.WorkSheet): ParsedExcelSheet {
  let matrix = readSheetMatrix(sheet);
  matrix = trimEmptyColumns(matrix);

  if (matrix.length === 0) {
    return { columns: [], headers: [], rows: [], headerRowIndex: 0 };
  }

  const headerRowIndex = findHeaderRowIndex(matrix);
  return matrixToRecords(matrix, headerRowIndex);
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    assetName: null,
    serialNumber: null,
    category: null,
    assetTag: null,
    user: null,
  };

  const normalized = headers.map((h) => normalizeHeader(h.split('·')[0].split('—')[0]));

  (Object.keys(FIELD_ALIASES) as ImportFieldKey[]).forEach((field) => {
    const idx = normalized.findIndex((header) =>
      FIELD_ALIASES[field].some((alias) => {
        if (!header) return false;
        if (header === alias) return true;
        if (header.includes(alias)) return true;
        if (alias.includes(header) && header.length > 3) return true;
        return false;
      }),
    );
    if (idx >= 0) mapping[field] = headers[idx];
  });

  return mapping;
}

export function mapExcelCategory(raw: string): AssetCategory {
  const value = raw.toLowerCase();
  if (value.includes('electronic shelf') || value.includes('esl')) return 'esl';
  if (value.includes('firmware')) return 'firmware_kit';
  if (value.includes('epd') || value.includes('23 inch')) return 'epd_23_inch';
  if (value.includes('newton')) return 'newton';
  if (value.includes('gateway')) return 'gateway';
  if (value.includes('monitor')) return 'monitor';
  if (value.includes('server')) return 'server';
  if (value.includes('laptop')) return 'laptop';
  if (value.includes('desktop') || value.includes('computer')) return 'desktop';
  if (value.includes('keyboard')) return 'keyboard';
  if (value.includes('mouse')) return 'mouse';
  if (value.includes('mobile') || value.includes('phone')) return 'mobile';
  if (value.includes('network')) return 'network';
  return 'other';
}

export function guessManufacturer(name: string): string {
  const brands = ['Dell', 'HP', 'Apple', 'Lenovo', 'Cisco', 'Logitech', 'Samsung', 'LG', 'Asus', 'Acer'];
  const found = brands.find((b) => name.toLowerCase().includes(b.toLowerCase()));
  return found ?? '';
}

export function guessVendorId(manufacturer: string, vendors: Vendor[]): string {
  if (!manufacturer) return vendors[0]?.id ?? 'vendor-dell';
  const m = manufacturer.toLowerCase();
  const match = vendors.find((v) => {
    const vendorName = v.name.toLowerCase();
    return vendorName.includes(m) || m.includes(vendorName.split(' ')[0].toLowerCase());
  });
  return match?.id ?? vendors[0]?.id ?? 'vendor-dell';
}

function normalizePersonKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isIpOrLocationValue(value: string): boolean {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('not working')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}(\s|$)/.test(trimmed)) return true;
  if (lower.includes('server room') || lower.includes('floor') || lower.includes('rack')) return true;
  return false;
}

function parsePersonName(raw: string): { firstName: string; lastName: string } | null {
  if (isIpOrLocationValue(raw)) return null;

  const text = raw.replace(/\s+(cpu|desktop|pc|laptop|workstation)\s*$/i, '').trim();
  const parts = text.split(/\s+/).filter((p) => /^[a-zA-Z.]+$/.test(p) && p.length > 0);
  if (parts.length < 2) return null;

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

function buildImportEmail(parsed: { firstName: string; lastName: string }, index: number): string {
  const first = parsed.firstName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'user';
  const last = parsed.lastName.toLowerCase().replace(/[^a-z]/g, '') || `import${index}`;
  return `${first}.${last}@${COMPANY_EMAIL_DOMAIN}`;
}

export class ImportEmployeeRegistry {
  private readonly existing: Employee[];
  private readonly created = new Map<string, Employee>();
  private readonly tenantId: string;

  constructor(existing: Employee[], tenantId: string) {
    this.existing = existing;
    this.tenantId = tenantId;
  }

  resolve(userRaw: string): Employee | undefined {
    const trimmed = userRaw.trim();
    if (!trimmed || isIpOrLocationValue(trimmed)) return undefined;

    const matched = findEmployeeByName(trimmed, [...this.existing, ...this.created.values()]);
    if (matched) return matched;

    const parsed = parsePersonName(trimmed);
    if (!parsed) return undefined;

    const key = normalizePersonKey(`${parsed.firstName} ${parsed.lastName}`);
    const existingCreated = this.created.get(key);
    if (existingCreated) return existingCreated;

    const importEmail = buildImportEmail(parsed, this.created.size + 1);
    const employee: Employee = {
      id: `emp-import-${String(this.created.size + 1).padStart(3, '0')}`,
      tenantId: this.tenantId,
      employeeNumber: `EMP-IMP-${String(this.created.size + 1).padStart(3, '0')}`,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: importEmail,
      joiningEmail: importEmail,
      jobTitle: 'Staff',
      departmentId: 'dept-ops',
      status: 'active',
      hireDate: new Date().toISOString().split('T')[0],
    };
    this.created.set(key, employee);
    return employee;
  }

  getNewEmployees(): Employee[] {
    return Array.from(this.created.values());
  }
}

export interface ImportBuildResult {
  rows: ImportAssetRow[];
  newEmployees: Employee[];
}

export function parseUserField(
  userRaw: string,
  employees: Employee[],
  registry?: ImportEmployeeRegistry,
): {
  location: string;
  status: AssetStatus;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  notes?: string;
  warnings: string[];
} {
  const trimmed = userRaw.trim();
  const warnings: string[] = [];

  if (!trimmed) {
    return { location: '', status: 'in_stock', warnings };
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'not working' || lower.includes('not working')) {
    return {
      location: '',
      status: 'in_repair',
      notes: trimmed,
      warnings: ['Status set to In Repair from User column'],
    };
  }

  if (/^\d{1,3}(\.\d{1,3}){3}/.test(trimmed)) {
    const location = trimmed.replace(/\s+(cpu|desktop|pc|laptop)\s*$/i, '').trim() || trimmed;
    return {
      location,
      status: 'deployed',
      warnings: ['User column looks like IP/location — saved as location'],
    };
  }

  if (lower.includes('server room') || lower.includes('floor') || lower.includes('room')) {
    return { location: trimmed, status: 'deployed', warnings: [] };
  }

  const employee =
    findEmployeeByName(trimmed, employees) ?? registry?.resolve(trimmed);
  if (employee) {
    const isNew = employee.id.startsWith('emp-import-');
    return {
      location: '',
      status: 'deployed',
      assignedEmployeeId: employee.id,
      assignedEmployeeName: `${employee.firstName} ${employee.lastName}`,
      warnings: isNew ? ['New employee will be created from Excel User column'] : [],
    };
  }

  warnings.push('User not matched to employee — saved in notes; assign manually if needed');
  return { location: trimmed, status: 'in_stock', notes: `User/Location: ${trimmed}`, warnings };
}

function findEmployeeByName(name: string, employees: Employee[]): Employee | undefined {
  const normalized = normalizePersonKey(name);
  return employees.find((emp) => {
    const full = normalizePersonKey(`${emp.firstName} ${emp.lastName}`);
    const reverse = normalizePersonKey(`${emp.lastName} ${emp.firstName}`);
    if (normalized === full || normalized === reverse) return true;

    const nameTokens = normalized.split(' ').filter(Boolean);
    const empTokens = full.split(' ').filter(Boolean);
    const overlap = empTokens.filter((t) => nameTokens.includes(t)).length;
    return overlap >= Math.min(2, empTokens.length);
  });
}

export function buildImportRows(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping,
  employees: Employee[],
  tenantId: string,
): ImportBuildResult {
  const registry = new ImportEmployeeRegistry(employees, tenantId);
  const results: ImportAssetRow[] = [];

  rawRows.forEach((row, index) => {
    const assetName = cleanCell(row[mapping.assetName ?? ''] ?? '');
    const serialNumber = cleanCell(row[mapping.serialNumber ?? ''] ?? '');
    const categoryRaw = cleanCell(row[mapping.category ?? ''] ?? '');
    const assetTag = cleanCell(row[mapping.assetTag ?? ''] ?? '');
    const userRaw = cleanCell(row[mapping.user ?? ''] ?? '');

    if (!assetName && !assetTag && !serialNumber) return;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!assetName) errors.push('Asset Name is required');
    if (!assetTag) errors.push('Asset Tag is required');
    if (!serialNumber) warnings.push('Serial number is missing');
    if (!categoryRaw) warnings.push('Category is missing — defaulted to Other');

    const userParsed = parseUserField(userRaw, employees, registry);
    warnings.push(...userParsed.warnings);

    const manufacturer = guessManufacturer(assetName);

    results.push({
      rowId: `import-row-${index}`,
      assetName,
      serialNumber,
      categoryRaw,
      category: categoryRaw ? mapExcelCategory(categoryRaw) : 'other',
      assetTag,
      userRaw,
      location: userParsed.location,
      manufacturer,
      status: userParsed.status,
      assignedEmployeeId: userParsed.assignedEmployeeId,
      assignedEmployeeName: userParsed.assignedEmployeeName,
      notes: userParsed.notes,
      warnings,
      errors,
    });
  });

  return { rows: results, newEmployees: registry.getNewEmployees() };
}

export const IMPORT_FIELD_LABELS: Record<ImportFieldKey, string> = {
  assetName: 'Asset Name',
  serialNumber: 'Serial Number (S/N)',
  category: 'Category',
  assetTag: 'Asset Tag',
  user: 'User / Location / Assignee',
};
