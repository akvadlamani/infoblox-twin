import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Asset } from '@/lib/types/twin.types';
import { SEGMENT_COLORS, SEMANTIC } from '@/lib/scene/colors';
import { shapeForAsset } from './AssetGeometry';

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
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const baseColor = SEGMENT_COLORS[asset.segment];
  const isCrown = asset.criticality === 5;

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor,
      emissiveIntensity: isCrown ? 0.4 : 0.14,
      roughness: 0.45,
      metalness: 0.2,
    });
  }, [baseColor, isCrown]);

  const { node: shapeNode, baseSize } = useMemo(() => shapeForAsset(asset), [asset]);

  // Apply the shared material to all child meshes
  const childrenWithMaterial = useMemo(() => {
    return wrapWithMaterial(shapeNode, material);
  }, [shapeNode, material]);

  useFrame(({ clock }) => {
    if (!material) return;
    if (isCompromised) {
      material.color.set(SEMANTIC.danger);
      material.emissive.set(SEMANTIC.danger);
      material.emissiveIntensity = 0.6 + Math.sin(clock.elapsedTime * 6) * 0.25;
    } else if (isCrown) {
      material.color.set(baseColor);
      material.emissive.set(baseColor);
      material.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 2 * Math.PI) * 0.15;
    } else if (isSelected) {
      material.emissiveIntensity = 0.45;
    } else if (inPath) {
      material.color.set(SEMANTIC.warning);
      material.emissive.set(SEMANTIC.warning);
      material.emissiveIntensity = 0.35;
    } else if (inBlast) {
      material.emissiveIntensity = 0.25;
    } else {
      material.color.set(baseColor);
      material.emissive.set(baseColor);
      material.emissiveIntensity = 0.14;
    }
    if (ringRef.current && (isCrown || isSelected)) {
      ringRef.current.rotation.z += 0.005;
    }
  });

  const { x, y, z } = asset.position3D;
  const showLbl = forceLabel ?? (isCrown || isSelected || showLabel);

  return (
    <group
      ref={groupRef}
      position={[x, y, z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(asset.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {childrenWithMaterial}
      {isSelected && (
        <mesh ref={ringRef}>
          <torusGeometry args={[baseSize + 0.22, 0.03, 14, 64]} />
          <meshBasicMaterial color={SEMANTIC.accent} transparent opacity={1} />
        </mesh>
      )}
      {isCrown && !isCompromised && !isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[baseSize + 0.32, 0.022, 12, 64]} />
          <meshBasicMaterial color={SEMANTIC.danger} transparent opacity={0.6} />
        </mesh>
      )}
      {inBlast && !isSelected && (
        <mesh>
          <sphereGeometry args={[baseSize + 0.4, 12, 12]} />
          <meshBasicMaterial color={SEMANTIC.danger} transparent opacity={0.1} />
        </mesh>
      )}
      {showLbl && (
        <Html
          center
          distanceFactor={18}
          position={[0, baseSize + 0.55, 0]}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[2, 0]}
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

// Walks the JSX tree and ensures each mesh uses our shared material.
function wrapWithMaterial(node: JSX.Element, material: THREE.Material): JSX.Element {
  // Re-render once with a single material instance shared by all meshes.
  // We wrap node into a group; React Three Fiber will let us pass material as a child via primitive,
  // but the cleanest path is to attach material at the mesh level. We rely on the geometry-only meshes
  // defined in AssetGeometry.tsx — they have no material set, so we inject one with <primitive>.
  return <ApplyMaterial material={material}>{node}</ApplyMaterial>;
}

function ApplyMaterial({
  material,
  children,
}: {
  material: THREE.Material;
  children: React.ReactNode;
}) {
  // For every mesh child we render <primitive object={material} attach="material" />
  // It is simpler to pass the material via a custom prop pattern, but since AssetGeometry meshes
  // don't define a material, we re-emit them with a shared default material applied via groupRef.
  const ref = useRef<THREE.Group>(null);
  // After mount, traverse and assign material to all meshes without a material set.
  useFrame(() => {
    if (!ref.current) return;
    ref.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        if (mesh.material !== material) {
          mesh.material = material;
        }
      }
    });
  });
  return <group ref={ref}>{children}</group>;
}
