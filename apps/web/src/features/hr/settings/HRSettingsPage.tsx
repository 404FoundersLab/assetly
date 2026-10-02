import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  MenuItem,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ShieldIcon from '@mui/icons-material/Shield';
import { PageHeader } from '../../../components/PageHeader';

export function HRSettingsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    shiftStart: '09:00',
    shiftEnd: '18:00',
    graceMinutes: 15,
    leaveCycle: 'calendar_year',
    enableWfhAutoApproval: false,
    enableSlackRosterDigest: true,
    requireDoctorNoteAfterDays: 2,
    enableIpRestrictedClockIn: false,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      <PageHeader
        title="HR & People Operations Settings"
        subtitle="Configure shift timings, attendance grace limits, leave cycle rules, and notification automations"
      />

      {saved && (
        <Alert severity="success" sx={{ mb: 3, mt: 1, borderRadius: '12px' }}>
          HR settings and policy parameters updated successfully.
        </Alert>
      )}

      <form onSubmit={handleSave}>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Shift & Attendance Timing Card */}
          <Card sx={{ p: 3, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <AccessTimeIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>Shift & Attendance Timing Rules</Typography>
            </Box>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="time"
                  fullWidth
                  label="Standard Shift Start Time"
                  InputLabelProps={{ shrink: true }}
                  value={settings.shiftStart}
                  onChange={(e) => setSettings({ ...settings, shiftStart: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="time"
                  fullWidth
                  label="Standard Shift End Time"
                  InputLabelProps={{ shrink: true }}
                  value={settings.shiftEnd}
                  onChange={(e) => setSettings({ ...settings, shiftEnd: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="number"
                  fullWidth
                  label="Late Arrival Grace Period (Minutes)"
                  helperText="Employees punching in within this window will not be marked as late."
                  value={settings.graceMinutes}
                  onChange={(e) => setSettings({ ...settings, graceMinutes: parseInt(e.target.value, 10) || 0 })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Annual Leave Accounting Cycle"
                  value={settings.leaveCycle}
                  onChange={(e) => setSettings({ ...settings, leaveCycle: e.target.value })}
                >
                  <MenuItem value="calendar_year">Calendar Year (Jan 1 - Dec 31)</MenuItem>
                  <MenuItem value="fiscal_year">Fiscal Financial Year (Apr 1 - Mar 31)</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Card>

          {/* Workflow & Notifications */}
          <Card sx={{ p: 3, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <NotificationsActiveIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>Automated Workflows & Alerts</Typography>
            </Box>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableSlackRosterDigest}
                    onChange={(e) => setSettings({ ...settings, enableSlackRosterDigest: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Daily Team Presence Digest</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send morning Slack/Teams summary of who is in office, working remotely, or on leave.
                    </Typography>
                  </Box>
                }
              />
              <Divider />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableWfhAutoApproval}
                    onChange={(e) => setSettings({ ...settings, enableWfhAutoApproval: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Auto-Approve WFH within Monthly Quota</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Automatically grant remote work requests if employee has remaining monthly balance.
                    </Typography>
                  </Box>
                }
              />
              <Divider />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableIpRestrictedClockIn}
                    onChange={(e) => setSettings({ ...settings, enableIpRestrictedClockIn: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Office IP & Wi-Fi Gating for Present Status</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Verify that employee is connected to corporate office network when marking "In Office".
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '12px', fontWeight: 700, px: 4 }}
            >
              Save Configuration
            </Button>
          </Box>
        </Stack>
      </form>
    </Box>
  );
}
