

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandType, SaberConfig } from '../types';

interface SaberProps {
  type: HandType;
  positionRef: React.MutableRefObject<THREE.Vector3 | null>;
  velocityRef: React.MutableRefObject<THREE.Vector3 | null>;
  config: SaberConfig;
}

const Saber: React.FC<SaberProps> = ({ type, positionRef, velocityRef, config }) => {
  const meshRef = useRef<THREE.Group>(null);

  // Apply config
  const saberLength = config.length;
  const thickness = config.thickness;
  const color = type === 'left' ? config.leftColor : config.rightColor;

  const targetRotation = useRef(new THREE.Euler());

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const targetPos = positionRef.current;
    const velocity = velocityRef.current;

    if (targetPos) {
      meshRef.current.visible = true;
      meshRef.current.position.lerp(targetPos, 0.5);

      const restingX = -Math.PI / 3.5;
      const restingY = 0;
      const restingZ = type === 'left' ? 0.2 : -0.2;

      let swayX = 0;
      let swayY = 0;
      let swayZ = 0;

      if (velocity) {
        swayX = velocity.y * 0.05;
        swayZ = -velocity.x * 0.05;
        swayX += velocity.z * 0.02;
      }

      targetRotation.current.set(
        restingX + swayX,
        restingY + swayY,
        restingZ + swayZ
      );

      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.current.x, 0.2);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.current.y, 0.2);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.current.z, 0.2);

    } else {
      meshRef.current.visible = false;
    }
  });

  return (
    <group ref={meshRef}>
      {/* --- HANDLE --- */}
      {/* Thick chunky handle */}
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.04 * thickness, 0.04 * thickness, 0.16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      {/* Black Outline for Handle */}
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.045 * thickness, 0.045 * thickness, 0.165, 16]} />
        <meshBasicMaterial color="black" side={THREE.BackSide} />
      </mesh>

      {/* --- BLADE --- */}
      {/* White Core - toneMapped=false makes it glow brighter than screen white */}
      <mesh position={[0, 0.05 + saberLength / 2, 0]}>
        <capsuleGeometry args={[0.03 * thickness, saberLength, 12, 16]} />
        <meshBasicMaterial color="white" toneMapped={false} />
      </mesh>

      {/* Colored Glow/Shell */}
      <mesh position={[0, 0.05 + saberLength / 2, 0]}>
        <capsuleGeometry args={[0.06 * thickness, saberLength, 12, 16]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Light Source for environmental glow */}
      <pointLight
        color={color}
        intensity={3}
        distance={3}
        decay={2}
        position={[0, 0.5, 0]}
      />
    </group>
  );
};

export default React.memo(Saber);
