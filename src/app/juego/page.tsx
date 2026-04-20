'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FabrickLogo from '@/components/FabrickLogo';
import { ArrowLeft, RotateCcw, Trophy, Zap } from 'lucide-react';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// Tetromino shapes
const TETROMINOES = [
  { shape: [[1,1,1,1]], color: '#FACC15', name: 'Viga' },              // I - beam
  { shape: [[1,1],[1,1]], color: '#FCD34D', name: 'Bloque' },          // O - block
  { shape: [[0,1,0],[1,1,1]], color: '#F59E0B', name: 'Soporte' },     // T - support
  { shape: [[1,1,0],[0,1,1]], color: '#D97706', name: 'Panel' },       // S - panel
  { shape: [[0,1,1],[1,1,0]], color: '#B45309', name: 'Tablón' },      // Z - plank
  { shape: [[1,0],[1,0],[1,1]], color: '#92400E', name: 'Pilar' },     // L - pillar
  { shape: [[0,1],[0,1],[1,1]], color: '#78350F', name: 'Contrapeso' },// J - counterweight
];

type Cell = string | null;
type Board = Cell[][];

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

interface Piece {
  shape: number[][];
  color: string;
  name: string;
  x: number;
  y: number;
}

function randomPiece(): Piece {
  const t = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return { ...t, x: Math.floor(COLS / 2) - Math.floor(t.shape[0].length / 2), y: 0 };
}

function rotate(shape: number[][]): number[][] {
  return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

function isValid(board: Board, piece: Piece, dx = 0, dy = 0, newShape?: number[][]): boolean {
  const shape = newShape || piece.shape;
  return shape.every((row, r) =>
    row.every((cell, c) => {
      if (!cell) return true;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      return nx >= 0 && nx < COLS && ny < ROWS && (ny < 0 || !board[ny][nx]);
    })
  );
}

function mergePiece(board: Board, piece: Piece): Board {
  const next = board.map(r => [...r]);
  piece.shape.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell && piece.y + r >= 0) next[piece.y + r][piece.x + c] = piece.color;
    })
  );
  return next;
}

function clearLines(board: Board): { board: Board; lines: number } {
  const next = board.filter(row => row.some(cell => !cell));
  const lines = ROWS - next.length;
  const empty = Array.from({ length: lines }, () => Array(COLS).fill(null));
  return { board: [...empty, ...next], lines };
}

