import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Employee } from '../types';

const employeesSlice = createSlice({
  name: 'employees',
  initialState: { items: [] as Employee[] },
  reducers: {
    replaceAllEmployees: (state, action: PayloadAction<Employee[]>) => {
      state.items = action.payload;
    },
  },
});

export const { replaceAllEmployees } = employeesSlice.actions;
export default employeesSlice.reducer;
