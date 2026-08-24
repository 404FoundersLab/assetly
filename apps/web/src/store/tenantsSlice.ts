import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Tenant } from '../types';
import { apiFetch } from '../services/api/client';

interface TenantsState {
  items: Tenant[];
  loading: boolean;
  error: string | null;
}

const initialState: TenantsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchTenants = createAsyncThunk('tenants/fetchTenants', async () => {
  return apiFetch<Tenant[]>('/api/tenants');
});

export const createTenant = createAsyncThunk('tenants/createTenant', async (tenant: Partial<Tenant>) => {
  return apiFetch<Tenant>('/api/tenants', {
    method: 'POST',
    body: JSON.stringify(tenant),
  });
});

export const updateTenantThunk = createAsyncThunk('tenants/updateTenant', async (tenant: Tenant) => {
  return apiFetch<Tenant>(`/api/tenants/${tenant.id}`, {
    method: 'PATCH',
    body: JSON.stringify(tenant),
  });
});

export const deleteTenantThunk = createAsyncThunk('tenants/deleteTenant', async (id: string) => {
  await apiFetch(`/api/tenants/${id}`, { method: 'DELETE' });
  return id;
});

const tenantsSlice = createSlice({
  name: 'tenants',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTenants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tenants';
      })
      .addCase(createTenant.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateTenantThunk.fulfilled, (state, action) => {
        const index = state.items.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteTenantThunk.fulfilled, (state, action) => {
        state.items = state.items.filter(t => t.id !== action.payload);
      });
  },
});

export default tenantsSlice.reducer;
