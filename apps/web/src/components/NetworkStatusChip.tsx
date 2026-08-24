import { Chip } from '@mui/material';
import type { NetworkDeviceStatus } from '../types';
import { NETWORK_STATUS_COLORS, NETWORK_STATUS_LABELS } from '../data/demoData';

export function NetworkStatusChip({ status }: { status: NetworkDeviceStatus | string }) {
  return (
    <Chip
      label={NETWORK_STATUS_LABELS[status] ?? status}
      color={NETWORK_STATUS_COLORS[status] ?? 'default'}
      size="small"
      variant="outlined"
    />
  );
}
