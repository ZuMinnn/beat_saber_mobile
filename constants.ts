
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { CutDirection, NoteData, Song, HandType } from "./types";
import * as THREE from 'three';

// Game World Config
export const TRACK_LENGTH = 50;
export const SPAWN_Z = -30;
export const PLAYER_Z = 0;
export const MISS_Z = 5;
export const NOTE_SPEED = 10; 

export const LANE_WIDTH = 0.8;
export const LAYER_HEIGHT = 0.8;
export const NOTE_SIZE = 0.5;

// Positions for the 4 lanes (centered around 0)
export const LANE_X_POSITIONS = [-1.5 * LANE_WIDTH, -0.5 * LANE_WIDTH, 0.5 * LANE_WIDTH, 1.5 * LANE_WIDTH];
export const LAYER_Y_POSITIONS = [0.8, 1.6, 2.4]; // Low, Mid, High

export const SONGS: Song[] = [
  {
    id: 'neon-velocity',
    title: 'Neon Velocity',
    artist: 'Cyber Runner',
    bpm: 140,
    url: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race2.ogg',
    duration: 160, 
    difficulty: 'Medium',
    color: '#3b82f6', // Blue
    genre: 'Synthwave'
  },
  {
    id: 'midnight-pulse',
    title: 'Midnight Pulse',
    artist: 'Synthwave Boy',
    bpm: 100,
    url: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg',
    duration: 180, 
    difficulty: 'Easy',
    color: '#a855f7', // Purple
    genre: 'Lo-Fi'
  },
  {
    id: 'adrenalin-rush',
    title: 'Adrenalin Rush',
    artist: 'Techno Core',
    bpm: 150,
    // Replaced short intromusic.ogg with a full length track to prevent premature game end
    url: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race1.ogg', 
    duration: 140, 
    difficulty: 'Hard',
    color: '#ef4444', // Red
    genre: 'Techno'
  }
];

// --- AUDIO ANALYSIS & CHART GENERATION ---

/**
 * Generates a note chart by analyzing the energy/volume of the audio buffer.
 * Uses a Grid-based approach to ensure rhythm sync and full coverage.
 */
