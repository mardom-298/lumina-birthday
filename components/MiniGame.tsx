
import React, { useState, useEffect, useCallback } from 'react';
import { Target, Zap, Trophy, Timer, AlertCircle, X } from 'lucide-react';

interface MiniGameProps {
  difficulty: 'easy' | 'medium' | 'hard';
  onComplete: () => void;
  onCancel: () => void;
}

export const MiniGame: React.FC<MiniGameProps> = ({ difficulty, onComplete, onCancel }) => {
  const [score, setScore] = useState(0);
  const [targetPos, setTargetPos] = useState({ top: '50%', left: '50%' });
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

  const targetsNeeded = difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 6;
  const speed = difficulty === 'hard' ? 700 : difficulty === 'medium' ? 1000 : 1500;

  const moveTarget = useCallback(() => {
    const top = Math.random() * 80 + 10 + '%';
    const left = Math.random() * 80 + 10 + '%';
    setTargetPos({ top, left });
  }, []);

  useEffect(() => {
    let timer: number;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('lost');
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    let moveInterval: number;
    if (gameState === 'playing') {
      moveInterval = window.setInterval(moveTarget, speed);
    }
    return () => clearInterval(moveInterval);
  }, [gameState, speed, moveTarget]);

  const handleHit = () => {
    const newScore = score + 1;
    setScore(newScore);
    if (newScore >= targetsNeeded) {
      setGameState('won');
      setTimeout(onComplete, 1500);
    } else {
      moveTarget();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[3rem] p-10 text-center relative overflow-hidden">

        {/* Decoración */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-amber-500/50 rounded-full blur-sm"></div>
        <button onClick={onCancel} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all z-50">
          <X className="w-5 h-5" />
        </button>

        {gameState === 'idle' && (
          <div className="space-y-8 py-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
              <Zap className="w-10 h-10 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-3xl font-serif italic text-white">Prueba de Pulso</h2>
            <p className="text-sm text-gray-400">Para obtener tu pase {difficulty.toUpperCase()}, debes atrapar <span className="text-white font-bold">{targetsNeeded} pulsos</span> de neón antes de que se agote el tiempo.</p>
            <div className="flex gap-4">
              <button onClick={onCancel} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest">Atrás</button>
              <button onClick={() => setGameState('playing')} className="flex-1 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest">¡EMPEZAR!</button>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="h-[400px] relative flex flex-col justify-between">
            <div className="flex justify-between items-center mb-8">
              <div className="text-left">
                <p className="text-[8px] uppercase tracking-widest text-gray-500 font-black">Puntos</p>
                <p className="text-2xl font-bold font-mono">{score} / {targetsNeeded}</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full border border-red-500/20">
                <Timer className="w-4 h-4 text-red-500" />
                <span className="font-mono font-bold text-red-500">{timeLeft}s</span>
              </div>
            </div>

            <div className="flex-1 relative w-full bg-black/40 rounded-3xl border border-white/5 overflow-hidden">
              <button
                onClick={handleHit}
                style={{ top: targetPos.top, left: targetPos.left }}
                className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.6)] flex items-center justify-center transition-all active:scale-75"
              >
                <Target className="w-6 h-6 text-black animate-spin-slow" />
              </button>
            </div>
          </div>
        )}

        {gameState === 'won' && (
          <div className="space-y-6 py-10 animate-scale-in">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <Trophy className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-serif italic text-white">¡Desbloqueado!</h2>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em]">Boleto ganado con éxito</p>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="space-y-8 py-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-serif italic text-white">Se agotó el tiempo</h2>
            <p className="text-sm text-gray-400">No te rindas, ¡inténtalo de nuevo!</p>
            <button onClick={() => { setScore(0); setTimeLeft(15); setGameState('playing'); }} className="w-full py-5 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest">REINTENTAR</button>
          </div>
        )}
      </div>
    </div>
  );
};
