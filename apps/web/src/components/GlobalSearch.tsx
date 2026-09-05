import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
  Chip,
  useTheme,
  alpha,
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
  asset: <InventoryIcon sx={{ fontSize: 16 }} />,
  employee: <PeopleIcon sx={{ fontSize: 16 }} />,
  department: <BusinessIcon sx={{ fontSize: 16 }} />,
  vendor: <StoreIcon sx={{ fontSize: 16 }} />,
};

const typeColors = {
  asset: '#6366F1',
  employee: '#10B981',
  department: '#F59E0B',
  vendor: '#06B6D4',
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
      sx={{ width: { xs: '100%', sm: 300, md: 380 } }}
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
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            mt: 1,
            boxShadow: isDark
              ? '0 20px 40px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)'
              : '0 20px 40px -10px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.08)',
            backdropFilter: 'blur(16px)',
          },
        },
      }}
      renderOption={(props, option) => (
        <Box
          component="li"
          {...props}
          key={`${option.type}-${option.id}`}
          sx={{
            py: 1,
            px: 1.5,
            borderRadius: '10px',
            mx: 0.5,
            my: 0.25,
            '&:hover': {
              bgcolor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.06)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: alpha(typeColors[option.type], 0.12),
                color: typeColors[option.type],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {typeIcons[option.type]}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.825rem' }}>
                {option.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.72rem' }}>
                {option.sub}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search fleet, people, tags…"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)',
              },
              '&.Mui-focused': {
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.9)' : '#FFFFFF',
              },
            },
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', ml: 0.5 }} />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                <Chip
                  label="⌘K"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                    color: 'text.secondary',
                    mr: 0.5,
                  }}
                />
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText={input.length < 2 ? 'Type 2+ characters to search' : 'No matching results found'}
    />
  );
}
