import type { DeviceFamily } from '../types';

export type { DeviceFamily };

export const DEVICE_FAMILIES: DeviceFamily[] = ['it_asset', 'peripheral', 'network', 'store'];

export const DEVICE_FAMILY_META: Record<
  DeviceFamily,
  { menu: string; title: string; subtitle: string; path: string; newPath: string; singular: string }
> = {
  it_asset: {
    menu: 'IT Assets',
    title: 'IT Assets',
    subtitle: 'Laptops, desktops, servers, mobiles, and software assigned to people',
    path: '/assets',
    newPath: '/assets/new?family=it_asset',
    singular: 'IT asset',
  },
  peripheral: {
    menu: 'Peripherals',
    title: 'Peripherals',
    subtitle: 'Monitors, keyboards, mice, webcams, headsets, and other accessories',
    path: '/devices',
    newPath: '/assets/new?family=peripheral',
    singular: 'peripheral',
  },
  network: {
    menu: 'Network devices',
    title: 'Network devices',
    subtitle: 'CCTV, cameras, access points, switches, and firewalls',
    path: '/network-devices',
    newPath: '/assets/new?family=network',
    singular: 'network device',
  },
  store: {
    menu: 'Store devices',
    title: 'Store devices',
    subtitle: 'ESLs, gateways, Newtons, displays, LED/LCD panels, and firmware kits',
    path: '/store-devices',
    newPath: '/assets/new?family=store',
    singular: 'store device',
  },
};

export const DEVICE_FAMILY_LABELS: Record<DeviceFamily, string> = {
  it_asset: 'IT Assets',
  peripheral: 'Peripherals',
  network: 'Network devices',
  store: 'Store devices',
};

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

export function isDeviceFamily(value: string): value is DeviceFamily {
  return DEVICE_FAMILIES.includes(value as DeviceFamily);
}
