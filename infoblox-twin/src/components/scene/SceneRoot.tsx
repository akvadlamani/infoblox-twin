import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  children: React.ReactNode;
  autoRotate?: boolean;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  enableZoom?: boolean;
  fov?: number;
  onPointerMissed?: () => void;
}

export function SceneRoot({
  children,
  autoRotate = true,
  cameraPosition = [14, 9, 14],
  cameraTarget = [0, 1, 0],
  enableZoom = true,
  fov = 50,
  onPointerMissed,
}: Props) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(...cameraTarget);
    controlsRef.current.update();
  }, [cameraTarget]);

  return (
    <Canvas
      camera={{ position: cameraPosition, fov }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 40%, #14141f 0%, #0a0a0f 70%)' }}
      onPointerMissed={onPointerMissed}
    >
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 30, 85]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[10, 20, 10]} intensity={0.7} color="#ffd7a8" />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} color="#9a8cff" />
      <hemisphereLight args={['#ffffff', '#0a0a0f', 0.18]} />

      <Suspense fallback={null}>
        {children}
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        enableZoom={enableZoom}
        minDistance={8}
        maxDistance={55}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 6}
      />
    </Canvas>
  );
}

// Helper for child components — exposes Three for raw geometry access if needed
export { THREE };
