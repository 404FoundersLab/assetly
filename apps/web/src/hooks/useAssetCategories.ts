import { useMemo } from 'react';
import { useAppSelector } from './storeHooks';
import { CATEGORY_LABELS } from '../data/demoData';
import { DEFAULT_DEVICE_TYPES } from '../constants/deviceTypes';
import { DEVICE_FAMILY_META, inferDeviceFamily, isDeviceFamily } from '../constants/deviceFamilies';
import type { AssetDeviceType, DeviceFamily } from '../types';

function normalizeDeviceType(t: AssetDeviceType): AssetDeviceType {
  const family = isDeviceFamily(t.family) ? t.family : inferDeviceFamily(t.slug, t.isPeripheral);
  return { ...t, family, isPeripheral: family === 'peripheral' };
}

export function useAssetCategories() {
  const stored = useAppSelector((s) => s.assetCategories.items);

  return useMemo(() => {
    const source: AssetDeviceType[] = (stored.length > 0 ? stored : DEFAULT_DEVICE_TYPES).map(normalizeDeviceType);
    const types = [...source]
      .filter((t) => t.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    const all = [...source].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    const labels: Record<string, string> = { ...CATEGORY_LABELS };
    for (const t of source) labels[t.slug] = t.label;
    const slugs = types.map((t) => t.slug);
    const requestSlugs = types.filter((t) => t.showInRequests).map((t) => t.slug);
    const labelOf = (slug: string) => labels[slug] ?? slug;
    const familyOf = (slug: string): DeviceFamily =>
      source.find((t) => t.slug === slug)?.family ?? inferDeviceFamily(slug);
    const typesInFamily = (family: DeviceFamily) => types.filter((t) => t.family === family);
    const pathOf = (slug: string) => DEVICE_FAMILY_META[familyOf(slug)].path;
    const metaOf = (slug: string) => DEVICE_FAMILY_META[familyOf(slug)];
    return {
      types,
      all,
      slugs,
      requestSlugs,
      labels,
      labelOf,
      familyOf,
      typesInFamily,
      pathOf,
      metaOf,
    };
  }, [stored]);
}
