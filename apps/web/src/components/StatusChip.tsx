import { Chip } from '@mui/material';
import type { AssetStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../data/demoData';

export function StatusChip({ status }: { status: AssetStatus | string }) {
  const color = STATUS_COLORS[status] ?? 'default';
  return (
    <Chip
      label={STATUS_LABELS[status] ?? status}
      color={color}
      size="small"
      variant="filled"
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        ...(color === 'default' && {
          bgcolor: 'action.selected',
          color: 'text.secondary',
        }),
      }}
    />
  );
}
