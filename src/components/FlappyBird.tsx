import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Award } from 'lucide-react';

// Game Constants
const GRAVITY = 0.25;
const JUMP_STRENGTH = -5.5;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_RATE = 100; // frames
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const BIRD_SIZE = 34;
const BIRD_X = 50;

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('skywing_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Game Refs for performance (avoiding re-renders during loop)
  const birdY = useRef(250);
  const birdVelocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frameCount = useRef(0);
  const animationFrameId = useRef<number>(null);

  const resetGame = useCallback(() => {
    birdY.current = 250;
    birdVelocity.current = 0;
    pipes.current = [];
    frameCount.current = 0;
    setScore(0);
  }, []);

  const startGame = () => {
    resetGame();
    setGameState('PLAYING');
  };

  const jump = useCallback(() => {
    if (gameState === 'PLAYING') {
      birdVelocity.current = JUMP_STRENGTH;
    } else if (gameState === 'START' || gameState === 'GAME_OVER') {
      startGame();
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const update = () => {
    if (gameState !== 'PLAYING') return;

    // Bird physics
    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    // Pipe generation
    frameCount.current++;
    if (frameCount.current % PIPE_SPAWN_RATE === 0) {
      const minPipeHeight = 50;
      const maxPipeHeight = 400 - PIPE_GAP - minPipeHeight;
      const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
      pipes.current.push({ x: 400, topHeight, passed: false });
    }

    // Pipe movement and collision
    pipes.current.forEach((pipe, index) => {
      pipe.x -= PIPE_SPEED;

      // Collision detection
      const birdRect = {
        left: BIRD_X + 5,
        right: BIRD_X + BIRD_SIZE - 5,
        top: birdY.current + 5,
        bottom: birdY.current + BIRD_SIZE - 5,
      };

      const topPipeRect = {
        left: pipe.x,
        right: pipe.x + PIPE_WIDTH,
        top: 0,
        bottom: pipe.topHeight,
      };

      const bottomPipeRect = {
        left: pipe.x,
        right: pipe.x + PIPE_WIDTH,
        top: pipe.topHeight + PIPE_GAP,
        bottom: 500,
      };

      // Check collisions
      if (
        (birdRect.right > topPipeRect.left &&
          birdRect.left < topPipeRect.right &&
          birdRect.top < topPipeRect.bottom) ||
        (birdRect.right > bottomPipeRect.left &&
          birdRect.left < bottomPipeRect.right &&
          birdRect.bottom > bottomPipeRect.top) ||
        birdY.current < 0 ||
        birdY.current + BIRD_SIZE > 500
      ) {
        setGameState('GAME_OVER');
      }

      // Scoring
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
        pipe.passed = true;
        setScore((s) => s + 1);
      }
    });

    // Remove off-screen pipes
    pipes.current = pipes.current.filter((pipe) => pipe.x + PIPE_WIDTH > -50);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.clearRect(0, 0, 400, 500);

    // Background (Sky)
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, 400, 500);

    // Draw Pipes
    pipes.current.forEach((pipe) => {
      // Top Pipe
      ctx.fillStyle = '#73bf2e';
      ctx.strokeStyle = '#538123';
      ctx.lineWidth = 3;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      
      // Top Pipe Cap
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);
      ctx.strokeRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);

      // Bottom Pipe
      ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, 500 - (pipe.topHeight + PIPE_GAP));
      ctx.strokeRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, 500 - (pipe.topHeight + PIPE_GAP));
      
      // Bottom Pipe Cap
      ctx.fillRect(pipe.x - 5, pipe.topHeight + PIPE_GAP, PIPE_WIDTH + 10, 20);
      ctx.strokeRect(pipe.x - 5, pipe.topHeight + PIPE_GAP, PIPE_WIDTH + 10, 20);
    });

    // Draw Bird
    ctx.save();
    ctx.translate(BIRD_X + BIRD_SIZE / 2, birdY.current + BIRD_SIZE / 2);
    const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, birdVelocity.current * 0.1));
    ctx.rotate(rotation);
    
    // Bird Body
    ctx.fillStyle = '#f7d016';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE, 8);
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f75b16';
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.lineTo(22, 6);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-8, 4, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Ground
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, 480, 400, 20);
    ctx.fillStyle = '#9ce659';
    ctx.fillRect(0, 480, 400, 5);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      update();
      draw(ctx);
      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'GAME_OVER') {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('skywing_highscore', score.toString());
      }
    }
  }, [gameState, score, highScore]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 p-4 font-sans overflow-hidden">
      <div className="relative group">
        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={500}
          className="rounded-2xl shadow-2xl border-4 border-zinc-800 cursor-pointer"
          onClick={jump}
        />

        {/* Score Overlay */}
        <div className="absolute top-8 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/20 backdrop-blur-sm px-6 py-2 rounded-full border border-white/10">
            <span className="text-5xl font-black text-white drop-shadow-lg tracking-tighter">
              {score}
            </span>
          </div>
        </div>

        {/* UI Overlays */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl"
            >
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mb-8"
              >
                <div className="w-20 h-20 bg-yellow-400 rounded-2xl border-4 border-black flex items-center justify-center shadow-xl">
                  <div className="w-4 h-4 bg-white rounded-full border-2 border-black absolute top-4 right-4" />
                  <div className="w-8 h-4 bg-orange-500 rounded-full border-2 border-black absolute bottom-4 right-2" />
                </div>
              </motion.div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase italic">Sky Wing</h1>
              <p className="text-white/70 mb-8 font-medium">Press Space or Click to Fly</p>
              <button
                onClick={startGame}
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <Play size={24} fill="currentColor" />
                START GAME
              </button>
              
              <div className="mt-8 flex items-center gap-2 text-yellow-400">
                <Trophy size={20} />
                <span className="font-bold">BEST: {highScore}</span>
              </div>
            </motion.div>
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-2xl"
            >
              <div className="bg-zinc-800 p-8 rounded-3xl border border-white/10 shadow-2xl text-center max-w-[300px] w-full">
                <h2 className="text-3xl font-black text-white mb-6 uppercase italic tracking-tight">Game Over</h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl">
                    <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Score</span>
                    <span className="text-3xl font-black text-white">{score}</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <Award className="text-yellow-500" size={18} />
                      <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Best</span>
                    </div>
                    <span className="text-3xl font-black text-yellow-500">{highScore}</span>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} />
                  RETRY
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructions Footer */}
      <div className="mt-8 flex gap-8 text-zinc-500 font-medium text-sm">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700 text-zinc-300">Space</kbd>
          <span>to Jump</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-zinc-700" />
          <span>Click to Jump</span>
        </div>
      </div>
    </div>
  );
}
