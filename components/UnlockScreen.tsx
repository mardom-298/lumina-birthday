
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, X, Key, AlertCircle, Phone, Check, Shield } from 'lucide-react';
import { EventConfig, GuestEntry } from '../types';

interface UnlockScreenProps {
  onUnlock: (guest: GuestEntry) => void;
  config: EventConfig;
  onAdminEnter: () => void;
  guestList: GuestEntry[];
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_COOLDOWN = 5 * 60 * 1000;

// Floating particles
const FloatingParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }> = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -Math.random() * 0.1 - 0.05,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${p.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-30" />;
};

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlock, config, onAdminEnter, guestList }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [verificationState, setVerificationState] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [matchedGuest, setMatchedGuest] = useState<GuestEntry | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const isRateLimited = lockedUntil !== null && Date.now() < lockedUntil;
  const isPhoneValid = /^9\d{8}$/.test(phoneInput.trim());
  const isGuestVerified = verificationState === 'found' && matchedGuest !== null;

  // Rate limit timer
  useEffect(() => {
    if (!isRateLimited) return;
    const interval = setInterval(() => {
      if (Date.now() >= (lockedUntil || 0)) {
        setLockedUntil(null);
        setFailedAttempts(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil, isRateLimited]);

  // Hold-to-enter
  useEffect(() => {
    let interval: number;
    if (isHolding && !showAdminLogin && isGuestVerified) {
      interval = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => onUnlock(matchedGuest!), 200);
            return 100;
          }
          return prev + 2.5;
        });
      }, 16);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHolding, onUnlock, showAdminLogin, isGuestVerified, matchedGuest]);

  const handlePhoneVerify = useCallback(() => {
    if (!isPhoneValid || isRateLimited) return;
    const cleanPhone = phoneInput.trim();
    const found = guestList.find(g => g.phone === cleanPhone);

    if (!found) {
      setVerificationState('not_found');
      setMatchedGuest(null);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= RATE_LIMIT_MAX) setLockedUntil(Date.now() + RATE_LIMIT_COOLDOWN);
    } else {
      setVerificationState('found');
      setMatchedGuest(found);
    }
  }, [phoneInput, isPhoneValid, isRateLimited, guestList, failedAttempts]);

  const handleResetVerification = () => {
    setVerificationState('idle');
    setMatchedGuest(null);
    setPhoneInput('');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput === config.adminUser && passwordInput === config.adminPassword) onAdminEnter();
    else { setAdminError(true); setTimeout(() => setAdminError(false), 3000); }
  };

  const getRemainingLockTime = () => {
    if (!lockedUntil) return '';
    const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
    return `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-zinc-900 via-black to-black overflow-hidden font-sans">

      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.05),transparent_40%)]" />
      </div>

      <FloatingParticles />

      {/* Admin trigger */}
      <button onClick={() => setShowAdminLogin(true)} className="fixed bottom-0 left-0 w-20 h-20 opacity-0 z-[120] cursor-pointer" aria-label="Admin access" />

      {/* Admin Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
          <div className="w-full max-w-xs p-8 bg-zinc-950/90 border border-amber-500/20 rounded-3xl shadow-[0_0_60px_rgba(251,191,36,0.15)]">
            <button onClick={() => setShowAdminLogin(false)} className="absolute top-6 right-6 text-zinc-600 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-amber-500">Panel Admin</h3>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input type="text" placeholder="Usuario" value={userInput} onChange={(e) => setUserInput(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-white outline-none transition-all" />
              <input type="password" placeholder="Contraseña" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-white outline-none transition-all" />
              {adminError && <p className="text-red-500 text-xs text-center font-bold">Credenciales incorrectas</p>}
              <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-3 rounded-2xl text-sm uppercase tracking-widest hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-all active:scale-95">Ingresar</button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between py-12 px-6">

        {/* Top Branding */}
        <div className="flex flex-col items-center gap-8 pt-4">
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-500/50" />
            <span className="font-serif italic text-amber-500 text-xl tracking-wider">M · 28</span>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center gap-8 w-full max-w-sm -mt-8">

          {/* Date Display */}
          {!isGuestVerified ? (
            <div className="text-center space-y-4 animate-fade-in">
              <h1 className="font-black tracking-tighter leading-none text-white text-[5rem] sm:text-[6rem]"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontStretch: 'ultra-condensed',
                  textShadow: '0 0 60px rgba(251,191,36,0.2)'
                }}>
                FEB 28
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-bold">Celebrando mis 28</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/5 border border-white/10 px-4 py-2 rounded-full">9:00 PM</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full">VIP</span>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-5 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-pulse-glow">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-500/70 mb-2">Invitado Verificado</p>
                <h2 className="text-3xl font-serif italic text-white">{matchedGuest?.name}</h2>
              </div>
            </div>
          )}

          {/* Input Section */}
          {!isGuestVerified && (
            <div className="w-full space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setPhoneInput(val);
                    if (verificationState !== 'idle') setVerificationState('idle');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneVerify()}
                  placeholder="9XX XXX XXX"
                  className="w-full bg-white/[0.03] border border-white/10 focus:border-amber-500/50 rounded-2xl pl-12 pr-4 py-4 text-white font-mono tracking-widest outline-none transition-all shadow-lg"
                />
              </div>

              {verificationState === 'not_found' && (
                <p className="text-xs text-red-400 text-center animate-fade-in flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Número no registrado
                </p>
              )}

              <button
                onClick={handlePhoneVerify}
                disabled={!isPhoneValid}
                className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-[0.2em] transition-all duration-300 ${isPhoneValid
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_10px_40px_rgba(251,191,36,0.3)] hover:shadow-[0_15px_60px_rgba(251,191,36,0.5)] hover:scale-[1.02] active:scale-95'
                  : 'bg-white/5 border border-white/10 text-gray-600 cursor-not-allowed'
                  }`}
              >
                Verificar Invitación
              </button>
            </div>
          )}

          {isGuestVerified && (
            <button onClick={handleResetVerification}
              className="text-xs text-zinc-600 hover:text-zinc-400 underline decoration-zinc-800 underline-offset-4 uppercase tracking-wider transition-colors">
              Cambiar número
            </button>
          )}

        </div>

        {/* Bottom Trigger - Hexagonal Button */}
        <div className="flex flex-col items-center gap-5 pb-4">
          <div
            className={`relative w-28 h-28 cursor-pointer select-none transition-all duration-300 ${isGuestVerified ? 'scale-100 opacity-100' : 'scale-90 opacity-30 pointer-events-none'}`}
            onMouseDown={() => isGuestVerified && setIsHolding(true)}
            onMouseUp={() => setIsHolding(false)}
            onMouseLeave={() => setIsHolding(false)}
            onTouchStart={() => isGuestVerified && setIsHolding(true)}
            onTouchEnd={() => setIsHolding(false)}
            style={{
              filter: isGuestVerified ? 'drop-shadow(0 0 20px rgba(251,191,36,0.3))' : 'none',
              transform: isHolding ? 'scale(0.92)' : 'scale(1)'
            }}
          >
            {/* Hexagon SVG */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={progress > 0 ? "0.8" : "0.3"} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={progress > 0 ? "0.6" : "0.2"} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Hexagon background */}
              <polygon
                points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                fill="rgba(0,0,0,0.8)"
                stroke="url(#hexGradient)"
                strokeWidth="2"
                filter={isGuestVerified ? "url(#glow)" : "none"}
                className={isGuestVerified ? "animate-pulse-slow" : ""}
              />

              {/* Progress fill */}
              {isGuestVerified && (
                <polygon
                  points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                  fill="url(#hexGradient)"
                  style={{
                    clipPath: `inset(${100 - progress}% 0 0 0)`,
                    transition: 'clip-path 0.05s linear'
                  }}
                />
              )}
            </svg>

            {/* Lock/Key icon centered */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isGuestVerified ? (
                <Key className={`w-10 h-10 transition-all duration-300 ${progress > 50 ? 'text-black' : 'text-amber-500'}`} />
              ) : (
                <Lock className="w-10 h-10 text-gray-700" />
              )}
            </div>
          </div>

          <p className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-300 ${isHolding ? 'text-amber-500 scale-105' : isGuestVerified ? 'text-gray-400 animate-pulse' : 'text-gray-700'
            }`}>
            {isHolding ? 'Autenticando...' : isGuestVerified ? 'Mantén Presionado' : 'Ingresa tu código'}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-4">
            <div className="w-1 h-1 rounded-full bg-amber-500/50" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-gray-700 font-bold">Marino · 28</span>
            <div className="w-1 h-1 rounded-full bg-amber-500/50" />
          </div>
        </div>

      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(16,185,129,0.3); }
          50% { box-shadow: 0 0 60px rgba(16,185,129,0.5); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
