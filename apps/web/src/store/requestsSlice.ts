import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AssetRequest } from '../types';

const requestsSlice = createSlice({
  name: 'requests',
  initialState: { items: [] as AssetRequest[] },
  reducers: {
    replaceAllRequests: (state, action: PayloadAction<AssetRequest[]>) => {
      state.items = action.payload;
    },
    addRequest: (state, action: PayloadAction<AssetRequest>) => {
      state.items.unshift(action.payload);
    },
    updateRequest: (state, action: PayloadAction<AssetRequest>) => {
      const idx = state.items.findIndex((r) => r.id === action.payload.id);
      if (idx >= 0) state.items[idx] = action.payload;
    },
  },
});

export const { replaceAllRequests, addRequest, updateRequest } = requestsSlice.actions;
export default requestsSlice.reducer;
