import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { NetworkDevice } from '../types';
import { generateDemoNetworkDevices } from '../data/demoData';

const networkDevicesSlice = createSlice({
  name: 'networkDevices',
  // Seeded for UI until network-device API exists; sync can replace later.
  initialState: { items: generateDemoNetworkDevices() as NetworkDevice[] },
  reducers: {
    replaceAllNetworkDevices: (state, action: PayloadAction<NetworkDevice[]>) => {
      state.items = action.payload;
    },
  },
});

export const { replaceAllNetworkDevices } = networkDevicesSlice.actions;
export default networkDevicesSlice.reducer;
