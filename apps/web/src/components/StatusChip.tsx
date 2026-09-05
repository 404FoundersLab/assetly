import { Chip, Box } from '@mui/material';
import type { AssetStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../data/demoData';

export function StatusChip({ status }: { status: AssetStatus | string }) {
  const color = STATUS_COLORS[status] ?? 'default';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <Chip
      icon={
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'currentColor',
            ml: '6px !important',
          }}
        />
      }
      label={label}
      color={color}
      size="small"
      variant="filled"
      sx={{
        fontWeight: 700,
        fontSize: '0.72rem',
        borderRadius: '6px',
        height: 24,
        letterSpacing: '0.01em',
        ...(color === 'default' && {
          bgcolor: 'action.selected',
          color: 'text.secondary',
        }),
      }}
    />
  );
}
