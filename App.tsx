
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { GameStatus, NoteData, Song, SaberConfig, COLORS, ControlMode } from './types';
import { SONGS, generateChartForSong, generateChartFromAudio } from './constants';
import { useMediaPipe } from './hooks/useMediaPipe';
import GameScene from './components/GameScene';
import WebcamPreview from './components/WebcamPreview';
import { Play, RefreshCw, VideoOff, Hand, Sparkles, Music, BarChart, Upload, FileAudio, Settings, Pause, Home, Zap, X, Activity, Clock, Tag } from 'lucide-react';

const App: React.FC = () => {
    const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.LOADING);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [health, setHealth] = useState(100);

    // Saber Configuration State
    const [saberConfig, setSaberConfig] = useState<SaberConfig>({
        leftColor: COLORS.left,
        rightColor: COLORS.right,
        length: 1.2,
        thickness: 1.0
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showCamPreview, setShowCamPreview] = useState(true);

    // Control Mode State
    const [controlMode, setControlMode] = useState<ControlMode>(ControlMode.HAND_TRACKING);

    // Song Selection State
    const [selectedSong, setSelectedSong] = useState<Song>(SONGS[0]);
    const [activeChart, setActiveChart] = useState<NoteData[]>([]);

    // Custom Song State
    const [customSong, setCustomSong] = useState<Song | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize audio with the first song
    const audioRef = useRef<HTMLAudioElement>(new Audio(SONGS[0].url));
    const videoRef = useRef<HTMLVideoElement>(null);

    // Audio Context for SFX and Analysis
    const sfxContext = useRef<AudioContext | null>(null);

    // Only initialize MediaPipe if using Hand Tracking mode
    const shouldUseCamera = controlMode === ControlMode.HAND_TRACKING;
    const { isCameraReady, handPositionsRef, lastResultsRef, error: cameraError } = useMediaPipe(videoRef, shouldUseCamera);
    const { progress } = useProgress();

    // Touch Control Positions (for Touch Control mode)
    const touchPositionsRef = useRef<{
        left: THREE.Vector3 | null;
        right: THREE.Vector3 | null;
        leftVelocity: THREE.Vector3;
        rightVelocity: THREE.Vector3;
        lastLeft: THREE.Vector3 | null;
        lastRight: THREE.Vector3 | null;
    }>({
        left: null,
        right: null,
        leftVelocity: new THREE.Vector3(0, 0, 0),
        rightVelocity: new THREE.Vector3(0, 0, 0),
        lastLeft: null,
        lastRight: null
    });

    // Initialize SFX Context
    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            sfxContext.current = new AudioContextClass();
        }
        return () => {
            sfxContext.current?.close();
        };
    }, []);

    const playHitSound = useCallback((good: boolean) => {
        if (!sfxContext.current) return;
        const ctx = sfxContext.current;
        if (ctx.state === 'suspended') ctx.resume().catch(() => { });

        const t = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        const osc = ctx.createOscillator();

        if (good) {
            // Pop sound: SINE wave with rapid pitch drop
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        } else {
            // Miss: Noise-like low frequency
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.linearRampToValueAtTime(50, t + 0.1);
        }

        osc.connect(gain);
        osc.start(t);
        osc.stop(t + 0.1);
    }, []);

    // Touch Control Handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (controlMode !== ControlMode.TOUCH_CONTROL || gameStatus !== GameStatus.PLAYING) return;

        Array.from(e.touches).forEach(touch => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            const isLeft = x < rect.width / 2;

            // Map touch to 3D space
            const worldX = ((x / rect.width) - 0.5) * 5;
            const worldY = (1 - (y / rect.height)) * 3.5 + 0.8;
            const worldZ = 0;

            const pos = new THREE.Vector3(worldX, worldY, worldZ);

            if (isLeft) {
                touchPositionsRef.current.left = pos;
                touchPositionsRef.current.lastLeft = pos.clone();
            } else {
                touchPositionsRef.current.right = pos;
                touchPositionsRef.current.lastRight = pos.clone();
            }
        });
    }, [controlMode, gameStatus]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (controlMode !== ControlMode.TOUCH_CONTROL || gameStatus !== GameStatus.PLAYING) return;

        Array.from(e.touches).forEach(touch => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            const isLeft = x < rect.width / 2;

            const worldX = ((x / rect.width) - 0.5) * 5;
            const worldY = (1 - (y / rect.height)) * 3.5 + 0.8;
            const worldZ = 0;

            const newPos = new THREE.Vector3(worldX, worldY, worldZ);

            if (isLeft && touchPositionsRef.current.left) {
                const vel = newPos.clone().sub(touchPositionsRef.current.left).multiplyScalar(60);
                touchPositionsRef.current.leftVelocity.copy(vel);
                touchPositionsRef.current.left = newPos;
            } else if (!isLeft && touchPositionsRef.current.right) {
                const vel = newPos.clone().sub(touchPositionsRef.current.right).multiplyScalar(60);
                touchPositionsRef.current.rightVelocity.copy(vel);
                touchPositionsRef.current.right = newPos;
            }
        });
    }, [controlMode, gameStatus]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (controlMode !== ControlMode.TOUCH_CONTROL) return;

        // Reset positions when touch ends
        touchPositionsRef.current.left = null;
        touchPositionsRef.current.right = null;
        touchPositionsRef.current.leftVelocity.set(0, 0, 0);
        touchPositionsRef.current.rightVelocity.set(0, 0, 0);
    }, [controlMode]);


    // Update audio source when song changes
    useEffect(() => {
        if (audioRef.current) {
            // Pause if playing (though unlikely in IDLE state)
            audioRef.current.pause();
            audioRef.current.src = selectedSong.url;
            audioRef.current.load();
        }
    }, [selectedSong]);

    // Handle Pause/Resume Audio Effect
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (gameStatus === GameStatus.PAUSED) {
            audio.pause();
        } else if (gameStatus === GameStatus.PLAYING && audio.paused) {
            audio.play().catch(e => console.error("Resume failed", e));
        }
    }, [gameStatus]);

    // Determine which positions to use based on control mode
    const currentPositionsRef = useMemo(() => {
        return controlMode === ControlMode.HAND_TRACKING ? handPositionsRef : touchPositionsRef;
    }, [controlMode, handPositionsRef, touchPositionsRef]);

    const isInputReady = useMemo(() => {
        if (controlMode === ControlMode.HAND_TRACKING) {
            return isCameraReady;
        } else {
            return true; // Touch control is always ready
        }
    }, [controlMode, isCameraReady]);


    // Helper: Format Seconds to MM:SS
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Handle Custom File Upload & Analysis
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);

        try {
            const objectUrl = URL.createObjectURL(file);

            // 1. Decode Audio for Analysis
            const arrayBuffer = await file.arrayBuffer();
            if (!sfxContext.current) sfxContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();

            const audioBuffer = await sfxContext.current.decodeAudioData(arrayBuffer);

            // 2. Default BPM (can be adjusted by user)
            const detectedBpm = 120; // Auto-BPM detection is very complex, defaulting to 120 and letting user adjust

            // 3. Generate Chart based on Waveform
            const generatedChart = generateChartFromAudio(audioBuffer, detectedBpm, 'Medium');

            const newCustomSong: Song = {
                id: 'custom-track',
                title: file.name.replace(/\.[^/.]+$/, "").substring(0, 20),
                artist: 'YOU',
                bpm: detectedBpm,
                url: objectUrl,
                duration: audioBuffer.duration,
                difficulty: 'Medium',
                color: '#FAFF00',
                genre: 'Custom'
            };

            setCustomSong(newCustomSong);
            setSelectedSong(newCustomSong);
            setActiveChart(generatedChart);

            // Store the buffer/context for re-generation if BPM changes
            // For simplicity in this demo, we regenerator only on upload or major changes
        } catch (err) {
            console.error("Error analyzing audio:", err);
            alert("Could not analyze audio file.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const regenerateCustomChart = async (bpm: number, difficulty: 'Easy' | 'Medium' | 'Hard') => {
        if (!customSong || !fileInputRef.current?.files?.[0]) return;

        setIsAnalyzing(true);
        try {
            // Re-read file to get buffer (in a real app, we'd cache the buffer)
            const file = fileInputRef.current.files[0];
            const arrayBuffer = await file.arrayBuffer();
            if (!sfxContext.current) sfxContext.current = new AudioContext();
            const audioBuffer = await sfxContext.current.decodeAudioData(arrayBuffer);

            const newChart = generateChartFromAudio(audioBuffer, bpm, difficulty);
            setActiveChart(newChart);

            const updated = { ...customSong, bpm, difficulty };
            setCustomSong(updated);
            setSelectedSong(updated);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Game Logic Handlers
    const handleNoteHit = useCallback((note: NoteData, goodCut: boolean) => {
        let points = 100;
        if (goodCut) points += 50;

        // Haptic feedback for impact
        if (navigator.vibrate) {
            navigator.vibrate(goodCut ? 40 : 20);
        }

        // Play SFX
        playHitSound(goodCut);

        setCombo(c => {
            const newCombo = c + 1;
            if (newCombo > 30) setMultiplier(8);
            else if (newCombo > 20) setMultiplier(4);
            else if (newCombo > 10) setMultiplier(2);
            else setMultiplier(1);
            return newCombo;
        });

        setScore(s => s + (points * multiplier));
        setHealth(h => Math.min(100, h + 2));
    }, [multiplier, playHitSound]);

    const handleNoteMiss = useCallback((note: NoteData) => {
        setCombo(0);
        setMultiplier(1);
        setHealth(h => {
            const newHealth = h - 15;
            if (newHealth <= 0) {
                setTimeout(() => endGame(false), 0);
                return 0;
            }
            return newHealth;
        });
    }, []);

    const startGame = async () => {
        if (!isInputReady) return;

        // Ensure SFX context is running on user interaction
        if (sfxContext.current && sfxContext.current.state === 'suspended') {
            sfxContext.current.resume();
        }

        // If it's a built-in song, generate chart now. If custom, we already have activeChart.
        if (selectedSong.id !== 'custom-track') {
            const newChart = generateChartForSong(selectedSong);
            setActiveChart(newChart);
        }

        setScore(0);
        setCombo(0);
        setMultiplier(1);
        setHealth(100);

        try {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                // We set status to PLAYING, the effect above will trigger audio.play()
                setGameStatus(GameStatus.PLAYING);
            }
        } catch (e) {
            console.error("Audio play failed", e);
            alert("Could not start audio. Please interact with the page first.");
        }
    };

    const togglePause = () => {
        if (gameStatus === GameStatus.PLAYING) {
            setGameStatus(GameStatus.PAUSED);
        } else if (gameStatus === GameStatus.PAUSED) {
            setGameStatus(GameStatus.PLAYING);
        }
    };

    const endGame = (victory: boolean) => {
        setGameStatus(victory ? GameStatus.VICTORY : GameStatus.GAME_OVER);
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    const returnToMenu = () => {
        setGameStatus(GameStatus.IDLE);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    useEffect(() => {
        if (gameStatus === GameStatus.LOADING && isCameraReady) {
            setGameStatus(GameStatus.IDLE);
        }
    }, [isCameraReady, gameStatus]);

    // Neo-Brutalist Component Styles
    const boxStyle = "bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black";
    const btnStyle = "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none uppercase font-bold tracking-tight text-black";

    // Explicit colors for difficulty to ensure visibility against white/yellow backgrounds
    const getDifficultyBadgeStyle = (diff: string) => {
        const base = "border-2 border-black px-2 py-0.5 text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black ml-auto";
        if (diff === 'Easy') return `${base} bg-[#00F0FF]`; // Cyan
        if (diff === 'Medium') return `${base} bg-[#FFA500]`; // Orange
        return `${base} bg-[#FF0099] text-white`; // Hot Pink
    };

    return (
        <div className="relative w-full h-[100dvh] bg-[#1a0b2e] overflow-hidden font-sans select-none text-black"
            style={{ touchAction: 'none' }}>
            {/* Hidden Video for Processing */}
            <video
                ref={videoRef}
                className="absolute opacity-0 pointer-events-none"
                playsInline
                muted
                autoPlay
                style={{ width: '640px', height: '480px' }}
            />

            {/* Hidden File Input */}
            <input
                type="file"
                accept="audio/*"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* 3D Canvas */}
            <Canvas dpr={1.0}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}>
                {gameStatus !== GameStatus.LOADING && (
                    <GameScene
                        gameStatus={gameStatus}
                        audioRef={audioRef}
                        handPositionsRef={currentPositionsRef}
                        chart={activeChart}
                        song={selectedSong}
                        onNoteHit={handleNoteHit}
                        onNoteMiss={handleNoteMiss}
                        onSongEnd={() => endGame(true)}
                        saberConfig={saberConfig}
                    />
                )}
            </Canvas>

            {/* Webcam Mini-Map Preview - Only show for Hand Tracking mode */}
            {controlMode === ControlMode.HAND_TRACKING && showCamPreview && (
                <WebcamPreview
                    videoRef={videoRef}
                    resultsRef={lastResultsRef}
                    isCameraReady={isCameraReady}
                    leftColor={saberConfig.leftColor}
                    rightColor={saberConfig.rightColor}
                />
            )}

            {/* Settings Modal - Redesigned for readability */}
            {isSettingsOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className={`${boxStyle} p-0 max-w-lg w-full max-h-[90dvh] bg-white relative text-black flex flex-col overflow-hidden`}>
                        {/* Header */}
                        <div className="bg-[#FAFF00] p-6 border-b-4 border-black flex justify-between items-center">
                            <h2 className="text-4xl font-black italic text-black tracking-tight">CUSTOMIZE</h2>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="p-8 space-y-8 bg-white overflow-y-auto flex-1">
                            {/* Control Mode Toggle */}
                            <div className="bg-gray-50 p-4 border-2 border-black">
                                <label className="font-bold mb-3 block uppercase text-sm text-black">Control Mode</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setControlMode(ControlMode.HAND_TRACKING)}
                                        className={`flex-1 py-3 px-4 border-2 border-black font-bold uppercase text-sm transition-all ${controlMode === ControlMode.HAND_TRACKING
                                            ? 'bg-[#00F0FF] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                            : 'bg-white text-black hover:bg-gray-100'
                                            }`}
                                    >
                                        <Hand className="w-5 h-5 inline-block mr-2" />
                                        Hand Tracking
                                    </button>
                                    <button
                                        onClick={() => setControlMode(ControlMode.TOUCH_CONTROL)}
                                        className={`flex-1 py-3 px-4 border-2 border-black font-bold uppercase text-sm transition-all ${controlMode === ControlMode.TOUCH_CONTROL
                                            ? 'bg-[#FF0099] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                            : 'bg-white text-black hover:bg-gray-100'
                                            }`}
                                    >
                                        <Activity className="w-5 h-5 inline-block mr-2" />
                                        Touch Control
                                    </button>
                                </div>
                                {controlMode === ControlMode.TOUCH_CONTROL && (
                                    <p className="mt-2 text-xs text-gray-600 border-l-2 border-[#FF0099] pl-2">
                                        Touch left/right side of screen to control sabers. No camera needed!
                                    </p>
                                )}
                            </div>

                            {/* Colors */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="font-bold block mb-2 uppercase text-sm text-black border-l-4 border-[#FF0099] pl-2">Left Color</label>
                                    <div className="relative border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-12 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                                        <input
                                            type="color"
                                            value={saberConfig.leftColor}
                                            onChange={e => setSaberConfig({ ...saberConfig, leftColor: e.target.value })}
                                            className="w-full h-full opacity-0 cursor-pointer absolute z-10"
                                        />
                                        <div className="absolute inset-0" style={{ backgroundColor: saberConfig.leftColor }}></div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="font-bold block mb-2 uppercase text-sm text-black border-l-4 border-[#00F0FF] pl-2">Right Color</label>
                                    <div className="relative border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-12 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                                        <input
                                            type="color"
                                            value={saberConfig.rightColor}
                                            onChange={e => setSaberConfig({ ...saberConfig, rightColor: e.target.value })}
                                            className="w-full h-full opacity-0 cursor-pointer absolute z-10"
                                        />
                                        <div className="absolute inset-0" style={{ backgroundColor: saberConfig.rightColor }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Length */}
                            <div className="bg-gray-50 p-4 border-2 border-black">
                                <label className="font-bold mb-2 flex justify-between uppercase text-sm text-black">
                                    <span>Blade Length</span>
                                    <span className="font-mono bg-black text-white px-2 py-0.5 text-xs">{saberConfig.length.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={saberConfig.length}
                                    onChange={e => setSaberConfig({ ...saberConfig, length: parseFloat(e.target.value) })}
                                    className="w-full h-4 bg-white border-2 border-black appearance-none accent-black cursor-pointer"
                                />
                            </div>

                            {/* Thickness */}
                            <div className="bg-gray-50 p-4 border-2 border-black">
                                <label className="font-bold mb-2 flex justify-between uppercase text-sm text-black">
                                    <span>Thickness</span>
                                    <span className="font-mono bg-black text-white px-2 py-0.5 text-xs">{saberConfig.thickness.toFixed(1)}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={saberConfig.thickness}
                                    onChange={e => setSaberConfig({ ...saberConfig, thickness: parseFloat(e.target.value) })}
                                    className="w-full h-4 bg-white border-2 border-black appearance-none accent-black cursor-pointer"
                                />
                            </div>

                            <button onClick={() => setIsSettingsOpen(false)} className={`${btnStyle} w-full py-4 bg-gray text-black hover:bg-white-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
                                SAVE CHANGES
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-[2vmin] z-10">

                {/* HUD (Top) */}
                <div className="flex justify-between items-start w-full">
                    {/* Health & Song Info */}
                    <div className={`transition-all duration-300 transform ${gameStatus === GameStatus.IDLE ? '-translate-y-40' : 'translate-y-0'}`}>
                        <div className={`${boxStyle} rotate-1`}
                            style={{ padding: 'min(1.5vmin, 1rem)', maxWidth: 'min(40vw, 20rem)' }}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold uppercase leading-none text-black truncate" style={{ fontSize: 'clamp(0.875rem, 2.5vmin, 1.25rem)' }}>{selectedSong.title}</span>
                                <span className={`${getDifficultyBadgeStyle(selectedSong.difficulty)} animate-pulse ml-2`}>LIVE</span>
                            </div>
                            <div className="w-full h-6 border-2 border-black bg-gray-200 relative">
                                <div
                                    className="h-full transition-all duration-300"
                                    style={{ width: `${health}%`, backgroundColor: saberConfig.leftColor }}
                                />
                                {/* Stripe pattern overlay */}
                                <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjwqonyABJwcXFhDNABGAYAYi4IA6u25X4AAAAASUVORK5CYII=')] opacity-20"></div>
                            </div>
                            <div className="flex justify-between text-xs font-bold mt-1 text-black">
                                <span>CRITICAL</span>
                                <span>STABLE</span>
                            </div>
                        </div>
                    </div>

                    {/* Score & Combo */}
                    <div className={`transition-all duration-300 transform flex flex-col items-end ${gameStatus === GameStatus.IDLE ? '-translate-y-40' : 'translate-y-0'}`}>
                        <div className={`${boxStyle} -rotate-1 text-center`}
                            style={{ padding: 'min(1.5vmin, 1rem)', minWidth: 'min(25vw, 12rem)' }}>
                            <p className="font-bold text-gray-500 uppercase tracking-widest" style={{ fontSize: 'clamp(0.625rem, 1.5vmin, 0.75rem)', marginBottom: '-0.3rem' }}>Score</p>
                            <h1 className="font-black tracking-tighter text-black leading-none" style={{ fontSize: 'clamp(2rem, 7vmin, 4rem)' }}>
                                {score.toLocaleString()}
                            </h1>
                        </div>

                        {(combo > 0) && (
                            <div style={{ marginTop: 'min(2vmin, 1rem)', marginRight: 'min(1vmin, 0.5rem)' }}>
                                <div className={`bg-[#00F0FF] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-2 animate-bounce`}
                                    style={{ padding: 'min(1vmin, 0.5rem)' }}>
                                    <p className="font-black italic text-black" style={{ fontSize: 'clamp(1.25rem, 4vmin, 2rem)' }}>{combo}x COMBO</p>
                                </div>
                                {multiplier > 1 && (
                                    <div className="mt-1 flex justify-end">
                                        <span className="bg-black text-white text-xs px-2 py-1 font-mono">{multiplier}X MULTIPLIER</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pause Button */}
                    <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto" style={{ top: 'min(3vmin, 1.5rem)' }}>
                        {(gameStatus === GameStatus.PLAYING || gameStatus === GameStatus.PAUSED) && (
                            <button
                                onClick={togglePause}
                                className={`${btnStyle} rounded-full bg-white`}
                                style={{ padding: 'min(2vmin, 1rem)' }}
                            >
                                {gameStatus === GameStatus.PAUSED ? <Play fill="black" /> : <Pause fill="black" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Menus (Centered) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                    {/* Loading Screen */}
                    {gameStatus === GameStatus.LOADING && (
                        <div className={`${boxStyle} p-12 flex flex-col items-center bg-[#FAFF00] pointer-events-auto`}>
                            <div className="animate-spin h-16 w-16 border-8 border-black border-t-transparent rounded-full mb-6"></div>
                            <h2 className="text-4xl font-black mb-2 uppercase italic text-black">Loading...</h2>
                            <p className="font-mono bg-black text-white px-2 py-1">{!isCameraReady ? "WAITING FOR CAMERA" : "PREPARING ASSETS"}</p>
                            {cameraError && <p className="mt-4 bg-red-500 border-2 border-black text-white px-4 py-2 font-bold">{cameraError}</p>}
                        </div>
                    )}

                    {/* Pause Menu */}
                    {gameStatus === GameStatus.PAUSED && (
                        <div className={`${boxStyle} p-8 flex flex-col gap-4 min-w-[300px] pointer-events-auto bg-white`}>
                            <h2 className="text-5xl font-black italic text-center text-black mb-4">PAUSED</h2>

                            <button onClick={togglePause} className={`${btnStyle} py-4 text-xl flex items-center justify-center gap-2 bg-[#00F0FF] text-black`}>
                                <Play className="w-6 h-6" fill="currentColor" /> RESUME
                            </button>

                            <button onClick={startGame} className={`${btnStyle} py-4 text-xl flex items-center justify-center gap-2 text-black hover:bg-gray-100`}>
                                <RefreshCw className="w-6 h-6" /> RESTART
                            </button>

                            <button onClick={returnToMenu} className={`${btnStyle} py-4 text-xl flex items-center justify-center gap-2 bg-[#FF0099] text-white`}>
                                <Home className="w-6 h-6" /> QUIT
                            </button>
                        </div>
                    )}

                    {/* Main Menu - Mobile Landscape Optimized */}
                    {gameStatus === GameStatus.IDLE && !isSettingsOpen && (
                        <div className="flex flex-col w-full h-full pointer-events-auto"
                            style={{ padding: 'min(3vmin, 1.5rem) min(4vmin, 2rem)' }}>

                            {/* Logo Section - Compact for Mobile */}
                            <div className="flex items-center justify-between" style={{ marginBottom: 'min(2vmin, 1rem)' }}>
                                <h1 className="font-black text-white tracking-tighter italic"
                                    style={{ fontSize: 'clamp(2rem, 6vmin, 3.5rem)', lineHeight: '0.9' }}>
                                    RHYTHM <span className="text-[#00F0FF]">SLASHER</span>
                                </h1>
                                {isInputReady && (
                                    <div className="bg-[#00F0FF] border-2 border-black font-bold text-black"
                                        style={{ padding: 'min(1vmin, 0.5rem) min(2vmin, 1rem)', fontSize: 'clamp(0.75rem, 2vmin, 1rem)' }}>
                                        {controlMode === ControlMode.HAND_TRACKING ? 'CAMERA READY' : 'TOUCH READY'}
                                    </div>
                                )}
                            </div>

                            {/* Content - Horizontal Layout */}
                            <div className="flex flex-col flex-1 overflow-hidden" style={{ gap: 'min(2vmin, 1rem)' }}>

                                {/* Song List - Horizontal Scroll */}
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    {/* Header */}
                                    <h3 className="text-white font-bold flex items-center bg-black w-fit border-l-4 border-[#FF0099]"
                                        style={{ fontSize: 'clamp(0.875rem, 2.5vmin, 1.25rem)', padding: 'min(1vmin, 0.5rem) min(2vmin, 1rem)', marginBottom: 'min(1.5vmin, 0.75rem)' }}>
                                        <Music style={{ width: 'clamp(1rem, 3vmin, 1.5rem)', height: 'clamp(1rem, 3vmin, 1.5rem)', marginRight: '0.5rem' }} /> SELECT TRACK
                                    </h3>

                                    {/* Horizontal Scrolling Song List */}
                                    <div className="flex overflow-x-auto overflow-y-hidden pb-2"
                                        style={{ gap: 'min(2vmin, 1rem)', scrollbarWidth: 'thin', scrollbarColor: '#FAFF00 #000' }}>
                                        {SONGS.map(song => (
                                            <button
                                                key={song.id}
                                                onClick={() => setSelectedSong(song)}
                                                className={`flex-shrink-0 transition-all duration-200 border-4 border-black relative
                                                    ${selectedSong.id === song.id
                                                        ? 'bg-[#FAFF00] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] scale-105'
                                                        : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-102'}
                                                `}
                                                style={{
                                                    width: 'min(35vw, 18rem)',
                                                    minHeight: 'min(18vh, 9rem)',
                                                    padding: 'min(2vmin, 1rem)'
                                                }}
                                            >
                                                <div className="flex flex-col h-full justify-between">
                                                    <div>
                                                        <h3 className="font-black uppercase italic text-black leading-tight"
                                                            style={{ fontSize: 'clamp(1rem, 3vmin, 1.5rem)', marginBottom: '0.25rem' }}>
                                                            {song.title}
                                                        </h3>
                                                        <p className="font-bold text-black opacity-80"
                                                            style={{ fontSize: 'clamp(0.75rem, 2vmin, 1rem)' }}>
                                                            {song.artist}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 flex-wrap">
                                                        <span className="font-mono font-bold bg-black text-white border-2 border-black"
                                                            style={{ fontSize: 'clamp(0.625rem, 1.5vmin, 0.75rem)', padding: '0.25rem 0.5rem' }}>
                                                            {song.bpm} BPM
                                                        </span>
                                                        <span className={getDifficultyBadgeStyle(song.difficulty)}
                                                            style={{ fontSize: 'clamp(0.625rem, 1.5vmin, 0.75rem)' }}>
                                                            {song.difficulty}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}

                                        {/* Custom Song Upload */}
                                        <div
                                            className={`flex-shrink-0 border-4 border-black cursor-pointer transition-all flex flex-col items-center justify-center
                                                ${selectedSong.id === 'custom-track' ? 'bg-[#FAFF00] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] scale-105' : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-102'}
                                            `}
                                            style={{
                                                width: 'min(35vw, 18rem)',
                                                minHeight: 'min(18vh, 9rem)',
                                                padding: 'min(2vmin, 1rem)',
                                                gap: 'min(1vmin, 0.5rem)'
                                            }}
                                            onClick={() => !customSong ? fileInputRef.current?.click() : setSelectedSong(customSong)}
                                        >
                                            {!customSong ? (
                                                <>
                                                    {isAnalyzing ? (
                                                        <div className="flex flex-col items-center">
                                                            <Activity className="w-8 h-8 text-[#FF0099] animate-bounce" />
                                                            <span className="font-bold uppercase text-black text-sm mt-1">ANALYZING WAVEFORM...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-8 h-8 text-black" />
                                                            <span className="font-bold uppercase text-black">Upload MP3</span>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="w-full h-full text-black flex flex-col items-center justify-center gap-2">
                                                    <div className="font-bold truncate uppercase text-center w-full px-2">{customSong.title}</div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCustomSong(null);
                                                            if (selectedSong.id === 'custom-track') {
                                                                setSelectedSong(SONGS[0]);
                                                            }
                                                            fileInputRef.current?.click();
                                                        }}
                                                        className="bg-white border-2 border-black px-3 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                    >
                                                        <Upload className="w-3 h-3 inline mr-1" />
                                                        Change
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>    {/* Bottom Action Bar */}
                                <div className="flex items-center justify-between pointer-events-auto"
                                    style={{ gap: 'min(2vmin, 1rem)' }}>

                                    {/* Current Selection - Compact */}
                                    <div className={`${boxStyle} bg-[#00F0FF] text-black flex-1`}
                                        style={{ padding: 'min(2vmin, 1rem)' }}>
                                        <div className="flex items-center justify-between" style={{ gap: 'min(2vmin, 1rem)' }}>
                                            <div>
                                                <h4 className="font-bold uppercase text-black" style={{ fontSize: 'clamp(0.75rem, 2vmin, 1rem)', marginBottom: '0.25rem' }}>NOW PLAYING</h4>
                                                <div className="font-black italic text-black" style={{ fontSize: 'clamp(1.25rem, 4vmin, 2rem)', lineHeight: '1' }}>{selectedSong.title}</div>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <div className="bg-black text-white font-bold border-2 border-black"
                                                    style={{ fontSize: 'clamp(0.75rem, 2vmin, 1rem)', padding: 'min(1vmin, 0.5rem)' }}>
                                                    {selectedSong.bpm} BPM
                                                </div>
                                                <div className="bg-white text-black font-bold border-2 border-black uppercase"
                                                    style={{ fontSize: 'clamp(0.75rem, 2vmin, 1rem)', padding: 'min(1vmin, 0.5rem)' }}>
                                                    {selectedSong.difficulty}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex" style={{ gap: 'min(2vmin, 1rem)' }}>
                                        {/* Cam Preview Toggle - Only show in Hand Tracking mode */}
                                        {controlMode === ControlMode.HAND_TRACKING && (
                                            <button
                                                onClick={() => setShowCamPreview(!showCamPreview)}
                                                className={`border-4 border-black transition-all flex items-center justify-center font-bold ${showCamPreview
                                                    ? 'bg-[#00F0FF] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                                                    : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                                    } hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none`}
                                                style={{ padding: 'min(2vmin, 1rem)', gap: '0.5rem' }}
                                                title={showCamPreview ? "Hide Camera" : "Show Camera"}
                                            >
                                                {showCamPreview ? <VideoOff style={{ width: 'clamp(1.25rem, 4vmin, 2rem)', height: 'clamp(1.25rem, 4vmin, 2rem)' }} /> : <Hand style={{ width: 'clamp(1.25rem, 4vmin, 2rem)', height: 'clamp(1.25rem, 4vmin, 2rem)' }} />}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setIsSettingsOpen(true)}
                                            className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all flex items-center justify-center font-bold text-black"
                                            style={{ padding: 'min(2vmin, 1rem)', gap: '0.5rem' }}
                                        >
                                            <Settings style={{ width: 'clamp(1.25rem, 4vmin, 2rem)', height: 'clamp(1.25rem, 4vmin, 2rem)' }} />
                                            <span style={{ fontSize: 'clamp(0.875rem, 2.5vmin, 1.25rem)' }}>SETTINGS</span>
                                        </button>

                                        {!isInputReady ? (
                                            <div className="flex-1 bg-black text-red-500 font-mono border-4 border-red-500 animate-pulse flex items-center justify-center text-center font-bold"
                                                style={{ padding: 'min(2vmin, 1rem)', fontSize: 'clamp(0.875rem, 2.5vmin, 1.25rem)' }}>
                                                {controlMode === ControlMode.HAND_TRACKING ? '>> WAITING FOR CAMERA...' : '>> INITIALIZING...'}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={startGame}
                                                disabled={isAnalyzing}
                                                className={`flex-1 group bg-[#FF0099] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white font-black italic hover:shadow-[12px_12px_0px_0px_#FFF] active:shadow-none transition-all flex items-center justify-between ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                style={{ padding: 'min(2vmin, 1rem) min(4vmin, 2rem)' }}
                                            >
                                                <span style={{ fontSize: 'clamp(1.5rem, 5vmin, 3rem)' }}>{isAnalyzing ? '...' : 'START'}</span>
                                                <Play style={{ width: 'clamp(2rem, 6vmin, 4rem)', height: 'clamp(2rem, 6vmin, 4rem)' }} className="fill-current" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 text-white/40 font-mono text-xs">
                                FLEX BY @ZUMINN // POWERED BY REACT + THREE.JS
                            </div>
                        </div>
                    )}

                    {/* End Game Screens */}
                    {(gameStatus === GameStatus.GAME_OVER || gameStatus === GameStatus.VICTORY) && (
                        <div className={`${boxStyle} p-0 max-w-lg w-full max-h-[90dvh] overflow-hidden flex flex-col pointer-events-auto`}>
                            <div className={`p-8 text-center border-b-4 border-black ${gameStatus === GameStatus.VICTORY ? 'bg-[#FAFF00] text-black' : 'bg-red-500 text-white'}`}>
                                <h2 className="text-7xl font-black italic uppercase tracking-tighter">
                                    {gameStatus === GameStatus.VICTORY ? "CLEARED!" : "WIPEOUT"}
                                </h2>
                            </div>

                            <div className="p-6 bg-white flex flex-col gap-4 text-black overflow-y-auto flex-1">
                                <div className="flex justify-between items-end border-b-2 border-gray-200 pb-2">
                                    <span className="font-bold text-gray-400 uppercase">Final Score</span>
                                    <span className="text-5xl font-black">{score.toLocaleString()}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-100 p-4 border-2 border-black">
                                        <span className="block text-xs font-bold text-gray-500 uppercase">Max Combo</span>
                                        <span className="text-2xl font-black text-[#00F0FF]">{combo}</span>
                                    </div>
                                    <div className="bg-gray-100 p-4 border-2 border-black">
                                        <span className="block text-xs font-bold text-gray-500 uppercase">Rank</span>
                                        <span className="text-2xl font-black text-[#FF0099]">
                                            {score > 50000 ? 'S' : score > 20000 ? 'A' : score > 5000 ? 'B' : 'C'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={returnToMenu}
                                    className={`${btnStyle} bg-[#FF0099] text-white w-full py-4 text-xl flex items-center justify-center gap-2 hover:bg-[#CC0077] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}
                                >
                                    <RefreshCw /> PLAY AGAIN
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
