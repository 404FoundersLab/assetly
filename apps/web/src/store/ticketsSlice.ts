import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SupportTicket } from '../types';

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState: { items: [] as SupportTicket[] },
  reducers: {
    replaceAllTickets: (state, action: PayloadAction<SupportTicket[]>) => {
      state.items = action.payload;
    },
    addTicket: (state, action: PayloadAction<SupportTicket>) => {
      state.items.unshift(action.payload);
    },
    updateTicket: (state, action: PayloadAction<SupportTicket>) => {
      const idx = state.items.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
  },
});

export const { replaceAllTickets, addTicket, updateTicket } = ticketsSlice.actions;
export default ticketsSlice.reducer;