export const generateChartFromAudio = (
    audioBuffer: AudioBuffer, 
    bpm: number, 
    difficulty: 'Easy' | 'Medium' | 'Hard'
): NoteData[] => {
    const rawData = audioBuffer.getChannelData(0); // Use Left channel for analysis
    const sampleRate = audioBuffer.sampleRate;
    const notes: NoteData[] = [];
    
    // 1. Calculate Global statistics to normalize thresholds
    // This ensures the chart generator works for both quiet and loud songs.
    let totalSum = 0;
    const analyzeStep = Math.floor(sampleRate / 100); // Downsample for speed
    let sampleCount = 0;
    for(let i=0; i<rawData.length; i+=analyzeStep) {
        totalSum += Math.abs(rawData[i]);
        sampleCount++;
    }
    const globalAverage = totalSum / sampleCount || 0.01;

    // 2. Config based on difficulty
    // We will scan strictly on a grid to ensure rhythm.
    let beatSubdivision = 1; // Quarter notes (1/1)
    if (difficulty === 'Medium') beatSubdivision = 2; // 8th notes (1/2)
    if (difficulty === 'Hard') beatSubdivision = 4; // 16th notes (1/4)

    // Sensitivity Config
    const sensitivity = 1.0; 
    const doubleHitThreshold = globalAverage * 2.5;

    const secondsPerBeat = 60 / bpm;
    const stepTime = secondsPerBeat / beatSubdivision; // Time between checks in seconds
    
    let idCount = 0;
    let lastNoteTime = 0;
    let lastHand: HandType = 'right';

    // 3. Grid-based Generation Loop
    // Start from ~2 seconds to give player time, run until end of duration
    const startTime = 2.0;
    const duration = audioBuffer.duration;

    for (let t = startTime; t < duration - 1.0; t += stepTime) {
        // Get RMS window around this grid point
        const centerSample = Math.floor(t * sampleRate);
        const windowSize = Math.floor(sampleRate * 0.05); // 50ms window
        const start = Math.max(0, centerSample - windowSize / 2);
        const end = Math.min(rawData.length, centerSample + windowSize / 2);
        
        let sumSq = 0;
        for(let j=start; j<end; j++) {
            sumSq += rawData[j] * rawData[j];
        }
        const rms = Math.sqrt(sumSq / (end - start));

        // Logic: Is this grid point "loud enough" relative to the song to be a note?
        const isLoud = rms > (globalAverage * sensitivity);
        const isPeak = rms > (globalAverage * 1.5);
        
        // Minimum gaps to prevent spam
        const minGap = difficulty === 'Hard' ? 0.15 : 0.35;
        if (t - lastNoteTime < minGap) continue;

        let shouldSpawn = false;

        // Rhythm Logic:
        // We are iterating ON the grid, so any note spawned here is "on beat".
        // We just need to decide IF we spawn it based on audio intensity.
        
        const isMainBeat = Math.abs((t % secondsPerBeat)) < 0.05;

        if (difficulty === 'Easy') {
            // Easy: Only spawn on main beats if they are significant
            if (isMainBeat && isLoud) shouldSpawn = true;
        } else if (difficulty === 'Medium') {
            // Medium: Main beats + strong off-beats
            if (isMainBeat && rms > globalAverage * 0.8) shouldSpawn = true;
            else if (isPeak) shouldSpawn = true;
        } else {
            // Hard: Spawn often if there is sound
            if (isLoud) shouldSpawn = true;
        }
        
        // Failsafe: If no note for 4 beats, force one if there is ANY sound (prevents empty sections)
        if (t - lastNoteTime > secondsPerBeat * 4 && rms > globalAverage * 0.2) {
            shouldSpawn = true;
        }

        if (shouldSpawn) {
             // Pattern Generation
             const isDouble = isPeak && difficulty !== 'Easy' && Math.random() > 0.8;
             
             if (isDouble) {
                  // Double Hit (Jump)
                  notes.push({
                     id: `gen-${idCount++}`,
                     time: t,
                     lineIndex: 1,
                     lineLayer: 0,
                     type: 'left',
                     cutDirection: CutDirection.DOWN
                 });
                 notes.push({
                     id: `gen-${idCount++}`,
                     time: t,
                     lineIndex: 2,
                     lineLayer: 0,
                     type: 'right',
                     cutDirection: CutDirection.DOWN
                 });
             } else {
                 // Single Note Flow
                 // Use sine wave of time to map flow, makes it feel like "dancing"
                 const flow = Math.sin(t * 0.5); 
                 let lane = 1;
                 
                 // Map -1..1 to 0..3
                 if (flow < -0.4) lane = 0;
                 else if (flow < 0) lane = 1;
                 else if (flow < 0.4) lane = 2;
                 else lane = 3;

                 // Alternate hand to ensure flow
                 const hand = lastHand === 'right' ? 'left' : 'right';
                 
                 // High intensity sounds go to top layer
                 const layer = (rms > doubleHitThreshold) ? 1 : 0;

                 notes.push({
                     id: `gen-${idCount++}`,
                     time: t,
                     lineIndex: lane,
                     lineLayer: layer,
                     type: hand,
                     cutDirection: CutDirection.ANY
                 });
                 
                 lastHand = hand;
             }
             lastNoteTime = t;
        }
    }

    return notes;
};

