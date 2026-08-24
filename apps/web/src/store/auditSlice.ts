import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuditLog } from '../types';

const auditSlice = createSlice({
  name: 'audit',
  initialState: { items: [] as AuditLog[] },
  reducers: {
    replaceAllAuditLogs: (state, action: PayloadAction<AuditLog[]>) => {
      state.items = action.payload;
    },
  },
});

export const { replaceAllAuditLogs } = auditSlice.actions;
export default auditSlice.reducer;
