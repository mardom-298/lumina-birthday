
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, X, Key, AlertCircle, Phone, Check, Shield, Sparkles, Star, PartyPopper } from 'lucide-react';
import { EventConfig, GuestEntry } from '../types';

interface UnlockScreenProps {
  onUnlock: (guest: GuestEntry) => void;
  config: EventConfig;
  onAdminEnter: () => void;
  guestList: GuestEntry[];
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_COOLDOWN = 5 * 60 * 1000;

// ─── Floating Particle System ────────────────────────────────────────
const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; hue: number; life: number; maxLife: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.15,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        hue: Math.random() > 0.5 ? 38 : 270,
        life: Math.random() * 400,
        maxLife: 400 + Math.random() * 300,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life > p.maxLife) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 10;
          p.life = 0;
        }
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;

        const fade = p.life < 60 ? p.life / 60 : p.life > p.maxLife - 60 ? (p.maxLife - p.life) / 60 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity * fade})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${p.opacity * fade * 0.3})`);
        grad.addColorStop(1, `hsla(${p.hue}, 80%, 70%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-[1] pointer-events-none" />;
};

// ─── Animated Ring for Hold-to-Enter ─────────────────────────────────
const HoldRing: React.FC<{ progress: number; isHolding: boolean; isActive: boolean }> = ({ progress, isHolding, isActive }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10">
      {/* Background ring */}
      <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" fill="transparent" />
      {/* Animated dashed ring */}
      {isActive && (
        <circle cx="60" cy="60" r={radius + 6} stroke="rgba(251,191,36,0.08)" strokeWidth="0.5" fill="transparent"
          strokeDasharray="4 8" className="animate-spin-slow" />
      )}
      {/* Progress ring */}
      <circle
        cx="60" cy="60" r={radius}
        stroke="url(#ringGradient)" strokeWidth="3" fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (circumference * progress) / 100}
        strokeLinecap="round"
        className=""
        style={{ opacity: progress > 0 ? 1 : 0, filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))' }}
      />
      <defs>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlock, config, onAdminEnter, guestList }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [adminError, setAdminError] = useState(false);

  const [phoneInput, setPhoneInput] = useState('');
  const [verificationState, setVerificationState] = useState<'idle' | 'found' | 'used' | 'not_found'>('idle');
  const [matchedGuest, setMatchedGuest] = useState<GuestEntry | null>(null);
  const [shakeInput, setShakeInput] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

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
            setTimeout(() => onUnlock(matchedGuest!), 300);
            return 100;
          }
          return prev + 1.8;
        });
      }, 16);
    } else if (!isGuestVerified && isHolding) {
      setIsHolding(false);
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 600);
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
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 600);
    } else {
      // Allow re-entry even if used
      setVerificationState('found');
      setMatchedGuest(found);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [phoneInput, isPhoneValid, isRateLimited, guestList, failedAttempts]);

  const handleResetVerification = () => {
    setVerificationState('idle');
    setMatchedGuest(null);
    setPhoneInput('');
    // Optional: could show a toast here, but clearing is immediate feedback
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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Layered Background ──────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {/* Deep space gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-black to-black"></div>
        {/* Aurora blobs */}
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] rounded-full bg-purple-900/15 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[70%] rounded-full bg-amber-900/10 blur-[130px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-900/8 blur-[100px] animate-float"></div>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
      </div>

      {/* Particle System */}
      <ParticleField />

      {/* Confetti burst on verification */}
      {showConfetti && (
        <div className="absolute inset-0 z-[50] pointer-events-none overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="absolute animate-confetti" style={{
              left: `${Math.random() * 100}%`,
              top: '-5%',
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              background: ['#fbbf24', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f97316'][Math.floor(Math.random() * 6)],
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDuration: `${1.5 + Math.random() * 2}s`,
              animationDelay: `${Math.random() * 0.5}s`,
            }} />
          ))}
        </div>
      )}

      {/* Admin access (hidden button) */}
      <button onClick={() => setShowAdminLogin(true)} className="fixed bottom-0 left-0 w-16 h-16 opacity-0 z-[100] cursor-default">.</button>

      {/* ── Admin Login Modal ──────────────────────────────── */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6">
          <div className="w-full max-w-xs p-10 bg-zinc-950/90 border border-white/10 rounded-[3rem] shadow-2xl relative backdrop-blur-xl">
            <button onClick={() => { setShowAdminLogin(false); setUserInput(''); setPasswordInput(''); setAdminError(false); }} className="absolute top-7 right-7 text-gray-500 hover:text-white p-2 transition-colors"><X className="w-5 h-5" /></button>
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20"><Lock className="w-7 h-7 text-amber-500" /></div>
              <h3 className="text-xl font-serif italic text-white">Centro de Seguridad</h3>
              <p className="text-[9px] text-gray-500 mt-2 uppercase tracking-[0.3em] font-black">Solo Personal Autorizado</p>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input type="text" placeholder="USUARIO" value={userInput} onChange={(e) => setUserInput(e.target.value)} className={`w-full bg-black/60 border rounded-2xl py-5 px-6 text-[10px] font-black tracking-widest text-white outline-none transition-all ${adminError ? 'border-red-500/50' : 'border-white/10 focus:border-amber-500'}`} />
              <input type="password" placeholder="CONTRASEÑA" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={`w-full bg-black/60 border rounded-2xl py-5 px-6 text-[10px] font-black tracking-widest text-white outline-none transition-all ${adminError ? 'border-red-500/50' : 'border-white/10 focus:border-amber-500'}`} />
              {adminError && <div className="text-red-500 text-[9px] font-black uppercase tracking-widest text-center">Credenciales Incorrectas</div>}
              <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black py-5 rounded-2xl text-[11px] tracking-[0.2em] hover:shadow-[0_0_30px_rgba(251,191,36,0.3)] transition-all active:scale-95">INGRESAR</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Top Section: Branding ───────────────────────────── */}
      {/* ── Top Section: Branding (Absolute) ────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center pt-8 sm:pt-10 px-4 w-full pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="h-[1px] w-6 sm:w-12 bg-gradient-to-r from-transparent to-amber-500/70"></div>
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] sm:tracking-[0.5em] text-amber-400">MARINO'S GOLDEN 28</span>
          <Sparkles className="w-3 h-3 text-amber-400" />
          <div className="h-[1px] w-6 sm:w-12 bg-gradient-to-l from-transparent to-amber-500/70"></div>
        </div>
      </div>

      {/* ── Center Section: Date + Phone ────────────────────── */}
      {/* ── Center Content Group: Date + Input + Button ────── */}
      <div className="z-20 flex flex-col items-center justify-center w-full max-w-3xl px-5 space-y-6 sm:space-y-8 min-h-0 py-10">

        {/* Date Display */}
        <div className="space-y-1.5 sm:space-y-3 select-none shrink-0">
          <h1 className="text-[3.5rem] sm:text-[6rem] md:text-[8rem] font-serif italic tracking-tighter text-white leading-none"
            style={{ textShadow: '0 0 80px rgba(251,191,36,0.15), 0 0 160px rgba(147,51,234,0.08)' }}>
            {config.dateDisplay}
          </h1>
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <div className="h-[1px] flex-1 max-w-[40px] sm:max-w-[60px] bg-gradient-to-r from-transparent to-white/30"></div>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] sm:tracking-[0.5em] text-gray-300 font-black whitespace-nowrap">
              CELEBRANDO MIS 28
            </p>
            <div className="h-[1px] flex-1 max-w-[40px] sm:max-w-[60px] bg-gradient-to-l from-transparent to-white/30"></div>
          </div>
          {/* Event teaser tags */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap pt-1">
            <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-gray-300 bg-white/[0.06] border border-white/[0.1] px-2.5 py-1 sm:px-4 sm:py-2 rounded-full backdrop-blur-sm">{config.time}</span>
            <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-gray-300 bg-white/[0.06] border border-white/[0.1] px-2.5 py-1 sm:px-4 sm:py-2 rounded-full backdrop-blur-sm">Cumpleaños 2026</span>
            <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-amber-400 bg-amber-500/[0.08] border border-amber-500/[0.15] px-2.5 py-1 sm:px-4 sm:py-2 rounded-full backdrop-blur-sm">★ VIP</span>
          </div>
        </div>

        {/* ── Phone Verification Card ──────────────────────── */}
        <div className={`w-full max-w-[380px] transition-all duration-500 ${shakeInput ? 'animate-shake' : ''}`}>

          {isRateLimited ? (
            /* Rate Limited State */
            <div className="relative overflow-hidden rounded-[2.5rem] border border-red-500/15 p-8 sm:p-10 text-center space-y-4 backdrop-blur-xl"
              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(0,0,0,0.4) 100%)' }}>
              <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none"></div>
              <Shield className="w-10 h-10 text-red-500/70 mx-auto relative z-10" />
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-red-400/80 relative z-10">Acceso Temporal Bloqueado</p>
              <p className="text-xs text-gray-500 relative z-10">Demasiados intentos. Espera un momento.</p>
              <p className="text-3xl sm:text-4xl font-serif italic text-red-400 relative z-10">{getRemainingLockTime()}</p>
            </div>

          ) : verificationState === 'idle' || verificationState === 'not_found' ? (
            /* Phone Input State */
            <div className="space-y-4 sm:space-y-5">
              <div className={`relative group rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden transition-all duration-500
                ${verificationState === 'not_found' ? 'shadow-[0_0_40px_rgba(239,68,68,0.1)]' : isPhoneValid ? 'shadow-[0_0_40px_rgba(251,191,36,0.08)]' : ''}`}>
                {/* Animated border gradient */}
                <div className={`absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] p-[1px] transition-opacity duration-500 ${isPhoneValid ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-r from-amber-500/30 via-purple-500/20 to-amber-500/30 animate-gradient-x"></div>
                </div>

                <div className={`relative flex items-center backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] h-14 sm:h-16 transition-all duration-300 border
                  ${verificationState === 'not_found' ? 'border-red-500/30 bg-red-500/[0.03]' : isPhoneValid ? 'border-amber-500/30 bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                  <div className="flex items-center justify-center pl-5 sm:pl-7 pr-1 sm:pr-2">
                    <Phone className={`w-4 h-4 sm:w-[18px] sm:h-[18px] transition-colors duration-300 ${verificationState === 'not_found' ? 'text-red-500/60' : isPhoneValid ? 'text-amber-500' : 'text-gray-700'}`} />
                  </div>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setPhoneInput(val);
                      if (verificationState === 'not_found') setVerificationState('idle');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneVerify(); }}
                    placeholder="9XX XXX XXX"
                    style={{ caretColor: '#fbbf24' }}
                    className="bg-transparent border-none outline-none text-white text-sm sm:text-[15px] font-bold tracking-[0.3em] sm:tracking-[0.4em] w-full placeholder-gray-500 pr-5 sm:pr-7"
                    maxLength={9}
                  />
                </div>
              </div>

              {verificationState === 'not_found' && (
                <div className="flex items-center justify-center gap-2 px-4 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500/80" />
                  <p className="text-[10px] sm:text-[11px] text-red-400/80 font-bold">Número no registrado</p>
                </div>
              )}

              <button
                onClick={handlePhoneVerify}
                disabled={!isPhoneValid}
                className={`w-full py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.3em] transition-all duration-500 active:scale-[0.97]
                  ${isPhoneValid
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-[0_10px_40px_rgba(251,191,36,0.2)] hover:shadow-[0_15px_50px_rgba(251,191,36,0.3)] hover:scale-[1.01]'
                    : 'bg-white/[0.06] border border-white/[0.1] text-gray-400 cursor-not-allowed'}`}
              >
                Verificar Invitación
              </button>

              {failedAttempts > 0 && failedAttempts < RATE_LIMIT_MAX && (
                <p className="text-[9px] sm:text-[10px] text-orange-500/70 text-center animate-fade-in font-bold">
                  {RATE_LIMIT_MAX - failedAttempts} intento{RATE_LIMIT_MAX - failedAttempts !== 1 ? 's' : ''} restante{RATE_LIMIT_MAX - failedAttempts !== 1 ? 's' : ''}
                </p>
              )}
            </div>

          ) : verificationState === 'used' ? (
            /* Already Used State */
            <div className="relative overflow-hidden rounded-[2.5rem] border border-orange-500/15 p-8 sm:p-10 text-center space-y-5 backdrop-blur-xl"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.04) 0%, rgba(0,0,0,0.4) 100%)' }}>
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none"></div>
              <div className="relative z-10 space-y-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto border border-orange-500/15">
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-serif italic text-white mb-2">Acceso Ya Utilizado</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed max-w-[260px] mx-auto">
                    Este número ya fue usado para ingresar. Contacta al organizador si es un error.
                  </p>
                </div>
                <button onClick={handleResetVerification} className="w-full py-4 sm:py-5 bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] hover:bg-white/[0.07] transition-all active:scale-[0.97]">
                  Intentar Otro Número
                </button>
              </div>
            </div>

          ) : verificationState === 'found' && matchedGuest ? (
            /* Guest Found — Verified State (compact) */
            <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/15 p-5 sm:p-6 text-center backdrop-blur-xl"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(0,0,0,0.4) 100%)' }}>
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <Check className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400/70 mb-1">¡Invitado Verificado!</p>
                  <h3 className="text-xl sm:text-2xl font-serif italic text-white">{matchedGuest.name}</h3>
                </div>
                <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-[0.15em] leading-relaxed">¿Eres tú? Mantén presionado el botón para entrar</p>
                <button onClick={handleResetVerification} className="text-[8px] sm:text-[9px] text-gray-600 hover:text-gray-400 font-bold uppercase tracking-widest transition-colors underline underline-offset-4 decoration-gray-800 hover:decoration-gray-600">
                  No soy yo (Borrar)
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Bottom Section: Hold-to-Enter ───────────────────── */}
        {/* ── Bottom Section: Hold-to-Enter (Inside Center Group) ── */}
        <div className="z-30 flex flex-col items-center w-full space-y-4 px-4 shrink-0 pt-2">
          <div
            className={`relative flex items-center justify-center touch-none select-none transition-all duration-700
            w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44
            ${!isGuestVerified ? 'opacity-[0.06] grayscale pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
            onMouseDown={() => setIsHolding(true)} onMouseUp={() => setIsHolding(false)} onMouseLeave={() => setIsHolding(false)}
            onTouchStart={() => setIsHolding(true)} onTouchEnd={() => setIsHolding(false)}
          >
            {/* Outer pulse rings */}
            {isGuestVerified && (
              <>
                <div className="absolute inset-[-15%] border border-amber-500/[0.06] rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                <div className="absolute inset-[-8%] border border-amber-500/[0.08] rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
              </>
            )}

            {/* Static outer ring */}
            <div className={`absolute inset-0 border rounded-full transition-all duration-1000 ${isHolding ? 'border-amber-500/20 scale-110' : 'border-white/[0.04] scale-100'}`}></div>

            {/* Progress Ring SVG */}
            <HoldRing progress={progress} isHolding={isHolding} isActive={isGuestVerified} />

            {/* Center button */}
            <div className={`w-[65%] h-[65%] rounded-full flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden border
            ${isHolding
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 scale-90 border-amber-500/50 shadow-[0_0_50px_rgba(251,191,36,0.4)]'
                : isGuestVerified
                  ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-white/[0.08] hover:border-amber-500/20 cursor-pointer'
                  : 'bg-zinc-950 border-white/[0.04]'}`}
            >
              <div className={`flex items-center justify-center mb-1 sm:mb-2 transition-all duration-300 ${isHolding ? 'scale-110' : ''}`}>
                {isGuestVerified
                  ? <Key className={`w-4 h-4 sm:w-6 sm:h-6 transition-colors ${isHolding ? 'text-black' : 'text-amber-500'}`} />
                  : <Lock className="w-4 h-4 sm:w-6 sm:h-6 text-gray-800" />}
              </div>
              <span className={`font-black text-[8px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.4em] transition-colors ${isHolding ? 'text-black' : isGuestVerified ? 'text-amber-400' : 'text-gray-600'}`}>
                {isHolding ? 'ABRIENDO' : isGuestVerified ? 'ENTRAR' : 'CERRADO'}
              </span>
            </div>
          </div>

          <p className={`text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.4em] uppercase font-black transition-all duration-500 ${isHolding ? 'text-amber-400' : isGuestVerified ? 'text-gray-300 animate-pulse' : 'text-gray-500'}`}>
            {isHolding ? "Autenticando..." : isGuestVerified ? "Mantén Presionado" : "Verifica Tu Número"}
          </p>

        </div>

      </div> {/* End Center Content Group */}

      {/* ── Footer: Marino · 28 (Absolute) ─────────────────── */}
      <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 z-20 flex items-center justify-center gap-2 sm:gap-3 pointer-events-none">
        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-gray-400">Marino · 28</span>
        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
      </div>

      {/* ── CSS Animations (injected via style tag) ─────────── */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.6s ease-out; }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.3); opacity: 0; }
        }
        .animate-confetti { animation: confetti 2.5s ease-in forwards; }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x { 
          background-size: 200% 200%; 
          animation: gradient-x 3s ease infinite; 
        }
      `}</style>
    </div >
  );
};
