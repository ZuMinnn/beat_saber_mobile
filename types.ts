
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';

export enum GameStatus {
  LOADING = 'LOADING',
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum ControlMode {
  HAND_TRACKING = 'HAND_TRACKING',
  TOUCH_CONTROL = 'TOUCH_CONTROL'
}

export type HandType = 'left' | 'right';

// 0: Up, 1: Down, 2: Left, 3: Right, 4: Any (Dot)
export enum CutDirection {
  UP = 0,
  DOWN = 1,
  LEFT = 2,
  RIGHT = 3,
  ANY = 4
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  url: string;
  duration: number; // approximate duration in seconds for chart generation
  difficulty: 'Easy' | 'Medium' | 'Hard';
  color: string;
  genre?: string;
}

export interface NoteData {
  id: string;
  time: number;     // Time in seconds when it should reach the player
  lineIndex: number; // 0-3 (horizontal position)
  lineLayer: number; // 0-2 (vertical position)
  type: HandType;    // which hand should cut it
  cutDirection: CutDirection;
  hit?: boolean;
  missed?: boolean;
  hitTime?: number; // Time when hit occurred
}

export interface HandPositions {
  left: THREE.Vector3 | null;
  right: THREE.Vector3 | null;
  leftVelocity: THREE.Vector3;
  rightVelocity: THREE.Vector3;
}

export interface SaberConfig {
  leftColor: string;
  rightColor: string;
  length: number;
  thickness: number;
}

export const COLORS = {
  left: '#FF0099',  // Hot Pink
  right: '#00F0FF', // Cyan
  track: '#1a0b2e', // Deep Violet
  hittable: '#FAFF00' // Yellow Accent
};
