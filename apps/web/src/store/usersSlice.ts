import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types';
import { apiFetch } from '../services/api/client';

interface UsersState {
  items: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
  return apiFetch<User[]>('/api/users');
});

export const createUser = createAsyncThunk('users/createUser', async (user: Partial<User>) => {
  return apiFetch<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
});

export const updateUserThunk = createAsyncThunk('users/updateUser', async (user: User) => {
  return apiFetch<User>(`/api/users/${user.id}`, {
    method: 'PATCH',
    body: JSON.stringify(user),
  });
});

export const deleteUserThunk = createAsyncThunk('users/deleteUser', async (id: string) => {
  await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
  return id;
});

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateUserThunk.fulfilled, (state, action) => {
        const index = state.items.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteUserThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((u) => u.id !== action.payload);
      });
  },
});

export default usersSlice.reducer;
