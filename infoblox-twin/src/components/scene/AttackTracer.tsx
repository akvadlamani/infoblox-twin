import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Asset, TwinDisposition } from '@/lib/types/twin.types';

export interface ActiveHop {
  sourceId: string;
  targetId: string;
  startedAt: number; // ms epoch
  durationMs: number;
  disposition: TwinDisposition;
  technique?: string;
  mitreId?: string;
  control?: string;
}

interface Props {
  assets: Map<string, Asset>;
  hops: ActiveHop[];
}

const PARTICLE_COUNT = 24;

export function AttackTracer({ assets, hops }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dangerColor = useMemo(() => new THREE.Color('#ef4444'), []);
  const greenColor = useMemo(() => new THREE.Color('#10b981'), []);

  const maxInstances = hops.length * PARTICLE_COUNT + hops.length;
  const totalCount = Math.max(1, maxInstances);

  useFrame(() => {
    if (!meshRef.current) return;
    const now = performance.now();
    let idx = 0;
    for (const hop of hops) {
      const src = assets.get(hop.sourceId);
      const tgt = assets.get(hop.targetId);
      if (!src || !tgt) continue;
      const elapsed = now - hop.startedAt;
      const t = Math.max(0, Math.min(1, elapsed / hop.durationMs));
      const from = new THREE.Vector3(src.position3D.x, src.position3D.y, src.position3D.z);
      const to = new THREE.Vector3(tgt.position3D.x, tgt.position3D.y, tgt.position3D.z);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const offset = i / PARTICLE_COUNT;
        const pt = (t + offset) % 1;
        const pos = from.clone().lerp(to, pt);
        const dir = to.clone().sub(from).normalize();
        const perp = new THREE.Vector3(-dir.z, 0.12, dir.x).multiplyScalar(
          Math.sin((pt + i) * Math.PI * 2) * 0.05
        );
        pos.add(perp);
        dummy.position.copy(pos);
        const scale = 0.06 + Math.sin(pt * Math.PI) * 0.07;
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(idx, dummy.matrix);
        meshRef.current.setColorAt(idx, dangerColor);
        idx++;
      }
      if (t >= 1 && (hop.disposition === 'blocked' || hop.disposition === 'contained')) {
        const mid = from.clone().lerp(to, 0.5);
        dummy.position.copy(mid);
        dummy.scale.setScalar(0.2);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(idx, dummy.matrix);
        meshRef.current.setColorAt(idx, greenColor);
        idx++;
      }
    }
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (; idx < totalCount; idx++) {
      meshRef.current.setMatrixAt(idx, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  if (hops.length === 0) return null;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, totalCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial transparent opacity={0.95} toneMapped={false} />
      </instancedMesh>
      {hops.map((hop, i) => (
        <TechniqueBadge key={`${hop.sourceId}-${hop.targetId}-${i}`} hop={hop} assets={assets} />
      ))}
    </>
  );
}

function TechniqueBadge({ hop, assets }: { hop: ActiveHop; assets: Map<string, Asset> }) {
  const src = assets.get(hop.sourceId);
  const tgt = assets.get(hop.targetId);
  if (!src || !tgt) return null;
  const mid: [number, number, number] = [
    (src.position3D.x + tgt.position3D.x) / 2,
    (src.position3D.y + tgt.position3D.y) / 2 + 0.6,
    (src.position3D.z + tgt.position3D.z) / 2,
  ];
  const disp = hop.disposition;
  const dispStyle =
    disp === 'blocked'
      ? { color: '#10b981', border: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.15)' }
      : disp === 'contained'
      ? { color: '#f59e0b', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.15)' }
      : { color: '#ef4444', border: 'rgba(239,68,68,0.45)', bg: 'rgba(239,68,68,0.15)' };
  return (
    <Html
      center
      distanceFactor={12}
      position={mid}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      zIndexRange={[3, 1]}
    >
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          background: 'rgba(10,10,15,0.92)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 6,
          padding: '5px 7px',
          backdropFilter: 'blur(6px)',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {hop.mitreId && (
          <span
            style={{
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              fontSize: 9,
              letterSpacing: '0.04em',
              color: '#a0a0b0',
            }}
          >
            {hop.mitreId}
          </span>
        )}
        <span style={{ fontSize: 11, fontWeight: 500, color: '#f5f5f7' }}>
          {hop.technique ?? 'attack hop'}
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            color: dispStyle.color,
            background: dispStyle.bg,
            border: `1px solid ${dispStyle.border}`,
            padding: '1px 4px',
            borderRadius: 3,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {disp}
        </span>
      </div>
    </Html>
  );
}
