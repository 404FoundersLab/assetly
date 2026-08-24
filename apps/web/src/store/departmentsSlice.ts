import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Department } from '../types';

const departmentsSlice = createSlice({
  name: 'departments',
  initialState: { items: [] as Department[] },
  reducers: {
    replaceAllDepartments: (state, action: PayloadAction<Department[]>) => {
      state.items = action.payload;
    },
  },
});

export const { replaceAllDepartments } = departmentsSlice.actions;
export default departmentsSlice.reducer;
