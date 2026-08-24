import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Employee } from '../../../../types';
import { getEmployeeName } from '../../../../utils/format';
import type { EmployeeDocument, EmployeeDocStatus } from './types';

const STORAGE_KEY = 'assetly_employee_documents';

function loadStored(): EmployeeDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EmployeeDocument[];
  } catch {
    return [];
  }
}

function saveStored(docs: EmployeeDocument[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

/** Try to link legacy JSON titles to employees by number or name. */
function migrateLegacyDoc(
  legacy: {
    id: string;
    title: string;
    type: string;
    status: string;
    owner: string;
    access: string[];
    lastModified: string;
  },
  employees: Employee[],
): EmployeeDocument | null {
  const title = legacy.title;
  const empMatch = title.match(/^EMP\d+\s*-\s*(.+?)(?:\s+(Profile|Resume))?$/i);
  if (!empMatch) return null;

  const namePart = empMatch[1].trim();
  const employee = employees.find((e) => {
    const full = getEmployeeName(e.firstName, e.lastName);
    return full.toLowerCase() === namePart.toLowerCase()
      || title.includes(e.employeeNumber);
  });
  if (!employee) return null;

  const category = title.toLowerCase().includes('resume')
    ? 'Resume'
    : title.toLowerCase().includes('offer')
      ? 'Offer Letter'
      : title.toLowerCase().includes('review')
        ? 'Performance Review'
        : 'Other';

  return {
    id: legacy.id,
    employeeId: employee.id,
    title: legacy.title,
    category,
    fileType: legacy.type,
    status: (legacy.status as EmployeeDocStatus) || 'Approved',
    accessRoles: ['tenant_admin', 'hr_admin'],
    ownerName: legacy.owner,
    createdAt: new Date().toISOString(),
    updatedAt: legacy.lastModified,
  };
}

export function useEmployeeDocuments(employees: Employee[]) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>(() => loadStored());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || employees.length === 0) return;
    const stored = loadStored();
    if (stored.length > 0) {
      setDocuments(stored);
      setInitialized(true);
      return;
    }

    void fetch('/data/library.json')
      .then((r) => r.json())
      .then((data) => {
        const legacy = (data.documents?.['Employee Docs'] ?? []) as Parameters<typeof migrateLegacyDoc>[0][];
        const migrated = legacy
          .map((d) => migrateLegacyDoc(d, employees))
          .filter((d): d is EmployeeDocument => Boolean(d));
        if (migrated.length > 0) {
          setDocuments(migrated);
          saveStored(migrated);
        }
      })
      .catch(() => { /* no legacy seed */ })
      .finally(() => setInitialized(true));
  }, [employees, initialized]);

  useEffect(() => {
    if (initialized) saveStored(documents);
  }, [documents, initialized]);

  const addDocument = useCallback((doc: Omit<EmployeeDocument, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();
    const entry: EmployeeDocument = {
      ...doc,
      id: doc.id ?? `empdoc-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setDocuments((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const countsByEmployee = useMemo(() => {
    const map: Record<string, number> = {};
    for (const doc of documents) {
      map[doc.employeeId] = (map[doc.employeeId] ?? 0) + 1;
    }
    return map;
  }, [documents]);

  const getForEmployee = useCallback(
    (employeeId: string, statusFilter: EmployeeDocStatus | 'all') => {
      return documents.filter((d) => {
        if (d.employeeId !== employeeId) return false;
        if (statusFilter === 'all') return true;
        return d.status === statusFilter;
      });
    },
    [documents],
  );

  return {
    documents,
    countsByEmployee,
    addDocument,
    deleteDocument,
    getForEmployee,
    totalCount: documents.length,
    draftCount: documents.filter((d) => d.status === 'Draft').length,
  };
}
