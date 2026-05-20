import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Edge } from '@/lib/types/twin.types';
import { EDGE_COLORS } from '@/lib/scene/colors';

interface Props {
  edge: Edge;
  from: [number, number, number];
  to: [number, number, number];
  highlight?: 'attack' | 'blast' | 'path' | null;
}

export function EdgeLine({ edge, from, to, highlight }: Props) {
  const { color, opacity, lineWidth, dashed, dashSize, gapSize } = useMemo(() => {
    if (highlight === 'attack') {
      return {
        color: '#ef4444',
        opacity: 1,
        lineWidth: 2.4,
        dashed: false,
        dashSize: 0,
        gapSize: 0,
      };
    }
    if (highlight === 'path') {
      return {
        color: '#f59e0b',
        opacity: 0.85,
        lineWidth: 1.8,
        dashed: false,
        dashSize: 0,
        gapSize: 0,
      };
    }
    if (highlight === 'blast') {
      return {
        color: '#ef4444',
        opacity: 0.35,
        lineWidth: 1.2,
        dashed: true,
        dashSize: 0.3,
        gapSize: 0.2,
      };
    }
    switch (edge.type) {
      case 'identity':
        return {
          color: EDGE_COLORS.identity,
          opacity: 0.5,
          lineWidth: 1,
          dashed: false,
          dashSize: 0,
          gapSize: 0,
        };
      case 'dns':
        return {
          color: EDGE_COLORS.default,
          opacity: 0.45,
          lineWidth: 1,
          dashed: true,
          dashSize: 0.2,
          gapSize: 0.15,
        };
      case 'data-flow':
        return {
          color: EDGE_COLORS.default,
          opacity: 0.6,
          lineWidth: 1.4,
          dashed: false,
          dashSize: 0,
          gapSize: 0,
        };
      case 'trust':
        return {
          color: EDGE_COLORS.default,
          opacity: 0.35,
          lineWidth: 0.9,
          dashed: true,
          dashSize: 0.18,
          gapSize: 0.22,
        };
      case 'network':
      default:
        return {
          color: EDGE_COLORS.default,
          opacity: 0.45,
          lineWidth: 1,
          dashed: false,
          dashSize: 0,
          gapSize: 0,
        };
    }
  }, [edge.type, highlight]);

  return (
    <Line
      points={[from, to]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed={dashed}
      dashSize={dashSize}
      gapSize={gapSize}
    />
  );
}
