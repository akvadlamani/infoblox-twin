import { useMemo } from 'react';
import * as THREE from 'three';
import type { Asset, AssetType } from '@/lib/types/twin.types';

// Distinct 3D primitives per asset type so the topology reads as a real network.
// All shapes are sized relative to the asset's criticality so crown jewels remain dominant.
export function shapeForAsset(asset: Asset): { node: JSX.Element; baseSize: number } {
  const base = 0.32 + asset.criticality * 0.07;
  return shapeForType(asset.type, asset, base);
}

function shapeForType(type: AssetType, asset: Asset, base: number) {
  const isLaptop = asset.tags?.includes('laptop');
  const isMobile = asset.tags?.includes('mobile');
  const isCloud = asset.tags?.includes('cloud') || asset.tags?.includes('saas');
  const isPrinter = asset.tags?.includes('printer');

  switch (type) {
    case 'database':
      return {
        baseSize: base * 1.15,
        node: <DatabaseShape size={base * 1.15} />,
      };
    case 'server':
      return {
        baseSize: base * 1.15,
        node: <ServerRack size={base * 1.15} />,
      };
    case 'network-device':
      return {
        baseSize: base,
        node: <NetworkDevice size={base} />,
      };
    case 'security-appliance':
      return {
        baseSize: base,
        node: <ShieldShape size={base} />,
      };
    case 'application':
      return {
        baseSize: base,
        node: isCloud ? <CloudShape size={base} /> : <AppShape size={base} />,
      };
    case 'ot-controller':
      return {
        baseSize: base,
        node: <PlcShape size={base} />,
      };
    case 'iot':
      return {
        baseSize: base * 0.9,
        node: isPrinter ? <PrinterShape size={base * 0.9} /> : <IotShape size={base * 0.9} />,
      };
    case 'endpoint-pool':
      return {
        baseSize: base,
        node: <EndpointCluster size={base} />,
      };
    case 'workstation':
    default:
      if (isMobile) return { baseSize: base * 0.85, node: <MobileShape size={base * 0.85} /> };
      if (isLaptop || asset.criticality <= 2)
        return { baseSize: base * 0.95, node: <LaptopShape size={base * 0.95} /> };
      return { baseSize: base, node: <WorkstationShape size={base} /> };
  }
}

/* ---------- shape primitives ---------- */

function DatabaseShape({ size }: { size: number }) {
  const w = size * 1.0;
  const h = size * 1.4;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[w, w, h, 24, 1, false]} />
      </mesh>
      {/* disc rings */}
      {[0.45, 0.0, -0.45].map((y) => (
        <mesh key={y} position={[0, y * size, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[w * 1.0, w * 0.04, 8, 32]} />
        </mesh>
      ))}
    </group>
  );
}

function ServerRack({ size }: { size: number }) {
  const w = size * 1.05;
  const h = size * 1.7;
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, w * 0.7]} />
      </mesh>
      {/* slits */}
      {[0.35, 0, -0.35].map((y) => (
        <mesh key={y} position={[0, y * size, w * 0.36]}>
          <boxGeometry args={[w * 0.7, h * 0.06, 0.02]} />
        </mesh>
      ))}
    </group>
  );
}

function NetworkDevice({ size }: { size: number }) {
  const w = size * 1.6;
  const h = size * 0.55;
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, w * 0.7]} />
      </mesh>
      {/* indicator strip */}
      <mesh position={[0, h * 0.55, w * 0.36]}>
        <boxGeometry args={[w * 0.85, h * 0.08, 0.02]} />
      </mesh>
    </group>
  );
}

function ShieldShape({ size }: { size: number }) {
  const points = useMemo(() => {
    const s = size * 1.05;
    return [
      new THREE.Vector2(0, s * 1.0),
      new THREE.Vector2(s * 0.78, s * 0.55),
      new THREE.Vector2(s * 0.78, -s * 0.2),
      new THREE.Vector2(0, -s * 1.0),
      new THREE.Vector2(-s * 0.78, -s * 0.2),
      new THREE.Vector2(-s * 0.78, s * 0.55),
    ];
  }, [size]);

  const shape = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) sh.lineTo(points[i].x, points[i].y);
    sh.closePath();
    return sh;
  }, [points]);

  return (
    <mesh rotation={[0, 0, 0]}>
      <extrudeGeometry args={[shape, { depth: size * 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }]} />
    </mesh>
  );
}

