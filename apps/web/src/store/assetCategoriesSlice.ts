import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AssetDeviceType } from '../types';

const assetCategoriesSlice = createSlice({
  name: 'assetCategories',
  initialState: { items: [] as AssetDeviceType[] },
  reducers: {
    replaceAllAssetCategories: (state, action: PayloadAction<AssetDeviceType[]>) => {
      state.items = action.payload;
    },
  },
});

export const { replaceAllAssetCategories } = assetCategoriesSlice.actions;
export default assetCategoriesSlice.reducer;
