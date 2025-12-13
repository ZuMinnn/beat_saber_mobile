
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { GameStatus, NoteData, HandPositions, CutDirection, Song, SaberConfig } from '../types';
import { PLAYER_Z, SPAWN_Z, MISS_Z, NOTE_SPEED, DIRECTION_VECTORS, NOTE_SIZE, LANE_X_POSITIONS, LAYER_Y_POSITIONS } from '../constants';
import Note from './Note';
import Saber from './Saber';

interface GameSceneProps {
  gameStatus: GameStatus;
  audioRef: React.RefObject<HTMLAudioElement>;
  handPositionsRef: React.MutableRefObject<any>; // Simplified type for the raw ref
  chart: NoteData[];
  song: Song;
  onNoteHit: (note: NoteData, goodCut: boolean) => void;
  onNoteMiss: (note: NoteData) => void;
  onSongEnd: () => void;
  saberConfig: SaberConfig;
}

const GameScene: React.FC<GameSceneProps> = ({
  gameStatus,
  audioRef,
  handPositionsRef,
  chart,
  song,
  onNoteHit,
  onNoteMiss,
  onSongEnd,
  saberConfig
}) => {
  // Local state for notes to trigger re-renders when they are hit/missed
  const [notesState, setNotesState] = useState<NoteData[]>(chart);
  const [currentTime, setCurrentTime] = useState(0);

  // Sync internal state if the chart prop changes completely
  useEffect(() => {
    setNotesState(chart);
  }, [chart]);

  const beatTime = 60 / song.bpm;

  // Refs for things we don't want causing re-renders every frame
  const activeNotesRef = useRef<NoteData[]>([]);
  const nextNoteIndexRef = useRef(0);
  const shakeIntensity = useRef(0);
  const gameEndedRef = useRef(false);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    activeNotesRef.current = [];
    nextNoteIndexRef.current = 0;
    shakeIntensity.current = 0;
    gameEndedRef.current = false;
  }, [chart]);


  // Helper Vector3s for collision to avoid GC
  const vecA = useMemo(() => new THREE.Vector3(), []);
  const vecB = useMemo(() => new THREE.Vector3(), []);

  const handleHit = (note: NoteData, goodCut: boolean) => {
    shakeIntensity.current = goodCut ? 0.3 : 0.15;
    onNoteHit(note, goodCut);
  }

  useFrame((state, delta) => {
    // --- Camera Shake ---
    if (shakeIntensity.current > 0 && cameraRef.current) {
      const shake = shakeIntensity.current;
      cameraRef.current.position.x = (Math.random() - 0.5) * shake;
      cameraRef.current.position.y = 1.8 + (Math.random() - 0.5) * shake;
      cameraRef.current.position.z = 4 + (Math.random() - 0.5) * shake;

      shakeIntensity.current = THREE.MathUtils.lerp(shakeIntensity.current, 0, 10 * delta);
      if (shakeIntensity.current < 0.01) {
        shakeIntensity.current = 0;
        cameraRef.current.position.set(0, 1.8, 4);
      }
    }

    if (gameStatus === GameStatus.PAUSED) return;

    if (gameStatus !== GameStatus.PLAYING || !audioRef.current || gameEndedRef.current) return;

    // Sync time with audio
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    // --- Beat Pulsing ---
    const beatPhase = (time % beatTime) / beatTime;
    const pulse = Math.pow(1 - beatPhase, 4);

    if (ambientLightRef.current) {
      // Lower base intensity to make neon materials pop more
      ambientLightRef.current.intensity = 0.3 + (pulse * 0.2);
    }

    // --- LEVEL COMPLETION CHECK ---
    // Fixed: Do not end game based on notes. End game based on Song Duration or Audio Ended event.
    // This prevents premature endings if the chart generator creates a gap in notes.
    const isAudioEnded = audioRef.current.ended;
    const isDurationReached = time >= (song.duration - 0.5); // Buffer of 0.5s

    if (isAudioEnded || isDurationReached) {
      gameEndedRef.current = true;
      onSongEnd();
      return;
    }

    // 1. Spawn Notes
    const spawnAheadTime = Math.abs(SPAWN_Z - PLAYER_Z) / NOTE_SPEED;

    while (nextNoteIndexRef.current < notesState.length) {
      const nextNote = notesState[nextNoteIndexRef.current];
      if (nextNote.time - spawnAheadTime <= time) {
        activeNotesRef.current.push(nextNote);
        nextNoteIndexRef.current++;
      } else {
        break;
      }
    }

    // 2. Update & Collide Notes
    const hands = handPositionsRef.current as HandPositions;

    for (let i = activeNotesRef.current.length - 1; i >= 0; i--) {
      const note = activeNotesRef.current[i];
      if (note.hit || note.missed) continue;

      const timeDiff = note.time - time;
      const currentZ = PLAYER_Z - (timeDiff * NOTE_SPEED);

      if (currentZ > MISS_Z) {
        note.missed = true;
        onNoteMiss(note);
        activeNotesRef.current.splice(i, 1);
        continue;
      }

      if (currentZ > PLAYER_Z - 2.0 && currentZ < PLAYER_Z + 1.5) {
        const handPos = note.type === 'left' ? hands.left : hands.right;
        const handVel = note.type === 'left' ? hands.leftVelocity : hands.rightVelocity;

        if (handPos) {
          const notePos = vecA.set(
            LANE_X_POSITIONS[note.lineIndex],
            LAYER_Y_POSITIONS[note.lineLayer],
            currentZ
          );

          if (handPos.distanceTo(notePos) < 1.2) {
            let goodCut = true;
            const speed = handVel.length();

            if (note.cutDirection !== CutDirection.ANY) {
              const requiredDir = DIRECTION_VECTORS[note.cutDirection];
              vecB.copy(handVel).normalize();
              const dot = vecB.dot(requiredDir);

              if (dot < 0.2 || speed < 0.8) {
                goodCut = false;
              }
            } else {
              if (speed < 0.8) goodCut = false;
            }

            note.hit = true;
            note.hitTime = time;
            handleHit(note, goodCut);
            activeNotesRef.current.splice(i, 1);
          }
        }
      }
    }
  });

  const visibleNotes = useMemo(() => {
    return notesState.filter(n =>
      !n.missed &&
      (!n.hit || (currentTime - (n.hitTime || 0) < 0.5)) &&
      (n.time - currentTime) < 3 &&
      (n.time - currentTime) > -1.5
    );
  }, [notesState, currentTime]);

  // Refs for visual sabers
  const leftHandPosRef = useRef<THREE.Vector3 | null>(null);
  const rightHandPosRef = useRef<THREE.Vector3 | null>(null);
  const leftHandVelRef = useRef<THREE.Vector3 | null>(null);
  const rightHandVelRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    leftHandPosRef.current = handPositionsRef.current.left;
    rightHandPosRef.current = handPositionsRef.current.right;
    leftHandVelRef.current = handPositionsRef.current.leftVelocity;
    rightHandVelRef.current = handPositionsRef.current.rightVelocity;
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 2.2, 4.5]} fov={65} />
      <color attach="background" args={['#1a0b2e']} />
      <fog attach="fog" args={['#1a0b2e', 10, 50]} />

      {/* Lighting - Optimized for mobile performance */}
      <ambientLight ref={ambientLightRef} intensity={0.5} />
      <directionalLight ref={dirLightRef} position={[5, 10, 5]} intensity={0.8} />

      {/* Optimized Grid Floor */}
      <Grid
        position={[0, -0.01, 0]}
        args={[4, 60]}
        cellThickness={0.1}
        cellColor={saberConfig.rightColor}
        sectionSize={4}
        sectionThickness={0.2}
        sectionColor={saberConfig.leftColor}
        fadeDistance={20}
        infiniteGrid
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#0d001a" />
      </mesh>



      <Saber type="left" positionRef={leftHandPosRef} velocityRef={leftHandVelRef} config={saberConfig} />
      <Saber type="right" positionRef={rightHandPosRef} velocityRef={rightHandVelRef} config={saberConfig} />

      {visibleNotes.map(note => (
        <Note
          key={note.id}
          data={note}
          zPos={PLAYER_Z - ((note.time - currentTime) * NOTE_SPEED)}
          currentTime={currentTime}
          color={note.type === 'left' ? saberConfig.leftColor : saberConfig.rightColor}
        />
      ))}
    </>
  );
};

export default GameScene;
