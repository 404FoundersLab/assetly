import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Vendor } from '../types';

const vendorsSlice = createSlice({
  name: 'vendors',
  initialState: { items: [] as Vendor[] },
  reducers: {
    replaceAllVendors: (state, action: PayloadAction<Vendor[]>) => {
      state.items = action.payload;
    },
  },
});

export const { replaceAllVendors } = vendorsSlice.actions;
export default vendorsSlice.reducer;