export default function JuegoPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [highScore, setHighScore] = useState(0);
  
  const boardRef = useRef<Board>(createBoard());
  const pieceRef = useRef<Piece>(randomPiece());
  const nextPieceRef = useRef<Piece>(randomPiece());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const dropCounterRef = useRef(0);
  const gameOverRef = useRef(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    const hs = parseInt(localStorage.getItem('fabrick-tetris-hs') || '0');
    setHighScore(hs);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(250,204,21,0.06)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }

    // Board
    boardRef.current.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          ctx.fillStyle = cell;
          ctx.shadowColor = cell;
          ctx.shadowBlur = 8;
          ctx.fillRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          ctx.shadowBlur = 0;
          // Highlight
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, 4);
        }
      });
    });

    // Current piece
    const p = pieceRef.current;
    p.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.fillRect((p.x + c) * BLOCK_SIZE + 1, (p.y + r) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect((p.x + c) * BLOCK_SIZE + 1, (p.y + r) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, 4);
        }
      });
    });

    // Ghost piece
    let ghostY = p.y;
    while (isValid(boardRef.current, p, 0, ghostY - p.y + 1)) ghostY++;
    if (ghostY !== p.y) {
      p.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            ctx.fillStyle = 'rgba(250,204,21,0.12)';
            ctx.fillRect((p.x + c) * BLOCK_SIZE + 1, (ghostY + r) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          }
        });
      });
    }
  }, []);

  const drop = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return;
    const p = pieceRef.current;
    if (isValid(boardRef.current, p, 0, 1)) {
      pieceRef.current = { ...p, y: p.y + 1 };
    } else {
      const merged = mergePiece(boardRef.current, p);
      const { board: cleared, lines: newLines } = clearLines(merged);
      boardRef.current = cleared;
      
      if (newLines > 0) {
        const pts = [0, 100, 300, 500, 800][newLines] * levelRef.current;
        scoreRef.current += pts;
        linesRef.current += newLines;
        levelRef.current = Math.floor(linesRef.current / 10) + 1;
        setScore(scoreRef.current);
        setLines(linesRef.current);
        setLevel(levelRef.current);
      }

      pieceRef.current = nextPieceRef.current;
      nextPieceRef.current = randomPiece();

      if (!isValid(boardRef.current, pieceRef.current)) {
        gameOverRef.current = true;
        setGameOver(true);
        const hs = parseInt(localStorage.getItem('fabrick-tetris-hs') || '0');
        if (scoreRef.current > hs) {
          localStorage.setItem('fabrick-tetris-hs', String(scoreRef.current));
          setHighScore(scoreRef.current);
        }
      }
    }
  }, []);

  const gameLoop = useCallback((time: number) => {
    if (gameOverRef.current) return;
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;
    
    if (!pausedRef.current) {
      const dropInterval = Math.max(100, 1000 - (levelRef.current - 1) * 100);
      dropCounterRef.current += delta;
      if (dropCounterRef.current >= dropInterval) {
        dropCounterRef.current = 0;
        drop();
      }
      draw();
    }
    
    frameRef.current = requestAnimationFrame(gameLoop);
  }, [draw, drop]);

  const startGame = useCallback(() => {
    boardRef.current = createBoard();
    pieceRef.current = randomPiece();
    nextPieceRef.current = randomPiece();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    gameOverRef.current = false;
    pausedRef.current = false;
    dropCounterRef.current = 0;
    lastTimeRef.current = 0;
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setStarted(true);
    setPaused(false);
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!started || gameOverRef.current) return;
      if (e.key === 'p' || e.key === 'Escape') {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        return;
      }
      if (pausedRef.current) return;
      const p = pieceRef.current;
      switch (e.key) {
        case 'ArrowLeft': if (isValid(boardRef.current, p, -1)) pieceRef.current = { ...p, x: p.x - 1 }; break;
        case 'ArrowRight': if (isValid(boardRef.current, p, 1)) pieceRef.current = { ...p, x: p.x + 1 }; break;
        case 'ArrowDown': drop(); dropCounterRef.current = 0; break;
        case 'ArrowUp': case 'z': {
          const rotated = rotate(p.shape);
          if (isValid(boardRef.current, p, 0, 0, rotated)) pieceRef.current = { ...p, shape: rotated };
          break;
        }
        case ' ': {
          let ny = p.y;
          while (isValid(boardRef.current, p, 0, ny - p.y + 1)) ny++;
          pieceRef.current = { ...p, y: ny };
          drop();
          break;
        }
      }
      draw();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started, drop, draw]);

  // Touch controls
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current || !started || gameOverRef.current || pausedRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const p = pieceRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && isValid(boardRef.current, p, 1)) pieceRef.current = { ...p, x: p.x + 1 };
      else if (dx < -20 && isValid(boardRef.current, p, -1)) pieceRef.current = { ...p, x: p.x - 1 };
    } else {
      if (dy > 20) { drop(); dropCounterRef.current = 0; }
      else if (dy < -20) {
        const rotated = rotate(p.shape);
        if (isValid(boardRef.current, p, 0, 0, rotated)) pieceRef.current = { ...p, shape: rotated };
      }
    }
    draw();
    touchRef.current = null;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start py-6 px-4 overflow-hidden">
      <style>{`
        @keyframes glow-score { 0%,100% { text-shadow: 0 0 10px #facc15; } 50% { text-shadow: 0 0 30px #facc15, 0 0 60px #facc15; } }
        .score-glow { animation: glow-score 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-yellow-400 transition-colors text-xs uppercase tracking-widest">
          <ArrowLeft size={16} /> Volver
        </button>
        <FabrickLogo />
        <div className="text-right">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Récord</p>
          <p className="text-yellow-400 font-black text-sm">{highScore.toLocaleString()}</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 px-4 py-3 rounded-2xl bg-zinc-950 border border-white/5">
        <div className="text-center">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Puntos</p>
          <p className="text-yellow-400 font-black text-xl score-glow">{score.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Nivel</p>
          <p className="text-white font-black text-xl">{level}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Líneas</p>
          <p className="text-white font-black text-xl">{lines}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Pieza</p>
          <p className="text-yellow-400 font-black text-xs">{pieceRef.current?.name || '—'}</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={COLS * BLOCK_SIZE}
          height={ROWS * BLOCK_SIZE}
          className="rounded-2xl border border-yellow-400/10 shadow-[0_0_60px_rgba(250,204,21,0.08)]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        {/* Overlay - not started */}
        {!started && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/90 backdrop-blur-sm">
            <Zap className="text-yellow-400 w-12 h-12 mb-4 animate-bounce" />
            <h2 className="font-black uppercase tracking-[0.2em] text-white text-xl mb-2">Constructor</h2>
            <p className="text-zinc-500 text-xs text-center mb-6 max-w-40">Apila los materiales de construcción para completar líneas</p>
            <button onClick={startGame} className="px-8 py-4 bg-yellow-400 text-black font-black uppercase tracking-widest text-sm rounded-full hover:bg-yellow-300 transition-colors shadow-[0_0_30px_rgba(250,204,21,0.3)]">
              Construir
            </button>
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/95 backdrop-blur-sm">
            <Trophy className="text-yellow-400 w-12 h-12 mb-3" />
            <h2 className="font-black uppercase tracking-[0.2em] text-white text-xl mb-1">Obra Terminada</h2>
            <p className="text-yellow-400 font-black text-3xl mb-1 score-glow">{score.toLocaleString()}</p>
            <p className="text-zinc-500 text-xs mb-6">Nivel {level} · {lines} líneas</p>
            <button onClick={startGame} className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-black uppercase tracking-widest text-sm rounded-full hover:bg-yellow-300 transition-colors">
              <RotateCcw size={16} /> Volver a construir
            </button>
          </div>
        )}

        {/* Paused overlay */}
        {paused && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/80 backdrop-blur-sm">
            <p className="font-black uppercase tracking-[0.4em] text-yellow-400 text-lg">Pausado</p>
            <p className="text-zinc-500 text-xs mt-2">Presiona P para continuar</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-[300px] mt-6 grid grid-cols-3 gap-2">
        <button className="col-start-2 p-4 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center active:scale-95" onClick={() => { if(started && !gameOver) { const p = pieceRef.current; const rotated = rotate(p.shape); if(isValid(boardRef.current, p, 0, 0, rotated)) { pieceRef.current = {...p, shape: rotated}; draw(); } } }}>
          <span className="text-yellow-400 font-black text-xs">↻ Girar</span>
        </button>
        <button className="p-4 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center active:scale-95" onClick={() => { if(started && !gameOver && !pausedRef.current) { const p = pieceRef.current; if(isValid(boardRef.current, p, -1)) { pieceRef.current = {...p, x: p.x-1}; draw(); } } }}>
          <span className="text-white font-black text-lg">←</span>
        </button>
        <button className="p-4 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center active:scale-95" onClick={() => { if(started && !gameOver && !pausedRef.current) { drop(); dropCounterRef.current = 0; draw(); } }}>
          <span className="text-white font-black text-lg">↓</span>
        </button>
        <button className="p-4 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center active:scale-95" onClick={() => { if(started && !gameOver && !pausedRef.current) { const p = pieceRef.current; if(isValid(boardRef.current, p, 1)) { pieceRef.current = {...p, x: p.x+1}; draw(); } } }}>
          <span className="text-white font-black text-lg">→</span>
        </button>
        <button className="col-start-2 p-3 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center active:scale-95 text-xs text-zinc-500 uppercase tracking-widest" onClick={() => { if(started && !gameOver) { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); } }}>
          {paused ? '▶' : '⏸'}
        </button>
      </div>

      <p className="mt-4 text-[9px] text-zinc-700 uppercase tracking-widest text-center">
        ← → mover · ↑ girar · ↓ bajar · espacio = caída rápida · P = pausa
      </p>
    </div>
  );
}