function AppShape({ size }: { size: number }) {
  return (
    <mesh>
      <octahedronGeometry args={[size * 1.15, 0]} />
    </mesh>
  );
}

function CloudShape({ size }: { size: number }) {
  // 3 overlapping spheres for the "cloud bubble" silhouette
  return (
    <group>
      <mesh position={[-size * 0.45, 0, 0]}>
        <sphereGeometry args={[size * 0.65, 14, 14]} />
      </mesh>
      <mesh position={[size * 0.45, 0, 0]}>
        <sphereGeometry args={[size * 0.6, 14, 14]} />
      </mesh>
      <mesh position={[0, size * 0.35, 0]}>
        <sphereGeometry args={[size * 0.75, 16, 16]} />
      </mesh>
      <mesh position={[0, -size * 0.2, 0]}>
        <sphereGeometry args={[size * 0.5, 12, 12]} />
      </mesh>
    </group>
  );
}

function PlcShape({ size }: { size: number }) {
  return (
    <group>
      <mesh>
        <coneGeometry args={[size * 0.95, size * 1.7, 4, 1]} />
      </mesh>
      <mesh position={[0, -size * 0.85, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[size * 0.95, size * 0.45, 4, 1]} />
      </mesh>
    </group>
  );
}

function IotShape({ size }: { size: number }) {
  return (
    <mesh>
      <dodecahedronGeometry args={[size * 0.9, 0]} />
    </mesh>
  );
}

function PrinterShape({ size }: { size: number }) {
  const w = size * 1.4;
  const h = size * 0.9;
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, w * 0.7]} />
      </mesh>
      <mesh position={[0, h * 0.6, 0]}>
        <boxGeometry args={[w * 0.6, h * 0.18, w * 0.4]} />
      </mesh>
    </group>
  );
}

function EndpointCluster({ size }: { size: number }) {
  // A primary sphere with satellites — reads as "a pool of endpoints".
  return (
    <group>
      <mesh>
        <sphereGeometry args={[size * 0.85, 18, 18]} />
      </mesh>
      {[
        [size * 0.95, 0.1, 0],
        [-size * 0.85, 0.2, size * 0.3],
        [0.1, size * 0.7, -size * 0.95],
        [-size * 0.55, -size * 0.5, size * 0.55],
        [size * 0.4, -size * 0.55, -size * 0.45],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[size * 0.28, 10, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function WorkstationShape({ size }: { size: number }) {
  // Monitor on a base
  const w = size * 1.5;
  const h = size * 0.95;
  return (
    <group>
      <mesh position={[0, h * 0.25, 0]}>
        <boxGeometry args={[w, h, w * 0.12]} />
      </mesh>
      {/* stand */}
      <mesh position={[0, -h * 0.4, 0]}>
        <boxGeometry args={[w * 0.18, h * 0.35, w * 0.18]} />
      </mesh>
      <mesh position={[0, -h * 0.6, 0]}>
        <boxGeometry args={[w * 0.7, h * 0.08, w * 0.5]} />
      </mesh>
    </group>
  );
}

function LaptopShape({ size }: { size: number }) {
  const w = size * 1.5;
  const h = size * 0.05;
  return (
    <group>
      {/* base */}
      <mesh position={[0, -size * 0.2, 0]}>
        <boxGeometry args={[w, h, w * 0.75]} />
      </mesh>
      {/* screen — opened at 100° */}
      <mesh
        position={[0, size * 0.25, -w * 0.32]}
        rotation={[-Math.PI / 9, 0, 0]}
      >
        <boxGeometry args={[w, size * 0.85, h]} />
      </mesh>
    </group>
  );
}

function MobileShape({ size }: { size: number }) {
  return (
    <mesh>
      <boxGeometry args={[size * 0.55, size * 1.1, size * 0.12]} />
    </mesh>
  );
}
