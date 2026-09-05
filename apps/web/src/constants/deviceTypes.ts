import type { AssetDeviceType } from '../types';

/** Built-in types grouped into the four inventory menus. */
export const DEFAULT_DEVICE_TYPES: AssetDeviceType[] = [
  { id: 'default-laptop', slug: 'laptop', label: 'Laptop', sortOrder: 10, isActive: true, showInRequests: true, isPeripheral: false, family: 'it_asset' },
  { id: 'default-desktop', slug: 'desktop', label: 'Desktop', sortOrder: 20, isActive: true, showInRequests: true, isPeripheral: false, family: 'it_asset' },
  { id: 'default-server', slug: 'server', label: 'Server', sortOrder: 30, isActive: true, showInRequests: true, isPeripheral: false, family: 'it_asset' },
  { id: 'default-mobile', slug: 'mobile', label: 'Mobile', sortOrder: 40, isActive: true, showInRequests: true, isPeripheral: false, family: 'it_asset' },
  { id: 'default-software', slug: 'software', label: 'Software', sortOrder: 50, isActive: true, showInRequests: false, isPeripheral: false, family: 'it_asset' },
  { id: 'default-other', slug: 'other', label: 'Other', sortOrder: 60, isActive: true, showInRequests: true, isPeripheral: false, family: 'it_asset' },

  { id: 'default-monitor', slug: 'monitor', label: 'Monitor', sortOrder: 110, isActive: true, showInRequests: true, isPeripheral: true, family: 'peripheral' },
  { id: 'default-keyboard', slug: 'keyboard', label: 'Keyboard', sortOrder: 120, isActive: true, showInRequests: true, isPeripheral: true, family: 'peripheral' },
  { id: 'default-mouse', slug: 'mouse', label: 'Mouse', sortOrder: 130, isActive: true, showInRequests: true, isPeripheral: true, family: 'peripheral' },
  { id: 'default-webcam', slug: 'webcam', label: 'Webcam', sortOrder: 140, isActive: true, showInRequests: false, isPeripheral: true, family: 'peripheral' },
  { id: 'default-headset', slug: 'headset', label: 'Headset', sortOrder: 150, isActive: true, showInRequests: true, isPeripheral: true, family: 'peripheral' },
  { id: 'default-peripheral', slug: 'peripheral', label: 'Other accessory', sortOrder: 160, isActive: true, showInRequests: true, isPeripheral: true, family: 'peripheral' },

  { id: 'default-cctv', slug: 'cctv', label: 'CCTV', sortOrder: 210, isActive: true, showInRequests: false, isPeripheral: false, family: 'network' },
  { id: 'default-ip-camera', slug: 'ip_camera', label: 'IP camera', sortOrder: 220, isActive: true, showInRequests: false, isPeripheral: false, family: 'network' },
  { id: 'default-access-point', slug: 'access_point', label: 'Access point', sortOrder: 230, isActive: true, showInRequests: false, isPeripheral: false, family: 'network' },
  { id: 'default-wifi-router', slug: 'wifi_router', label: 'Wi-Fi router', sortOrder: 240, isActive: true, showInRequests: false, isPeripheral: false, family: 'network' },
  { id: 'default-switch', slug: 'switch', label: 'Switch', sortOrder: 250, isActive: true, showInRequests: false, isPeripheral: false, family: 'network' },
  { id: 'default-firewall', slug: 'firewall', label: 'Firewall', sortOrder: 260, isActive: true, showInRequests: false, isPeripheral: false, family: 'network' },
  { id: 'default-network', slug: 'network', label: 'Other network gear', sortOrder: 270, isActive: true, showInRequests: false, isPeripheral: false, family: 'network' },

  { id: 'default-esl', slug: 'esl', label: 'Electronic Shelf Label', sortOrder: 310, isActive: true, showInRequests: false, isPeripheral: false, family: 'store' },
  { id: 'default-gateway', slug: 'gateway', label: 'Gateway', sortOrder: 320, isActive: true, showInRequests: false, isPeripheral: false, family: 'store' },
  { id: 'default-newton', slug: 'newton', label: 'Newton', sortOrder: 330, isActive: true, showInRequests: false, isPeripheral: false, family: 'store' },
  { id: 'default-newton-eye', slug: 'newton_eye', label: 'Newton Eye camera', sortOrder: 340, isActive: true, showInRequests: false, isPeripheral: false, family: 'store' },
  { id: 'default-epd-23', slug: 'epd_23_inch', label: 'EPD 23 inch display', sortOrder: 350, isActive: true, showInRequests: false, isPeripheral: false, family: 'store' },
  { id: 'default-display-32', slug: 'display_32_inch', label: '32 inch display', sortOrder: 360, isActive: true, showInRequests: false, isPeripheral: false, family: 'store' },
  { id: 'default-led', slug: 'led_display', label: 'LED display', sortOrder: 370, isActive: true, showInRequests: false, isPeripheral: false, family: 'store' },
  { id: 'default-lcd', slug: 'lcd_display', label: 'LCD display', sortOrder: 380, isActive: true, showInRequests: false, isPeripheral: false, family: 'store' },
  { id: 'default-firmware-kit', slug: 'firmware_kit', label: 'Firmware Kit', sortOrder: 390, isActive: true, showInRequests: false, isPeripheral: false, family: 'store' },
];

export function slugifyDeviceType(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50) || 'device_type';
}

