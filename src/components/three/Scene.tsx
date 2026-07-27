import { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Bottle, { FLOOR_Y } from './Bottle';
import type { Variant } from '../../data/variants';

type Props = {
  variant: Variant;
  progress: React.RefObject<number>;
  userRotate: React.RefObject<number>;
  reducedMotion: boolean;
  isMobile: boolean;
};

// лёгкое движение камеры по скроллу — «кинематография»
function Rig({ progress, reducedMotion }: { progress: React.RefObject<number>; reducedMotion: boolean }) {
  const { camera } = useThree();
  useFrame((state, delta) => {
    if (reducedMotion) return;
    const d = Math.min(delta, 0.05);
    const p = progress.current ?? 0;
    const targetZ = THREE.MathUtils.lerp(6.2, 5.4, p);
    const targetY = THREE.MathUtils.lerp(0.25, 0.75, p);
    const px = state.pointer.x * 0.2;
    const py = state.pointer.y * 0.1;
    camera.position.x += (px - camera.position.x) * (1 - Math.pow(0.01, d));
    camera.position.y += (targetY + py - camera.position.y) * (1 - Math.pow(0.01, d));
    camera.position.z += (targetZ - camera.position.z) * (1 - Math.pow(0.01, d));
    camera.lookAt(0, -0.45, 0);
  });
  return null;
}

export default function Scene({ variant, progress, userRotate, reducedMotion, isMobile }: Props) {
    // 3D всегда снимается в тёмной студии (продукт на тёмной сцене) — тема
    // управляет только контентом страницы. Так стекло всегда читается.
    const bg = variant.bgTo;
    const floorColor = bg;
    const shadowColor = '#000008';

  return (
    <Canvas
      shadows={!isMobile}
      dpr={[1, isMobile ? 1.5 : 2]}
      camera={{ position: [0, 0.25, 6.2], fov: 30 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.15;
      }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={[bg]} />

        <ambientLight intensity={0.18} />
        <directionalLight position={[3, 6, 3]} intensity={1.1} castShadow={!isMobile} />
        {/* цветной rim под аромат — окрашивает грани стекла */}
        <pointLight position={[-2.4, 1.2, -2.4]} intensity={12} color={variant.glow} distance={12} />
        <pointLight position={[2.6, 0.4, 2.4]} intensity={3.5} color="#ffffff" distance={12} />

        {/* СТУДИЯ: крупные софтбоксы — их вытянутые отражения читаются как стекло */}
        <Environment resolution={isMobile ? 128 : 256}>
          <Lightformer form="rect" intensity={3} position={[-4, 1.5, 3]} rotation={[0, 0.3, 0]} scale={[2, 7, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.4} position={[4, 0.5, 3]} rotation={[0, -0.3, 0]} scale={[2.4, 6, 1]} color="#f4f6ff" />
          <Lightformer form="rect" intensity={2} position={[0, 5, 1]} rotation={[Math.PI / 2, 0, 0]} scale={[9, 3, 1]} color="#ffffff" />
          {/* цветная подсветка сзади — атмосфера аромата */}
          <Lightformer form="rect" intensity={1.4} position={[0, 1, -5]} scale={[6, 6, 1]} color={variant.glow} />
          <Lightformer form="rect" intensity={0.4} position={[0, -3, 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 4, 1]} color="#d7dbf5" />
        </Environment>

        <Bottle
          variant={variant}
          progress={progress}
          userRotate={userRotate}
          reducedMotion={reducedMotion}
          isMobile={isMobile}
          bg={bg}
        />

        {/* отражающий пол — резко поднимает премиальность (десктоп) */}
        {!isMobile ? (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
            <planeGeometry args={[40, 40]} />
            <MeshReflectorMaterial
              resolution={1024}
              blur={[400, 200]}
              mixBlur={1.6}
              mixStrength={30}
              depthScale={1}
              minDepthThreshold={0.3}
              maxDepthThreshold={1.4}
              roughness={0.92}
              mirror={0.55}
              color={floorColor}
              metalness={0.1}
            />
          </mesh>
        ) : (
          <ContactShadows position={[0, FLOOR_Y + 0.01, 0]} opacity={0.5} scale={6} blur={2.6} far={3} resolution={256} color={shadowColor} />
        )}

        {/* мягкая тень-контакт поверх отражения (десктоп) */}
        {!isMobile && (
          <ContactShadows position={[0, FLOOR_Y + 0.02, 0]} opacity={0.5} scale={5.5} blur={2.6} far={2.6} resolution={512} color={shadowColor} />
        )}

        <Rig progress={progress} reducedMotion={reducedMotion} />

        {!reducedMotion && (
          <EffectComposer enableNormalPass={false}>
            <Bloom intensity={isMobile ? 0.3 : 0.5} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
            <Vignette eskil={false} offset={0.3} darkness={0.72} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
