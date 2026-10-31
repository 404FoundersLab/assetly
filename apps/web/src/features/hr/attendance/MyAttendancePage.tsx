import { Box } from '@mui/material';
import { EmployeeAttendanceTab } from '../../portal/EmployeeAttendanceTab';

export function MyAttendancePage() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <EmployeeAttendanceTab />
    </Box>
  );
}
