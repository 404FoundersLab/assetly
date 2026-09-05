import type { Asset, AssetDeviceType, Department, Employee, Vendor } from '../../types';
import { apiFetch } from './client';

export interface SearchResults {
  assets: Asset[];
  employees: Employee[];
  departments: Department[];
  vendors: Vendor[];
}

export async function globalSearch(q: string): Promise<SearchResults> {
  return apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`);
}

export async function uploadImage(dataUrl: string, filename: string): Promise<{ url: string }> {
  return apiFetch('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ dataUrl, filename }),
  });
}

// Employees
export async function createEmployee(employee: Omit<Employee, 'id' | 'tenantId'> & { id?: string }): Promise<Employee> {
  return apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(employee) });
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee> {
  return apiFetch(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteEmployee(id: string): Promise<void> {
  await apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
}

// Departments
export async function createDepartment(dept: Omit<Department, 'id' | 'tenantId'> & { id?: string }): Promise<Department> {
  return apiFetch('/api/departments', { method: 'POST', body: JSON.stringify(dept) });
}

export async function updateDepartment(id: string, patch: Partial<Department>): Promise<Department> {
  return apiFetch(`/api/departments/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiFetch(`/api/departments/${id}`, { method: 'DELETE' });
}

// Vendors
export async function createVendor(vendor: Omit<Vendor, 'id' | 'tenantId'> & { id?: string }): Promise<Vendor> {
  return apiFetch('/api/vendors', { method: 'POST', body: JSON.stringify(vendor) });
}

export async function updateVendor(id: string, patch: Partial<Vendor>): Promise<Vendor> {
  return apiFetch(`/api/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteVendor(id: string): Promise<void> {
  await apiFetch(`/api/vendors/${id}`, { method: 'DELETE' });
}

export async function fetchAssetCategories(): Promise<AssetDeviceType[]> {
  return apiFetch('/api/asset-categories');
}

export async function createAssetCategory(
  payload: Partial<AssetDeviceType> & { label: string },
): Promise<AssetDeviceType> {
  return apiFetch('/api/asset-categories', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAssetCategory(
  id: string,
  payload: Partial<AssetDeviceType>,
): Promise<AssetDeviceType> {
  return apiFetch(`/api/asset-categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteAssetCategory(id: string): Promise<void> {
  await apiFetch(`/api/asset-categories/${id}`, { method: 'DELETE' });
}
