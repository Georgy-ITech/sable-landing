import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Variant } from '../../data/variants';

type Props = {
  variant: Variant;
  progress: React.RefObject<number>;
  userRotate: React.RefObject<number>;
  reducedMotion: boolean;
  isMobile: boolean;
  /** фон преломления стекла — совпадает с фоном сцены (тема) */
  bg: string;
};

/** База всех флаконов стоит на общей плоскости пола. */
export const FLOOR_Y = -1.5;

function lathe(
  profile: [number, number][],
  segments: number,
  radiusScale = 1,
  maxY = Infinity,
  phiStart = 0,
) {
  const pts = profile.map(([x, y]) => new THREE.Vector2(x * radiusScale, Math.min(y, maxY)));
  return new THREE.LatheGeometry(pts, segments, phiStart);
}

// Бумажная этикетка рисуется на 2D-canvas и надевается на полосу-цилиндр.
function makeLabelTexture(
  label: { paper: string; ink: string; accent: string },
  name: string,
): THREE.CanvasTexture {
  const w = 640;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d')!;

  // бумага + лёгкая виньетка, чтобы не «пластик»
  x.fillStyle = label.paper;
  x.fillRect(0, 0, w, h);
  const vg = x.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.12)');
  x.fillStyle = vg;
  x.fillRect(0, 0, w, h);

  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';

  // тонкая рамка
  x.strokeStyle = label.ink;
  x.globalAlpha = 0.45;
  x.lineWidth = 3;
  x.strokeRect(30, 30, w - 60, h - 60);
  x.globalAlpha = 1;

  // бренд
  x.fillStyle = label.ink;
  x.letterSpacing = '12px';
  x.font = '600 30px "Inter", system-ui, sans-serif';
  x.fillText('SABLE', w / 2 + 6, 118);

  // название аромата
  x.letterSpacing = '0px';
  x.font = 'italic 500 118px Georgia, "Times New Roman", serif';
  x.fillText(name, w / 2, h / 2 + 46);

  // акцентная линейка
  x.strokeStyle = label.accent;
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(w / 2 - 66, h / 2 + 84);
  x.lineTo(w / 2 + 66, h / 2 + 84);
  x.stroke();

  // подпись снизу
  x.fillStyle = label.ink;
  x.globalAlpha = 0.82;
  x.letterSpacing = '7px';
  x.font = '500 22px "Inter", system-ui, sans-serif';
  x.fillText('EAU DE PARFUM', w / 2 + 4, h - 74);
  x.globalAlpha = 1;
  x.letterSpacing = '0px';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export default function Bottle({ variant, progress, userRotate, reducedMotion, isMobile, bg }: Props) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  const N = variant.segments;
  const faceted = N <= 8;
  // у гранёных сдвигаем фазу на полграни, чтобы к камере смотрела ПЛОСКАЯ грань,
  // а не ребро — на неё же ровно ляжет этикетка
  const phiStart = faceted ? -Math.PI / N : 0;

  const glassGeo = useMemo(
    () => lathe(variant.profile, N, 1, Infinity, phiStart),
    [variant.profile, N, phiStart],
  );
  const liquidGeo = useMemo(
    () => lathe(variant.profile, N, 0.9, variant.fill, phiStart),
    [variant.profile, N, variant.fill, phiStart],
  );
  // радиус диска-мениска: у гранёных считаем от плоскости грани, иначе диск торчит наружу
  const meniscusR = useMemo(() => {
    let r = 0;
    for (const [x, y] of variant.profile) if (y <= variant.fill + 0.001) r = Math.max(r, x);
    const inner = r * 0.9 * (faceted ? Math.cos(Math.PI / N) : 1);
    return inner * 0.97;
  }, [variant.profile, variant.fill, faceted, N]);

  const liquidMat = useRef<THREE.MeshStandardMaterial>(null);
  const meniscusMat = useRef<THREE.MeshStandardMaterial>(null);
  const target = useMemo(() => new THREE.Color(variant.liquid), [variant.liquid]);
  const refractBg = useMemo(() => new THREE.Color(bg), [bg]);

  // этикетка: текстура на аромат + полоса, посаженная заподлицо на корпус
  const labelTex = useMemo(
    () => makeLabelTexture(variant.label, variant.name),
    [variant.label, variant.name],
  );
  useEffect(() => () => labelTex.dispose(), [labelTex]);

  // радиус корпуса берём из профиля: этикетка садится на него, а не «висит» рядом
  const bodyR = useMemo(
    () => variant.profile.reduce((m, [x]) => Math.max(m, x), 0),
    [variant.profile],
  );
  const labelR = bodyR + 0.006;
  // у гранёных этикетка = ровно одна грань (плоский квад), у гладких — дуга
  const labelSeg = faceted ? 1 : 24;
  const labelArc = faceted ? (2 * Math.PI) / N : 2.0;

  const posY = variant.viewScale + FLOOR_Y;
  const appear = useRef(1);

  // смена аромата → «материализация» (лёгкий рост) + мгновенный цвет при reduced-motion
  useEffect(() => {
    appear.current = 0.82;
    if (reducedMotion) {
      liquidMat.current?.color.set(variant.liquid);
      liquidMat.current?.emissive.set(variant.liquid);
      meniscusMat.current?.color.set(variant.liquid);
      invalidate();
    }
  }, [variant.id, variant.liquid, reducedMotion, invalidate]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const p = progress.current ?? 0;

    if (group.current) {
      appear.current += (1 - appear.current) * (1 - Math.pow(0.002, d));
      const auto = reducedMotion ? 0 : state.clock.elapsedTime * 0.2;
      group.current.rotation.y = auto + (userRotate.current ?? 0);
      group.current.rotation.x = THREE.MathUtils.lerp(0.04, -0.1, p);
      const s = variant.viewScale * appear.current;
      group.current.scale.setScalar(s);
    }

    if (!reducedMotion) {
      const k = 1 - Math.pow(0.0015, d);
      liquidMat.current?.color.lerp(target, k);
      liquidMat.current?.emissive.lerp(target, k);
      meniscusMat.current?.color.lerp(target, k);
    }
  });

  const cap = variant.cap;

  return (
    <group ref={group} scale={variant.viewScale} position={[0, posY, 0]}>
      {/* стекло */}
      <mesh geometry={glassGeo} castShadow>
        <MeshTransmissionMaterial
          background={refractBg}
          samples={isMobile ? 4 : 10}
          resolution={isMobile ? 128 : 384}
          transmission={1}
          thickness={0.32}
          roughness={0.04}
          ior={1.5}
          chromaticAberration={isMobile ? 0 : 0.005}
          anisotropy={0}
          distortion={0}
          distortionScale={0}
          temporalDistortion={0}
          color={variant.glassTint}
          attenuationColor={variant.glassTint}
          attenuationDistance={1.6}
        />
      </mesh>

      {/* жидкость */}
      <mesh geometry={liquidGeo} position={[0, -0.02, 0]}>
        <meshStandardMaterial
          ref={liquidMat}
          color={variant.liquid}
          emissive={variant.liquid}
          emissiveIntensity={0.12}
          roughness={0.22}
          metalness={0}
          envMapIntensity={0.4}
        />
      </mesh>

      {/* мениск — поверхность жидкости */}
      <mesh position={[0, variant.fill - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[meniscusR, variant.segments]} />
        <meshStandardMaterial
          ref={meniscusMat}
          color={variant.liquid}
          roughness={0.08}
          metalness={0}
          envMapIntensity={0.9}
        />
      </mesh>

      {/* воротник горлышка */}
      <mesh position={[0, variant.neckTop + 0.04, 0]} castShadow>
        <cylinderGeometry args={[cap.botR * 0.82, cap.botR * 0.82, 0.09, 24]} />
        <meshStandardMaterial color={cap.color} metalness={cap.metalness} roughness={cap.roughness + 0.12} />
      </mesh>

      {/* крышка */}
      <mesh position={[0, variant.neckTop + 0.09 + cap.h / 2, 0]} castShadow>
        <cylinderGeometry args={[cap.topR, cap.botR, cap.h, cap.segments]} />
        <meshStandardMaterial
          color={cap.color}
          metalness={cap.metalness}
          roughness={cap.roughness}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* бумажная этикетка — сидит заподлицо на корпусе, центр на +Z */}
      <mesh position={[0, variant.label.y, 0]}>
        <cylinderGeometry args={[labelR, labelR, variant.label.h, labelSeg, 1, true, -labelArc / 2, labelArc]} />
        <meshStandardMaterial
          map={labelTex}
          roughness={0.92}
          metalness={0}
          envMapIntensity={0.35}
          side={THREE.FrontSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  );
}
