import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  Stack,
  Typography,
  Button,
  alpha,
  useTheme,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import InventoryIcon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LayersIcon from '@mui/icons-material/Layers';
import { SYSTEM_MODULES, DEFAULT_ENABLED_MODULES, SystemModuleConfig } from '../../constants/modules';

interface ModuleAccessSelectorProps {
  selectedModules: string[];
  onChange: (modules: string[]) => void;
}

const moduleIcons: Record<string, React.ReactNode> = {
  'module:assets': <InventoryIcon sx={{ fontSize: 24 }} />,
  'module:hr': <PeopleIcon sx={{ fontSize: 24 }} />,
  'module:docs': <FolderIcon sx={{ fontSize: 24 }} />,
  'module:finance': <AccountBalanceIcon sx={{ fontSize: 24 }} />,
};

export function ModuleAccessSelector({ selectedModules, onChange }: ModuleAccessSelectorProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleToggle = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      onChange(selectedModules.filter((id) => id !== moduleId));
    } else {
      onChange([...selectedModules, moduleId]);
    }
  };

  const handleSelectAll = () => {
    onChange([...DEFAULT_ENABLED_MODULES]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LayersIcon color="primary" sx={{ fontSize: 22 }} />
          <Typography variant="subtitle1" fontWeight={700}>
            Module Access & Feature Entitlements
          </Typography>
          <Chip
            label={`${selectedModules.length} of ${SYSTEM_MODULES.length} enabled`}
            size="small"
            color={selectedModules.length > 0 ? 'primary' : 'default'}
            sx={{ fontWeight: 600, fontSize: '0.72rem', height: 22 }}
          />
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="text"
            onClick={handleSelectAll}
            sx={{ fontSize: '0.78rem', textTransform: 'none', fontWeight: 600 }}
          >
            Select All
          </Button>
          <Button
            size="small"
            variant="text"
            color="secondary"
            onClick={handleClearAll}
            sx={{ fontSize: '0.78rem', textTransform: 'none', fontWeight: 600 }}
          >
            Clear All
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, fontSize: '0.85rem' }}>
        Configure which operational modules are provisioned for this organization. Unticked modules will be completely hidden from the organization's navigation and workspace access.
      </Typography>

      {selectedModules.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No modules selected. Users in this organization will not have access to any workspace modules until at least one module is enabled.
        </Alert>
      )}

      <Grid container spacing={2}>
        {SYSTEM_MODULES.map((mod: SystemModuleConfig) => {
          const isChecked = selectedModules.includes(mod.id);
          const icon = moduleIcons[mod.id] || <LayersIcon />;

          return (
            <Grid item xs={12} sm={6} key={mod.id}>
              <Card
                onClick={() => handleToggle(mod.id)}
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  borderRadius: '14px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  borderColor: isChecked
                    ? mod.color
                    : isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.1)',
                  bgcolor: isChecked
                    ? alpha(mod.color, isDark ? 0.12 : 0.04)
                    : isDark
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'rgba(0, 0, 0, 0.01)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isChecked ? `0 4px 16px ${alpha(mod.color, 0.18)}` : 'none',
                  '&:hover': {
                    borderColor: mod.color,
                    bgcolor: alpha(mod.color, isDark ? 0.16 : 0.08),
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                {/* Colored top border accent */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    bgcolor: isChecked ? mod.color : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                />

                <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: '10px',
                          bgcolor: alpha(mod.color, isChecked ? (isDark ? 0.25 : 0.15) : 0.08),
                          color: isChecked ? mod.color : 'text.secondary',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: isChecked ? `0 2px 8px ${alpha(mod.color, 0.25)}` : 'none',
                        }}
                      >
                        {icon}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
                          {mod.name}
                        </Typography>
                        <Chip
                          label={mod.badge}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            bgcolor: alpha(mod.color, isDark ? 0.2 : 0.1),
                            color: mod.color,
                            borderRadius: '4px',
                            mt: 0.25,
                          }}
                        />
                      </Box>
                    </Box>

                    <Checkbox
                      checked={isChecked}
                      onChange={() => handleToggle(mod.id)}
                      icon={<RadioButtonUncheckedIcon sx={{ fontSize: 22 }} />}
                      checkedIcon={<CheckCircleIcon sx={{ fontSize: 22, color: mod.color }} />}
                      sx={{ p: 0.5, mt: -0.5, mr: -0.5 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                      mt: 'auto',
                    }}
                  >
                    {mod.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
