import {
  IconRadar2,
  IconFilter,
  IconTargetArrow,
  IconClipboardCheck,
  IconBandage,
  IconShieldCheck,
  IconBolt,
  IconTrashX,
  IconSparkles,
  IconFlame,
  IconUser,
} from '@tabler/icons-react';
import type { AgentId } from '@/lib/types/agent.types';

export type IconCmp = React.ComponentType<{
  size?: number | string;
  className?: string;
  stroke?: number | string;
  strokeWidth?: number | string;
}>;

export function iconForAgent(id: AgentId): IconCmp {
  switch (id) {
    case 'sentinel':
      return IconRadar2;
    case 'triage':
      return IconFilter;
    case 'hunter':
      return IconTargetArrow;
    case 'scope':
      return IconClipboardCheck;
    case 'pilot':
      return IconBandage;
    case 'sandbox':
      return IconShieldCheck;
    case 'action':
      return IconBolt;
    case 'takedown':
      return IconTrashX;
    case 'mystique':
      return IconSparkles;
    case 'mythos':
      return IconFlame;
    default:
      return IconUser;
  }
}
