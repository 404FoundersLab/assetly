import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Asset, AssetAssignment, OwnershipEvent } from '../types';

interface AssetsState {
  items: Asset[];
  assignments: AssetAssignment[];
  ownershipHistory: OwnershipEvent[];
}

const assetsSlice = createSlice({
  name: 'assets',
  initialState: {
    items: [],
    assignments: [],
    ownershipHistory: [],
  } as AssetsState,
  reducers: {
    importInventory: (
      state,
      action: PayloadAction<{
        items: Asset[];
        assignments: AssetAssignment[];
        ownershipHistory: OwnershipEvent[];
      }>,
    ) => {
      state.items = action.payload.items;
      state.assignments = action.payload.assignments;
      state.ownershipHistory = action.payload.ownershipHistory;
    },
  },
});

export const {
  importInventory,
} = assetsSlice.actions;
export default assetsSlice.reducer;
