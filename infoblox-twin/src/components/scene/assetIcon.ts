import {
  IconServer,
  IconDatabase,
  IconDeviceDesktop,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconCloud,
  IconCloudComputing,
  IconRouter,
  IconShield,
  IconCpu,
  IconPrinter,
  IconDeviceImac,
  IconUsersGroup,
  IconApps,
  IconBuildingFactory2,
  IconWorld,
  IconMailbox,
  IconKey,
  IconBrandAws,
  IconBrandAzure,
} from '@tabler/icons-react';
import type { Asset } from '@/lib/types/twin.types';

export type IconCmp = React.ComponentType<{
  size?: number | string;
  className?: string;
  stroke?: number | string;
  strokeWidth?: number | string;
}>;

// Map any asset to a recognizable Tabler icon. Tags refine the choice
// (laptop vs workstation, mobile vs workstation, cloud vs on-prem app).
export function iconForAsset(asset: Asset): IconCmp {
  const tags = asset.tags ?? [];

  // Tag-driven first (the most specific)
  if (tags.includes('laptop')) return IconDeviceLaptop;
  if (tags.includes('mobile')) return IconDeviceMobile;
  if (tags.includes('printer')) return IconPrinter;
  if (tags.includes('endpoint-pool')) return IconUsersGroup;
  if (tags.includes('exec') && asset.type === 'workstation') return IconDeviceImac;
  if (asset.name?.toLowerCase().includes('iphone')) return IconDeviceMobile;

  // Cloud / SaaS workloads
  if (tags.includes('cloud')) return IconCloudComputing;
  if (tags.includes('saas')) return IconCloud;
  if (tags.includes('workload')) return IconCloudComputing;

  // Vendor hints for cloud
  const vendor = (asset.vendor || '').toLowerCase();
  if (vendor === 'aws') return IconBrandAws;
  if (vendor === 'microsoft' && asset.name?.toLowerCase().includes('365')) return IconCloud;
  if (vendor === 'microsoft' && asset.name?.toLowerCase().includes('azure'))
    return IconBrandAzure;

  // Type-driven
  switch (asset.type) {
    case 'database':
      return IconDatabase;
    case 'server':
      return IconServer;
    case 'workstation':
      return IconDeviceDesktop;
    case 'application':
      if (asset.name?.toLowerCase().includes('mail')) return IconMailbox;
      if (vendor.includes('okta') || tags.includes('mfa') || tags.includes('pki')) return IconKey;
      return IconApps;
    case 'network-device':
      if (asset.name?.toLowerCase().includes('internet')) return IconWorld;
      return IconRouter;
    case 'security-appliance':
      return IconShield;
    case 'ot-controller':
      return IconCpu;
    case 'iot':
      return IconBuildingFactory2;
    case 'endpoint-pool':
      return IconUsersGroup;
    default:
      return IconCpu;
  }
}
