import { useMemo } from 'react';
import { useAppSelector } from './storeHooks';
import type { Employee } from '../types';
import { getEmployeeName } from '../utils/format';

export interface EmployeeOption {
  id: string;
  label: string;
  email: string;
  employeeNumber: string;
  jobTitle: string;
  departmentId: string;
  employee: Employee;
}

/** Centralized employee list — same source as Assets module (`employeesSlice` + `/api/sync`). */
export function useEmployees() {
  const items = useAppSelector((s) => s.employees.items);

  const active = useMemo(
    () => items.filter((e) => e.status === 'active'),
    [items],
  );

  return { items, active, count: items.length };
}

export function useEmployeeById(id: string | undefined): Employee | undefined {
  const items = useAppSelector((s) => s.employees.items);
  return useMemo(() => items.find((e) => e.id === id), [items, id]);
}

export function useEmployeeOptions(): EmployeeOption[] {
  const { items } = useEmployees();

  return useMemo(
    () =>
      items.map((e) => ({
        id: e.id,
        label: getEmployeeName(e.firstName, e.lastName),
        email: e.email,
        employeeNumber: e.employeeNumber,
        jobTitle: e.jobTitle,
        departmentId: e.departmentId,
        employee: e,
      })),
    [items],
  );
}

export function resolveEmployeeLabel(
  idOrName: string,
  employees: Employee[],
): string {
  const byId = employees.find((e) => e.id === idOrName);
  if (byId) return getEmployeeName(byId.firstName, byId.lastName);
  return idOrName;
}
