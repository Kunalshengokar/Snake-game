import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Terminal, AlertTriangle, Disc } from 'lucide-react';

// --- Constants & Types ---
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 70;

const TRACKS = [
  { id: 1, title: "ERR_01: NEON_DREAMS", artist: "SYS.AI", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "ERR_02: DIGITAL_HORIZON", artist: "SYS.AI", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "ERR_03: QUANTUM_CORE", artist: "SYS.AI", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];

type GameState = 'START' | 'PLAYING' | 'GAME_OVER';

export default function App() {
  // --- React State ---
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Music State
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // --- Refs for Game Loop (Mutable State) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const snakeRef = useRef([...INITIAL_SNAKE]);
  const dirRef = useRef({ ...INITIAL_DIRECTION });
  const nextDirRef = useRef({ ...INITIAL_DIRECTION });
  const foodRef = useRef({ x: 5, y: 5 });
  const particlesRef = useRef<any[]>([]);
  const shakeRef = useRef(0);

  // --- Helpers ---
  const spawnFood = () => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = snakeRef.current.some(s => s.x === newFood.x && s.y === newFood.y);
      if (!onSnake) break;
    }
    foodRef.current = newFood;
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  // --- Game Controls ---
  const startGame = () => {
    snakeRef.current = [...INITIAL_SNAKE];
    dirRef.current = { ...INITIAL_DIRECTION };
    nextDirRef.current = { ...INITIAL_DIRECTION };
    particlesRef.current = [];
    shakeRef.current = 0;
    setScore(0);
    spawnFood();
    setGameState('PLAYING');
    
    if (!isPlaying && audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  // --- Game Loop ---
  const updateGame = () => {
    dirRef.current = nextDirRef.current;
    const head = snakeRef.current[0];
    const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

    // Collision detection
    const hitWall = newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE;
    const hitSelf = snakeRef.current.some(s => s.x === newHead.x && s.y === newHead.y);

    if (hitWall || hitSelf) {
      setGameState('GAME_OVER');
      shakeRef.current = 25; // Massive shake on death
      spawnParticles(head.x, head.y, '#FF00FF');
      return;
    }

    snakeRef.current.unshift(newHead);

    // Eat food
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      setScore(s => {
        const newScore = s + 10;
        if (newScore > highScore) setHighScore(newScore);
        return newScore;
      });
      shakeRef.current = 8; // Small shake on eat
      spawnParticles(foodRef.current.x, foodRef.current.y, '#00FFFF');
      spawnFood();
    } else {
      snakeRef.current.pop();
    }
  };

  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // Apply Screen Shake
    if (shakeRef.current > 0) {
      const dx = (Math.random() - 0.5) * shakeRef.current;
      const dy = (Math.random() - 0.5) * shakeRef.current;
      ctx.translate(dx, dy);
      shakeRef.current *= 0.85;
      if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // Grid Lines (Subtle)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }

    // Draw Food (Magenta)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FF00FF';
    ctx.fillStyle = '#FF00FF';
    // Glitchy food drawing
    const foodOffset = Math.random() > 0.9 ? (Math.random() - 0.5) * 4 : 0;
    ctx.fillRect(foodRef.current.x * CELL_SIZE + 2 + foodOffset, foodRef.current.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    // Draw Particles
    ctx.shadowBlur = 10;
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // Draw Snake (Cyan)
    ctx.shadowColor = '#00FFFF';
    snakeRef.current.forEach((segment, index) => {
      const intensity = Math.max(0.1, 1 - (index / snakeRef.current.length));
      ctx.globalAlpha = intensity;
      ctx.shadowBlur = index === 0 ? 20 : 10 * intensity;
      ctx.fillStyle = '#00FFFF';
      
      // Slight glitch effect on snake body randomly
      const glitchX = Math.random() > 0.95 ? (Math.random() - 0.5) * 2 : 0;
      ctx.fillRect(segment.x * CELL_SIZE + 1 + glitchX, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });

    ctx.restore();
  };

  const loop = useCallback((time: number) => {
    if (gameState === 'PLAYING') {
      const deltaTime = time - lastUpdateTimeRef.current;
      if (deltaTime > GAME_SPEED) {
        updateGame();
        lastUpdateTimeRef.current = time;
      }
    }
    drawGame();
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (gameState !== 'PLAYING') return;

      const currentDir = dirRef.current;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (currentDir.y !== 1) nextDirRef.current = { x: 0, y: -1 }; break;
        case 'ArrowDown': case 's': case 'S':
          if (currentDir.y !== -1) nextDirRef.current = { x: 0, y: 1 }; break;
        case 'ArrowLeft': case 'a': case 'A':
          if (currentDir.x !== 1) nextDirRef.current = { x: -1, y: 0 }; break;
        case 'ArrowRight': case 'd': case 'D':
          if (currentDir.x !== -1) nextDirRef.current = { x: 1, y: 0 }; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // --- Music Logic ---
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(console.error);
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, [currentTrack, isPlaying]);

  return (
    <div className="min-h-screen bg-black text-[#00FFFF] font-mono flex flex-col items-center justify-center p-4 screen-tear">
      <div className="scanlines" />
      <div className="static-noise" />

      <audio ref={audioRef} src={TRACKS[currentTrack].url} onEnded={nextTrack} />

      {/* Header */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[#FF00FF]">
          <Terminal className="w-5 h-5" />
          <span className="text-xl tracking-widest glitch-text" data-text="SYS.OP: SNAKE_PROTOCOL">SYS.OP: SNAKE_PROTOCOL</span>
        </div>
        <div className="text-sm opacity-70">STATUS: {gameState === 'PLAYING' ? 'ACTIVE' : 'STANDBY'}</div>
      </div>

      {/* Main Game Container */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[500px]">
        
        {/* Stats */}
        <div className="w-full flex justify-between mb-2 border-b-2 border-[#00FFFF] pb-2">
          <div>
            <span className="text-[#FF00FF]">BIOMASS: </span>
            <span className="text-2xl">{score.toString().padStart(4, '0')}</span>
          </div>
          <div>
            <span className="text-[#FF00FF]">MAX_YIELD: </span>
            <span className="text-2xl">{highScore.toString().padStart(4, '0')}</span>
          </div>
        </div>

        {/* Canvas Wrapper */}
        <div className="relative w-full aspect-square border-4 border-[#00FFFF] bg-[#000000] shadow-[0_0_30px_rgba(0,255,255,0.2)] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-full block"
          />

          {/* Overlays */}
          {gameState !== 'PLAYING' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
              {gameState === 'GAME_OVER' && (
                <div className="mb-8 flex flex-col items-center">
                  <AlertTriangle className="w-12 h-12 text-[#FF00FF] mb-2 animate-pulse" />
                  <h2 className="text-3xl text-[#FF00FF] glitch-text" data-text="NEURAL LINK SEVERED">NEURAL LINK SEVERED</h2>
                  <p className="mt-2 text-[#00FFFF]">FATAL COLLISION DETECTED</p>
                </div>
              )}
              
              <button
                onClick={startGame}
                className="group relative px-8 py-4 bg-black border-2 border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-colors duration-0 uppercase tracking-widest text-xl cursor-pointer"
              >
                <span className="relative z-10">{gameState === 'GAME_OVER' ? 'REBOOT_SEQUENCE' : 'INIT_SEQUENCE'}</span>
                <div className="absolute inset-0 bg-[#FF00FF] opacity-0 group-hover:opacity-20 transition-opacity" />
              </button>
              
              {gameState === 'START' && (
                <p className="mt-8 text-sm opacity-70 border border-[#00FFFF]/30 p-2">
                  INPUT: [W,A,S,D] OR [ARROWS]
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audio Subsystem */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 border-2 border-[#FF00FF] bg-black p-4 z-20 shadow-[4px_4px_0px_#00FFFF]">
        <div className="flex items-center justify-between mb-4 border-b border-[#FF00FF]/30 pb-2">
          <div className="flex items-center gap-2">
            <Disc className={`w-5 h-5 text-[#00FFFF] ${isPlaying ? 'animate-spin' : ''}`} />
            <span className="text-sm tracking-widest">AUDIO.SUBSYS</span>
          </div>
          <span className="text-xs text-[#FF00FF]">{isPlaying ? '[ACTIVE]' : '[PAUSED]'}</span>
        </div>

        <div className="mb-4">
          <div className="text-xs opacity-70 mb-1">CURRENT_FILE:</div>
          <div className="text-[#00FFFF] truncate glitch-text text-lg" data-text={TRACKS[currentTrack].title}>
            {TRACKS[currentTrack].title}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={prevTrack} className="p-2 border border-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-colors cursor-pointer">
              <SkipBack className="w-4 h-4" />
            </button>
            <button onClick={togglePlay} className="p-2 border border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black transition-colors cursor-pointer">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button onClick={nextTrack} className="p-2 border border-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-colors cursor-pointer">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
          
          <button onClick={toggleMute} className="p-2 border border-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-colors cursor-pointer">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
