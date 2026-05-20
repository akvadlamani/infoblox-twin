import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Asset } from '@/lib/types/twin.types';
import { SEGMENT_COLORS, SEMANTIC } from '@/lib/scene/colors';
import { iconForAsset } from './assetIcon';

interface Props {
  asset: Asset;
  isSelected?: boolean;
  isCompromised?: boolean;
  inBlast?: boolean;
  inPath?: boolean;
  onClick?: (id: string) => void;
  showLabel?: boolean;
  forceLabel?: boolean;
}

export function AssetNode({
  asset,
  isSelected,
  isCompromised,
  inBlast,
  inPath,
  onClick,
  showLabel,
  forceLabel,
}: Props) {
  const haloRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const baseColor = SEGMENT_COLORS[asset.segment];
  const isCrown = asset.criticality === 5;
  const Icon = iconForAsset(asset);

  // Halo size scales with criticality so crown jewels dominate.
  const haloSize = 0.4 + asset.criticality * 0.06;

  const haloMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
  }, [baseColor]);

  useFrame(({ clock }) => {
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      if (isCompromised) {
        mat.color.set(SEMANTIC.danger);
        mat.opacity = 0.45 + Math.sin(clock.elapsedTime * 6) * 0.2;
      } else if (isCrown) {
        mat.color.set(baseColor);
        mat.opacity = 0.32 + Math.sin(clock.elapsedTime * 2 * Math.PI) * 0.12;
      } else if (isPathHighlight()) {
        mat.color.set(SEMANTIC.warning);
        mat.opacity = 0.45;
      } else if (inBlast) {
        mat.color.set(SEMANTIC.danger);
        mat.opacity = 0.22;
      } else {
        mat.color.set(baseColor);
        mat.opacity = 0.22;
      }
    }
    if (ringRef.current && (isCrown || isSelected)) {
      ringRef.current.rotation.z += 0.005;
    }
  });

  function isPathHighlight() {
    return inPath && !isSelected && !isCompromised;
  }

  const { x, y, z } = asset.position3D;
  const showLbl = forceLabel ?? (isCrown || isSelected || showLabel);

  // Visual sizing for the HTML badge (px at distanceFactor reference)
  const badgePx = isCrown ? 44 : isSelected ? 42 : asset.criticality >= 4 ? 38 : 32;
  const iconPx = isCrown ? 22 : isSelected ? 20 : asset.criticality >= 4 ? 18 : 14;

  const badgeRing = isCompromised
    ? '#ef4444'
    : isSelected
    ? SEMANTIC.accent
    : inPath
    ? SEMANTIC.warning
    : isCrown
    ? 'rgba(239, 68, 68, 0.7)'
    : 'rgba(255,255,255,0.08)';

  const badgeBg = isCompromised
    ? 'rgba(239, 68, 68, 0.18)'
    : isSelected
    ? 'rgba(59, 130, 246, 0.18)'
    : 'rgba(20, 20, 31, 0.92)';

  const badgeGlow = isCompromised
    ? `0 0 12px rgba(239,68,68,0.55), 0 0 24px rgba(239,68,68,0.35)`
    : isCrown
    ? `0 0 12px rgba(239,68,68,0.35)`
    : isSelected
    ? `0 0 12px rgba(59,130,246,0.55)`
    : `0 0 8px rgba(0,0,0,0.45)`;

  return (
    <group position={[x, y, z]}>
      {/* Halo glow — 3D so it depth-sorts with edges */}
      <mesh ref={haloRef} renderOrder={1} material={haloMaterial}>
        <sphereGeometry args={[haloSize, 20, 20]} />
      </mesh>

      {/* Crown jewel red orbit ring */}
      {isCrown && !isCompromised && !isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[haloSize + 0.3, 0.025, 12, 64]} />
          <meshBasicMaterial color={SEMANTIC.danger} transparent opacity={0.6} />
        </mesh>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh ref={ringRef}>
          <torusGeometry args={[haloSize + 0.28, 0.035, 14, 64]} />
          <meshBasicMaterial color={SEMANTIC.accent} transparent opacity={1} />
        </mesh>
      )}

      {/* Blast soft sphere */}
      {inBlast && !isSelected && (
        <mesh>
          <sphereGeometry args={[haloSize + 0.45, 12, 12]} />
          <meshBasicMaterial color={SEMANTIC.danger} transparent opacity={0.08} />
        </mesh>
      )}

      {/* Icon badge — always faces camera */}
      <Html
        center
        distanceFactor={14}
        position={[0, 0, 0]}
        style={{ pointerEvents: 'auto', userSelect: 'none' }}
        zIndexRange={[5, 0]}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(asset.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
          }}
          style={{
            width: badgePx,
            height: badgePx,
            borderRadius: '50%',
            background: badgeBg,
            border: `1.5px solid ${badgeRing}`,
            boxShadow: badgeGlow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f5f5f7',
            cursor: 'pointer',
            transition: 'transform 150ms ease, background 200ms ease, border-color 200ms ease',
            padding: 0,
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
          title={`${asset.name} · ${asset.segment} · crit ${asset.criticality}`}
        >
          <Icon size={iconPx} stroke={1.6} />
        </button>
      </Html>

      {/* Asset name label below the badge */}
      {showLbl && (
        <Html
          center
          distanceFactor={18}
          position={[0, -haloSize - 0.35, 0]}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[4, 0]}
        >
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              fontWeight: 500,
              color: '#f5f5f7',
              background: 'rgba(10, 10, 15, 0.82)',
              border: '1px solid rgba(255,255,255,0.07)',
              padding: '2px 6px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              userSelect: 'none',
              backdropFilter: 'blur(4px)',
            }}
          >
            {asset.name}
          </div>
        </Html>
      )}
    </group>
  );
}
