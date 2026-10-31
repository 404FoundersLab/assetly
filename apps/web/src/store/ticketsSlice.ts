import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SupportTicket } from '../types';

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'TICK-204',
    tenantId: '11111111-1111-1111-1111-111111111111',
    employeeId: '44444444-4444-4444-4444-444444444402',
    employeeName: 'Mike Johnson',
    employeeEmail: 'mike.johnson@solumtechnologies.com',
    departmentName: 'Engineering',
    title: 'Intermittent VPN Handshake timeouts on European Frankfurt Gateway',
    description: 'Engineers working remotely in Munich & London lose tunnel connection during heavy file transfers.',
    category: 'network',
    priority: 'high',
    status: 'in_progress',
    assignedTo: 'user-itadmin',
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-20T14:30:00Z',
  },
  {
    id: 'TICK-302',
    tenantId: '11111111-1111-1111-1111-111111111111',
    employeeId: '44444444-4444-4444-4444-444444444401',
    employeeName: 'Sarah Chen',
    employeeEmail: 'sarah.chen@solumtechnologies.com',
    departmentName: 'Engineering',
    title: 'Redis session store latency degradation in staging environment',
    description: 'Staging cluster needs vertical scale-up and HA replication node setup.',
    category: 'software',
    priority: 'medium',
    status: 'in_progress',
    assignedTo: 'user-itadmin',
    createdAt: '2026-10-17T09:15:00Z',
    updatedAt: '2026-10-19T11:00:00Z',
  },
  {
    id: 'TICK-101',
    tenantId: '11111111-1111-1111-1111-111111111111',
    employeeId: '44444444-4444-4444-4444-444444444406',
    employeeName: 'David Brown',
    employeeEmail: 'david.brown@solumtechnologies.com',
    departmentName: 'Engineering',
    title: 'High memory consumption in EDR background agent daemon',
    description: 'Memory grows past 1.2GB over 48 hours without restarting.',
    category: 'software',
    priority: 'critical',
    status: 'resolved',
    assignedTo: 'user-itadmin',
    resolutionNotes: 'Patched bounded socket queue and released hotfix v1.14.2.',
    createdAt: '2026-10-14T08:00:00Z',
    updatedAt: '2026-10-21T16:00:00Z',
  },
  {
    id: 'TICK-405',
    tenantId: '11111111-1111-1111-1111-111111111111',
    employeeId: '44444444-4444-4444-4444-444444444405',
    employeeName: 'Priya Patel',
    employeeEmail: 'priya.patel@solumtechnologies.com',
    departmentName: 'Finance',
    title: 'Dual 4K Monitor DisplayPort adapter signal flickering',
    description: 'External display drops to black screen when docking station is under charge.',
    category: 'hardware',
    priority: 'medium',
    status: 'open',
    createdAt: '2026-10-21T13:45:00Z',
    updatedAt: '2026-10-21T13:45:00Z',
  },
];

interface TicketsState {
  items: SupportTicket[];
  seeded: boolean;
}

const initialState: TicketsState = {
  items: INITIAL_TICKETS,
  seeded: true,
};

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    replaceAllTickets: (state, action: PayloadAction<SupportTicket[]>) => {
      state.items = action.payload;
      state.seeded = true;
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
    },
    deleteTicket: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((t) => t.id !== action.payload);
      state.seeded = true;
    },
    deleteAllTickets: (state) => {
      state.items = [];
      state.seeded = true;
    },
  },
});

export const { replaceAllTickets, addTicket, updateTicket, deleteTicket, deleteAllTickets } =
  ticketsSlice.actions;
export default ticketsSlice.reducer;
