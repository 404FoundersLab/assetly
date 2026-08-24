import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/storeHooks';
import { isApiEnabled } from '../services/api/config';
import { globalSearch } from '../services/api/entities';
import { assetMatchesSearch, employeeMatchesSearch, matchesSearch } from '../utils/search';
import { CATEGORY_LABELS } from '../data/demoData';
import { getEmployeeName } from '../utils/format';
import type { Asset, Department, Employee, Vendor } from '../types';

type SearchOption =
  | { type: 'asset'; id: string; label: string; sub: string; path: string }
  | { type: 'employee'; id: string; label: string; sub: string; path: string }
  | { type: 'department'; id: string; label: string; sub: string; path: string }
  | { type: 'vendor'; id: string; label: string; sub: string; path: string };

const typeIcons = {
  asset: <InventoryIcon fontSize="small" />,
  employee: <PeopleIcon fontSize="small" />,
  department: <BusinessIcon fontSize="small" />,
  vendor: <StoreIcon fontSize="small" />,
};

function localSearch(
  q: string,
  assets: Asset[],
  employees: Employee[],
  departments: Department[],
  vendors: Vendor[],
  deptMap: Record<string, string>,
): SearchOption[] {
  const results: SearchOption[] = [];
  assets
    .filter((a) =>
      assetMatchesSearch(a, q, { categoryLabel: CATEGORY_LABELS[a.category] }),
    )
    .slice(0, 8)
    .forEach((a) =>
      results.push({
        type: 'asset',
        id: a.id,
        label: `${a.assetTag} — ${a.name}`,
        sub: a.serialNumber || CATEGORY_LABELS[a.category],
        path: `/assets/${a.id}`,
      }),
    );
  employees
    .filter((e) => employeeMatchesSearch(e, q, deptMap[e.departmentId]))
    .slice(0, 6)
    .forEach((e) =>
      results.push({
        type: 'employee',
        id: e.id,
        label: getEmployeeName(e.firstName, e.lastName),
        sub: e.email,
        path: `/employees/${e.id}`,
      }),
    );
  departments
    .filter((d) => matchesSearch(q, [d.name, d.costCenter]))
    .slice(0, 4)
    .forEach((d) =>
      results.push({
        type: 'department',
        id: d.id,
        label: d.name,
        sub: d.costCenter,
        path: '/departments',
      }),
    );
  vendors
    .filter((v) => matchesSearch(q, [v.name, v.contactEmail, v.website]))
    .slice(0, 4)
    .forEach((v) =>
      results.push({
        type: 'vendor',
        id: v.id,
        label: v.name,
        sub: v.contactEmail,
        path: '/vendors',
      }),
    );
  return results;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const assets = useAppSelector((s) => s.assets.items);
  const employees = useAppSelector((s) => s.employees.items);
  const departments = useAppSelector((s) => s.departments.items);
  const vendors = useAppSelector((s) => s.vendors.items);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [remoteOptions, setRemoteOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);

  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments],
  );

  const localOptions = useMemo(() => {
    if (input.trim().length < 2 || isApiEnabled()) return [];
    return localSearch(input, assets, employees, departments, vendors, deptMap);
  }, [input, assets, employees, departments, vendors, deptMap]);

  const options = isApiEnabled() ? remoteOptions : localOptions;

  const handleInput = async (value: string) => {
    setInput(value);
    const shouldOpen = value.trim().length >= 2;
    setOpen(shouldOpen);
    if (!isApiEnabled() || value.trim().length < 2) {
      setRemoteOptions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await globalSearch(value.trim());
      const mapped: SearchOption[] = [
        ...data.assets.map((a) => ({
          type: 'asset' as const,
          id: a.id,
          label: `${a.assetTag} — ${a.name}`,
          sub: a.serialNumber || CATEGORY_LABELS[a.category],
          path: `/assets/${a.id}`,
        })),
        ...data.employees.map((e) => ({
          type: 'employee' as const,
          id: e.id,
          label: getEmployeeName(e.firstName, e.lastName),
          sub: e.email,
          path: `/employees/${e.id}`,
        })),
        ...data.departments.map((d) => ({
          type: 'department' as const,
          id: d.id,
          label: d.name,
          sub: d.costCenter,
          path: '/departments',
        })),
        ...data.vendors.map((v) => ({
          type: 'vendor' as const,
          id: v.id,
          label: v.name,
          sub: v.contactEmail,
          path: '/vendors',
        })),
      ];
      setRemoteOptions(mapped);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Autocomplete
      sx={{ width: { xs: '100%', sm: 280, md: 340 }, mr: 1 }}
      size="small"
      open={open}
      onOpen={() => {
        if (input.trim().length >= 2) setOpen(true);
      }}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      inputValue={input}
      onInputChange={(_, value) => void handleInput(value)}
      getOptionLabel={(o) => o.label}
      groupBy={(o) => o.type.charAt(0).toUpperCase() + o.type.slice(1) + 's'}
      onChange={(_, option) => {
        if (option) {
          navigate(option.path);
          setInput('');
          setRemoteOptions([]);
          setOpen(false);
        }
      }}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={`${option.type}-${option.id}`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            {typeIcons[option.type]}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>{option.label}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{option.sub}</Typography>
            </Box>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search assets, people…"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText={input.length < 2 ? 'Type 2+ characters' : 'No results'}
    />
  );
}
