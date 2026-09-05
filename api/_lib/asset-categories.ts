export type DeviceFamily = 'it_asset' | 'peripheral' | 'network' | 'store';

export interface DefaultDeviceType {
  slug: string;
  label: string;
  sortOrder: number;
  showInRequests: boolean;
  isPeripheral: boolean;
  family: DeviceFamily;
}

const STORE_SLUGS = new Set([
  'esl',
  'gateway',
  'newton',
  'newton_eye',
  'epd_23_inch',
  'display_32_inch',
  'led_display',
  'lcd_display',
  'firmware_kit',
]);

const NETWORK_SLUGS = new Set([
  'network',
  'cctv',
  'ip_camera',
  'wifi_router',
  'switch',
  'firewall',
  'access_point',
]);

const PERIPHERAL_SLUGS = new Set([
  'monitor',
  'keyboard',
  'mouse',
  'webcam',
  'headset',
  'peripheral',
]);

export function inferDeviceFamily(slug: string, isPeripheral?: boolean): DeviceFamily {
  if (STORE_SLUGS.has(slug)) return 'store';
  if (NETWORK_SLUGS.has(slug)) return 'network';
  if (isPeripheral || PERIPHERAL_SLUGS.has(slug)) return 'peripheral';
  return 'it_asset';
}

export function isDeviceFamily(value: unknown): value is DeviceFamily {
  return value === 'it_asset' || value === 'peripheral' || value === 'network' || value === 'store';
}

export const DEFAULT_DEVICE_TYPES: DefaultDeviceType[] = [
  { slug: 'laptop', label: 'Laptop', sortOrder: 10, showInRequests: true, isPeripheral: false, family: 'it_asset' },
  { slug: 'desktop', label: 'Desktop', sortOrder: 20, showInRequests: true, isPeripheral: false, family: 'it_asset' },
  { slug: 'server', label: 'Server', sortOrder: 30, showInRequests: true, isPeripheral: false, family: 'it_asset' },
  { slug: 'mobile', label: 'Mobile', sortOrder: 40, showInRequests: true, isPeripheral: false, family: 'it_asset' },
  { slug: 'software', label: 'Software', sortOrder: 50, showInRequests: false, isPeripheral: false, family: 'it_asset' },
  { slug: 'other', label: 'Other', sortOrder: 60, showInRequests: true, isPeripheral: false, family: 'it_asset' },

  { slug: 'monitor', label: 'Monitor', sortOrder: 110, showInRequests: true, isPeripheral: true, family: 'peripheral' },
  { slug: 'keyboard', label: 'Keyboard', sortOrder: 120, showInRequests: true, isPeripheral: true, family: 'peripheral' },
  { slug: 'mouse', label: 'Mouse', sortOrder: 130, showInRequests: true, isPeripheral: true, family: 'peripheral' },
  { slug: 'webcam', label: 'Webcam', sortOrder: 140, showInRequests: false, isPeripheral: true, family: 'peripheral' },
  { slug: 'headset', label: 'Headset', sortOrder: 150, showInRequests: true, isPeripheral: true, family: 'peripheral' },
  { slug: 'peripheral', label: 'Other accessory', sortOrder: 160, showInRequests: true, isPeripheral: true, family: 'peripheral' },

  { slug: 'cctv', label: 'CCTV', sortOrder: 210, showInRequests: false, isPeripheral: false, family: 'network' },
  { slug: 'ip_camera', label: 'IP camera', sortOrder: 220, showInRequests: false, isPeripheral: false, family: 'network' },
  { slug: 'access_point', label: 'Access point', sortOrder: 230, showInRequests: false, isPeripheral: false, family: 'network' },
  { slug: 'wifi_router', label: 'Wi-Fi router', sortOrder: 240, showInRequests: false, isPeripheral: false, family: 'network' },
  { slug: 'switch', label: 'Switch', sortOrder: 250, showInRequests: false, isPeripheral: false, family: 'network' },
  { slug: 'firewall', label: 'Firewall', sortOrder: 260, showInRequests: false, isPeripheral: false, family: 'network' },
  { slug: 'network', label: 'Other network gear', sortOrder: 270, showInRequests: false, isPeripheral: false, family: 'network' },

  { slug: 'esl', label: 'Electronic Shelf Label', sortOrder: 310, showInRequests: false, isPeripheral: false, family: 'store' },
  { slug: 'gateway', label: 'Gateway', sortOrder: 320, showInRequests: false, isPeripheral: false, family: 'store' },
  { slug: 'newton', label: 'Newton', sortOrder: 330, showInRequests: false, isPeripheral: false, family: 'store' },
  { slug: 'newton_eye', label: 'Newton Eye camera', sortOrder: 340, showInRequests: false, isPeripheral: false, family: 'store' },
  { slug: 'epd_23_inch', label: 'EPD 23 inch display', sortOrder: 350, showInRequests: false, isPeripheral: false, family: 'store' },
  { slug: 'display_32_inch', label: '32 inch display', sortOrder: 360, showInRequests: false, isPeripheral: false, family: 'store' },
  { slug: 'led_display', label: 'LED display', sortOrder: 370, showInRequests: false, isPeripheral: false, family: 'store' },
  { slug: 'lcd_display', label: 'LCD display', sortOrder: 380, showInRequests: false, isPeripheral: false, family: 'store' },
  { slug: 'firmware_kit', label: 'Firmware Kit', sortOrder: 390, showInRequests: false, isPeripheral: false, family: 'store' },
];

export function slugifyDeviceType(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50) || 'device_type';
}

export function mapAssetCategory(row: {
  id: string;
  tenant_id?: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  show_in_requests: boolean;
  is_peripheral: boolean;
  family?: string | null;
}) {
  const family = isDeviceFamily(row.family) ? row.family : inferDeviceFamily(row.slug, Boolean(row.is_peripheral));
  return {
    id: row.id,
    tenantId: row.tenant_id,
    slug: row.slug,
    label: row.label,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    showInRequests: Boolean(row.show_in_requests),
    isPeripheral: family === 'peripheral',
    family,
  };
}
