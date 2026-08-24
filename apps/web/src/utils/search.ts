import type { Asset, Employee } from '../types';

export function matchesSearch(
  query: string,
  values: Array<string | number | null | undefined>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return values.some((value) => {
    if (value == null) return false;
    return String(value).toLowerCase().includes(q);
  });
}

export function getAssetSearchValues(
  asset: Asset,
  options: {
    assigneeName?: string;
    vendorName?: string;
    categoryLabel?: string;
    statusLabel?: string;
  } = {},
): Array<string | number | null | undefined> {
  return [
    asset.id,
    asset.assetTag,
    asset.name,
    asset.serialNumber,
    asset.manufacturer,
    asset.model,
    asset.category,
    options.categoryLabel,
    asset.status,
    options.statusLabel,
    asset.lifecycleStage,
    asset.location,
    asset.notes,
    asset.purchaseDate,
    asset.warrantyExpiresAt,
    asset.purchaseCost,
    asset.currentValue,
    options.vendorName,
    options.assigneeName,
  ];
}

export function assetMatchesSearch(
  asset: Asset,
  query: string,
  options: {
    assigneeName?: string;
    vendorName?: string;
    categoryLabel?: string;
    statusLabel?: string;
  } = {},
): boolean {
  return matchesSearch(query, getAssetSearchValues(asset, options));
}

export function getEmployeeSearchValues(
  employee: Employee,
  departmentName?: string,
): Array<string | number | null | undefined> {
  return [
    employee.id,
    employee.employeeNumber,
    employee.firstName,
    employee.lastName,
    `${employee.firstName} ${employee.lastName}`,
    `${employee.lastName} ${employee.firstName}`,
    employee.email,
    employee.jobTitle,
    employee.departmentId,
    departmentName,
    employee.status,
    employee.hireDate,
  ];
}

export function employeeMatchesSearch(
  employee: Employee,
  query: string,
  departmentName?: string,
): boolean {
  return matchesSearch(query, getEmployeeSearchValues(employee, departmentName));
}
