import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SupportTicket } from '../types';

export const INITIAL_TICKETS: SupportTicket[] = [];

export const DUMMY_TICKET_TITLES = new Set([
  'Intermittent VPN Handshake timeouts on European Frankfurt Gateway',
  'Redis session store latency degradation in staging environment',
  'High memory consumption in EDR background agent daemon',
  'Dual 4K Monitor DisplayPort adapter signal flickering',
]);

// Retain empty set for backward compatibility
export const DUMMY_TICKET_IDS = new Set<string>();

const TICKETS_STORAGE_KEY = 'assetly_tickets_store_v2';

export function isDummyTicket(t: SupportTicket): boolean {
  return DUMMY_TICKET_TITLES.has(t.title);
}

function loadPersistedTickets(): SupportTicket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (!raw) return [];
    const list: SupportTicket[] = JSON.parse(raw);
    return list.filter((t) => !isDummyTicket(t));
  } catch {
    return [];
  }
}

function savePersistedTickets(tickets: SupportTicket[]) {
  if (typeof window === 'undefined') return;
  try {
    const clean = tickets.filter((t) => !isDummyTicket(t));
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(clean));
  } catch {}
}

interface TicketsState {
  items: SupportTicket[];
  seeded: boolean;
}

const initialState: TicketsState = {
  items: loadPersistedTickets(),
  seeded: true,
};

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    purgeDummyTickets: (state) => {
      state.items = state.items.filter((t) => !isDummyTicket(t));
      savePersistedTickets(state.items);
    },
    replaceAllTickets: (state, action: PayloadAction<SupportTicket[]>) => {
      state.items = action.payload.filter((t) => !isDummyTicket(t));
      state.seeded = true;
      savePersistedTickets(state.items);
    },
    addTicket: (
      state,
      action: PayloadAction<Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>>
    ) => {
      let maxNum = 100;
      for (const t of state.items) {
        const match = t.id.match(/^TICK-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextId = `TICK-${maxNum + 1}`;
      const now = new Date().toISOString();
      const newTicket: SupportTicket = {
        ...action.payload,
        id: nextId,
        createdAt: now,
        updatedAt: now,
      };
      state.items.unshift(newTicket);
      state.seeded = true;
      savePersistedTickets(state.items);
    },
    updateTicket: (state, action: PayloadAction<SupportTicket>) => {
      const idx = state.items.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) {
        state.items[idx] = {
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
      } else {
        state.items.unshift({
          ...action.payload,
          updatedAt: new Date().toISOString(),
        });
      }
      state.seeded = true;
      savePersistedTickets(state.items);
    },
    deleteTicket: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((t) => t.id !== action.payload);
      state.seeded = true;
      savePersistedTickets(state.items);
    },
    deleteAllTickets: (state) => {
      state.items = [];
      state.seeded = true;
      savePersistedTickets(state.items);
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: any) => {
      if (action.payload?.tickets) {
        const list = (action.payload.tickets.items || []).filter((t: SupportTicket) => !isDummyTicket(t));
        state.items = list;
        savePersistedTickets(state.items);
      }
    });
  },
});

export const { purgeDummyTickets, replaceAllTickets, addTicket, updateTicket, deleteTicket, deleteAllTickets } =
  ticketsSlice.actions;
export default ticketsSlice.reducer;
