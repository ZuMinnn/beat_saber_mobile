
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useMemo, useRef } from 'react';
import { Extrude, Octahedron, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NoteData } from '../types';
import { LANE_X_POSITIONS, LAYER_Y_POSITIONS, NOTE_SIZE } from '../constants';

interface NoteProps {
    data: NoteData;
    zPos: number;
    currentTime: number;
    color: string;
}

const Debris: React.FC<{ data: NoteData, timeSinceHit: number, color: string }> = ({ data, timeSinceHit, color }) => {
    const groupRef = useRef<THREE.Group>(null);

    // Animation parameters
    const flySpeed = 6.0;
    const rotationSpeed = 5.0;
    const distance = flySpeed * timeSinceHit;

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.scale.setScalar(Math.max(0.01, 1 - timeSinceHit * 1.5));
        }
    });

    // Confetti-style shards
    const Shard = ({ offsetDir, moveDir }: { offsetDir: number[], moveDir: number[] }) => {
        const meshRef = useRef<THREE.Mesh>(null);

        useFrame(() => {
            if (meshRef.current) {
                meshRef.current.position.x = offsetDir[0] + moveDir[0] * distance;
                meshRef.current.position.y = offsetDir[1] + moveDir[1] * distance;
                meshRef.current.position.z = offsetDir[2] + moveDir[2] * distance;

                meshRef.current.rotation.x += moveDir[1] * rotationSpeed;
                meshRef.current.rotation.y += moveDir[0] * rotationSpeed;
            }
        });

        return (
            <mesh ref={meshRef} position={[offsetDir[0], offsetDir[1], offsetDir[2]]}>
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshToonMaterial color={color} />
            </mesh>
        )
    }

    return (
        <group ref={groupRef}>
            <Shard offsetDir={[0, 0, 0]} moveDir={[0.5, 0.8, -0.5]} />
            <Shard offsetDir={[0, 0, 0]} moveDir={[-0.5, 0.8, -0.5]} />
            <Shard offsetDir={[0, 0, 0]} moveDir={[0, 0, 1]} />
        </group>
    );
};

const Note: React.FC<NoteProps> = ({ data, zPos, currentTime, color }) => {

    const position: [number, number, number] = useMemo(() => {
        return [
            LANE_X_POSITIONS[data.lineIndex],
            LAYER_Y_POSITIONS[data.lineLayer],
            zPos
        ];
    }, [data.lineIndex, data.lineLayer, zPos]);

    if (data.missed) return null;

    if (data.hit && data.hitTime) {
        return (
            <group position={position}>
                <Debris data={data} timeSinceHit={currentTime - data.hitTime} color={color} />
            </group>
        );
    }

    return (
        <group position={position}>
            {/* Optimized Note Geometry */}
            <RoundedBox args={[NOTE_SIZE, NOTE_SIZE, NOTE_SIZE]} radius={0.08} smoothness={1}>
                <meshToonMaterial color={color} />
            </RoundedBox>

            {/* Center Dot */}
            <mesh position={[0, 0, NOTE_SIZE / 2 + 0.01]}>
                <circleGeometry args={[NOTE_SIZE * 0.3, 6]} />
                <meshBasicMaterial color="#FFF" />
            </mesh>

            {/* Thick Outline Effect (Pseudo-Cel Shading) */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[NOTE_SIZE * 1.05, NOTE_SIZE * 1.05, NOTE_SIZE * 1.05]} />
                <meshBasicMaterial color="black" side={THREE.BackSide} />
            </mesh>
        </group>
    );
};

export default React.memo(Note, (prev, next) => {
    if (next.data.hit) return false;
    return prev.zPos === next.zPos && prev.data.hit === next.data.hit && prev.data.missed === next.data.missed && prev.color === next.color;
});
