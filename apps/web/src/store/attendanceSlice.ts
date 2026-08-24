import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'wfh' | 'on_leave';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null;  // HH:mm
  checkOut: string | null; // HH:mm
  hoursWorked: number;
  overtime: number;
  status: AttendanceStatus;
  notes: string;
}

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  mondayHours: number;
  tuesdayHours: number;
  wednesdayHours: number;
  thursdayHours: number;
  fridayHours: number;
  totalHours: number;
  overtimeHours: number;
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedBy: string | null;
  notes: string;
  createdAt: string;
}

interface AttendanceState {
  records: AttendanceRecord[];
  timesheets: TimesheetEntry[];
}

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const dateStr = (daysOffset: number) => {
  const d = new Date(today.getTime() + daysOffset * 86400000);
  // Skip weekends for attendance
  return d.toISOString().split('T')[0];
};
const weekStart = (offset = 0) => {
  const d = new Date(today);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff + offset * 7);
  return d.toISOString().split('T')[0];
};

const EMPLOYEES = ['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-005', 'emp-006', 'emp-007'];

const STATUSES: AttendanceStatus[] = ['present', 'present', 'present', 'wfh', 'present', 'absent', 'present'];
const CHECK_INS = ['09:02', '08:55', '09:15', '09:00', '09:30', null, '08:45'];
const CHECK_OUTS = ['18:05', '18:00', '18:30', '18:00', '17:45', null, '19:00'];
const HOURS = [9.05, 9.08, 9.25, 9.0, 8.25, 0, 10.25];

// Generate today's attendance
const todayRecords: AttendanceRecord[] = EMPLOYEES.map((empId, i) => ({
  id: `att-today-${i + 1}`,
  employeeId: empId,
  date: todayStr,
  checkIn: CHECK_INS[i],
  checkOut: CHECK_OUTS[i],
  hoursWorked: HOURS[i],
  overtime: Math.max(0, HOURS[i] - 9),
  status: STATUSES[i],
  notes: i === 5 ? 'Medical appointment' : '',
}));

// Generate last 14 days records
const historicalRecords: AttendanceRecord[] = [];
for (let dayOffset = -14; dayOffset < 0; dayOffset++) {
  const d = new Date(today.getTime() + dayOffset * 86400000);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) continue; // skip weekends
  const dStr = d.toISOString().split('T')[0];
  EMPLOYEES.forEach((empId, i) => {
    const rand = Math.random();
    const status: AttendanceStatus = rand > 0.88 ? 'absent' : rand > 0.75 ? 'wfh' : 'present';
    const hours = status === 'absent' ? 0 : status === 'wfh' ? 8.5 : 8 + Math.random() * 2;
    historicalRecords.push({
      id: `att-${dStr}-${i}`,
      employeeId: empId,
      date: dStr,
      checkIn: status === 'absent' ? null : '09:00',
      checkOut: status === 'absent' ? null : '18:00',
      hoursWorked: Math.round(hours * 10) / 10,
      overtime: Math.max(0, Math.round((hours - 9) * 10) / 10),
      status,
      notes: '',
    });
  });
}

const initialTimesheets: TimesheetEntry[] = [
  {
    id: 'ts-001', employeeId: 'emp-001', weekStart: weekStart(-1),
    mondayHours: 9, tuesdayHours: 9.5, wednesdayHours: 8, thursdayHours: 10, fridayHours: 9,
    totalHours: 45.5, overtimeHours: 5.5, status: 'approved',
    submittedAt: new Date(today.getTime() - 5 * 86400000).toISOString(),
    approvedBy: 'emp-admin', notes: 'Sprint week — worked late for release.', createdAt: new Date(today.getTime() - 7 * 86400000).toISOString(),
  },
  {
    id: 'ts-002', employeeId: 'emp-002', weekStart: weekStart(-1),
    mondayHours: 8.5, tuesdayHours: 9, wednesdayHours: 9, thursdayHours: 8, fridayHours: 8.5,
    totalHours: 43, overtimeHours: 3, status: 'submitted',
    submittedAt: new Date(today.getTime() - 4 * 86400000).toISOString(),
    approvedBy: null, notes: '', createdAt: new Date(today.getTime() - 7 * 86400000).toISOString(),
  },
  {
    id: 'ts-003', employeeId: 'emp-003', weekStart: weekStart(-1),
    mondayHours: 9, tuesdayHours: 8, wednesdayHours: 9.5, thursdayHours: 9, fridayHours: 9,
    totalHours: 44.5, overtimeHours: 4.5, status: 'submitted',
    submittedAt: new Date(today.getTime() - 3 * 86400000).toISOString(),
    approvedBy: null, notes: 'Design sprint week.', createdAt: new Date(today.getTime() - 7 * 86400000).toISOString(),
  },
  {
    id: 'ts-004', employeeId: 'emp-004', weekStart: weekStart(0),
    mondayHours: 9, tuesdayHours: 8.5, wednesdayHours: 0, thursdayHours: 0, fridayHours: 0,
    totalHours: 17.5, overtimeHours: 0, status: 'draft',
    submittedAt: null, approvedBy: null, notes: '', createdAt: new Date().toISOString(),
  },
  {
    id: 'ts-005', employeeId: 'emp-005', weekStart: weekStart(-2),
    mondayHours: 8, tuesdayHours: 8, wednesdayHours: 8, thursdayHours: 8, fridayHours: 8,
    totalHours: 40, overtimeHours: 0, status: 'approved',
    submittedAt: new Date(today.getTime() - 12 * 86400000).toISOString(),
    approvedBy: 'emp-admin', notes: '', createdAt: new Date(today.getTime() - 14 * 86400000).toISOString(),
  },
];

const initialState: AttendanceState = {
  records: [...todayRecords, ...historicalRecords],
  timesheets: initialTimesheets,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    markAttendance: (state, action: PayloadAction<AttendanceRecord>) => {
      const idx = state.records.findIndex(r => r.employeeId === action.payload.employeeId && r.date === action.payload.date);
      if (idx >= 0) {
        state.records[idx] = action.payload;
      } else {
        state.records.unshift(action.payload);
      }
    },
    updateAttendance: (state, action: PayloadAction<AttendanceRecord>) => {
      const idx = state.records.findIndex(r => r.id === action.payload.id);
      if (idx >= 0) state.records[idx] = action.payload;
    },
    addTimesheet: (state, action: PayloadAction<Omit<TimesheetEntry, 'id' | 'createdAt'>>) => {
      state.timesheets.unshift({ ...action.payload, id: `ts-${Date.now()}`, createdAt: new Date().toISOString() });
    },
    updateTimesheetStatus: (state, action: PayloadAction<{ id: string; status: TimesheetStatus; approvedBy?: string }>) => {
      const idx = state.timesheets.findIndex(t => t.id === action.payload.id);
      if (idx >= 0) {
        state.timesheets[idx].status = action.payload.status;
        if (action.payload.approvedBy) state.timesheets[idx].approvedBy = action.payload.approvedBy;
      }
    },
  },
});

export const { markAttendance, updateAttendance, addTimesheet, updateTimesheetStatus } = attendanceSlice.actions;
export default attendanceSlice.reducer;
