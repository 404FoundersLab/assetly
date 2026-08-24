import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Tenant, User } from '../types';
import { storeToken } from '../services/api/auth';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  error: string | null;
  credentials: Record<string, string>;
  requirePasswordSetup: boolean;
  pendingUserEmail: string | null;
}

const defaultState: AuthState = {
  isAuthenticated: false,
  user: null,
  tenant: null,
  token: null,
  error: null,
  credentials: {},
  requirePasswordSetup: false,
  pendingUserEmail: null,
};

const savedAuth = sessionStorage.getItem('assetly_auth_state');
const initialState: AuthState = savedAuth ? JSON.parse(savedAuth) : defaultState;

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{ user: User; tenant: Tenant; token: string }>,
    ) => {
      state.isAuthenticated = true;
      state.requirePasswordSetup = false;
      state.pendingUserEmail = null;
      state.user = action.payload.user;
      state.tenant = action.payload.tenant;
      state.token = action.payload.token;
      state.error = null;
      storeToken(action.payload.token);
      sessionStorage.setItem('assetly_auth_state', JSON.stringify(state));
    },
    setPendingSession: (
      state,
      action: PayloadAction<{ user: User; tenant: Tenant; token: string }>,
    ) => {
      // Not yet authenticated — waiting for user to set their password
      state.isAuthenticated = false;
      state.requirePasswordSetup = true;
      state.pendingUserEmail = action.payload.user.email;
      state.user = action.payload.user;
      state.tenant = action.payload.tenant;
      state.token = action.payload.token;
      state.error = null;
      storeToken(action.payload.token);
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.tenant = null;
      state.token = null;
      state.error = null;
      storeToken(null);
      sessionStorage.removeItem('assetly_auth_state');
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoginError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    updateTenantPlan: (
      state,
      action: PayloadAction<{ plan: string; subscriptionStatus?: string }>,
    ) => {
      if (state.tenant) {
        state.tenant = {
          ...state.tenant,
          plan: action.payload.plan,
          subscriptionStatus: action.payload.subscriptionStatus ?? state.tenant.subscriptionStatus,
        };
        sessionStorage.setItem('assetly_auth_state', JSON.stringify(state));
      }
    },
  },
});

export const { setSession, setPendingSession, logout, clearError, setLoginError, updateTenantPlan } = authSlice.actions;
export default authSlice.reducer;