// Generate a rhythmic chart based on the selected song (Static Fallback)
export const generateChartForSong = (song: Song): NoteData[] => {
  const notes: NoteData[] = [];
  let idCount = 0;
  const beatTime = 60 / song.bpm;
  
  // Calculate total beats based on duration (minus some buffer at start/end)
  const totalBeats = Math.floor((song.duration - 5) / beatTime);
  const startBeat = 8; // Give player 8 beats (more time) to get ready

  for (let i = startBeat; i < totalBeats; i++) {
    const time = i * beatTime;
    
    // --- DIFFICULTY ADJUSTMENTS ---
    // Easy: Significant reduction. Notes only every 2 beats (half notes).
    if (song.difficulty === 'Easy') {
        if (i % 2 !== 0) continue; 
    }

    // Medium: Standard beat (quarter notes), but skip some to create "breathing room"
    if (song.difficulty === 'Medium') {
        // Skip every 8th beat for a pause
        if (i % 8 === 7) continue;
    }

    // Pattern generation
    const pattern = Math.floor(i / 8) % 4;

    if (pattern === 0) {
      // Basic Alternating (Left/Right)
      const isLeft = i % 2 === 0;
      notes.push({
        id: `note-${idCount++}`,
        time: time,
        lineIndex: isLeft ? 1 : 2,
        lineLayer: 0,
        type: isLeft ? 'left' : 'right',
        cutDirection: CutDirection.ANY
      });
    } else if (pattern === 1) {
      // Double Hits (only on main beats, and less frequent)
      if (i % 4 === 0 && song.difficulty !== 'Easy') {
         notes.push(
           { id: `note-${idCount++}`, time, lineIndex: 1, lineLayer: 1, type: 'left', cutDirection: CutDirection.ANY },
           { id: `note-${idCount++}`, time, lineIndex: 2, lineLayer: 1, type: 'right', cutDirection: CutDirection.ANY }
         );
      } else {
         // Fallback to single note if not a double hit beat
         notes.push({
            id: `note-${idCount++}`,
            time: time,
            lineIndex: (i % 2 === 0) ? 1 : 2,
            lineLayer: 0,
            type: (i % 2 === 0) ? 'left' : 'right',
            cutDirection: CutDirection.ANY
         });
      }
    } else if (pattern === 2) {
      // Streams or syncopation
      if (song.difficulty === 'Hard' && i % 2 === 0) {
          // Hard: Short bursts
          notes.push({
            id: `note-${idCount++}`,
            time: time,
            lineIndex: 1,
            lineLayer: 0,
            type: 'left',
            cutDirection: CutDirection.DOWN
          });
          notes.push({
            id: `note-${idCount++}`,
            time: time + (beatTime / 2), // 8th note
            lineIndex: 2,
            lineLayer: 0,
            type: 'right',
            cutDirection: CutDirection.DOWN
          });
      } else {
          // Standard hit
          notes.push({
            id: `note-${idCount++}`,
            time: time,
            lineIndex: Math.random() > 0.5 ? 0 : 3, // Use outer lanes occasionally
            lineLayer: 0,
            type: Math.random() > 0.5 ? 'left' : 'right',
            cutDirection: CutDirection.ANY
          });
      }
    } else {
      // Rest or simple center hits
       if (i % 2 === 0) {
        notes.push({
            id: `note-${idCount++}`,
            time: time,
            lineIndex: Math.random() > 0.5 ? 1 : 2,
            lineLayer: 1,
            type: Math.random() > 0.5 ? 'left' : 'right',
            cutDirection: CutDirection.ANY
          });
       }
    }
  }

  return notes.sort((a, b) => a.time - b.time);
};

export const DEMO_CHART = []; 

// Vectors for direction checking
export const DIRECTION_VECTORS: Record<CutDirection, THREE.Vector3> = {
  [CutDirection.UP]: new THREE.Vector3(0, 1, 0),
  [CutDirection.DOWN]: new THREE.Vector3(0, -1, 0),
  [CutDirection.LEFT]: new THREE.Vector3(-1, 0, 0),
  [CutDirection.RIGHT]: new THREE.Vector3(1, 0, 0),
  [CutDirection.ANY]: new THREE.Vector3(0, 0, 0) // Magnitude check only
};
