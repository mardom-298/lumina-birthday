
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, X, Key, AlertCircle, Phone, Check, Shield, ChevronRight, Hash } from 'lucide-react';
import { EventConfig, GuestEntry } from '../types';

interface UnlockScreenProps {
  onUnlock: (guest: GuestEntry) => void;
  config: EventConfig;
  onAdminEnter: () => void;
  guestList: GuestEntry[];
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_COOLDOWN = 5 * 60 * 1000;

// ─── Minimal Particle Effect ─────────────────────────────────────────
const TitaniumDust: React.FC = () => {
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
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: -Math.random() * 0.05,
        size: Math.random() * 1.2,
        opacity: Math.random() * 0.2 + 0.05,
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
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
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

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40" />;
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
          return prev + 3;
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
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-hidden font-sans">

      {/* Background with texture */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-black to-zinc-950/80" />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px)' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.9)_100%)]" />
      </div>

      <TitaniumDust />

      {/* Admin trigger */}
      <button onClick={() => setShowAdminLogin(true)} className="fixed top-0 right-0 w-20 h-20 opacity-0" />

      {/* Admin Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-6">
          <div className="w-full max-w-xs p-8 bg-zinc-950 border border-zinc-800">
            <button onClick={() => setShowAdminLogin(false)} className="absolute top-4 right-4 text-zinc-600 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="mb-6 text-center">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">ADMIN</h3>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input type="text" placeholder="USER" value={userInput} onChange={(e) => setUserInput(e.target.value)}
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-amber-500" />
              <input type="password" placeholder="PASS" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-amber-500" />
              {adminError && <p className="text-red-500 text-[9px] font-mono text-center">ACCESS DENIED</p>}
              <button type="submit" className="w-full bg-white text-black font-bold py-2 text-[10px] tracking-widest hover:bg-amber-400">ENTER</button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between py-16 px-6">

        {/* Top Branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-amber-500/60 to-transparent" />
          <div className="border border-amber-500/40 px-8 py-2.5 bg-black/60">
            <span className="font-serif italic text-amber-500 text-2xl tracking-wide">M · 28</span>
          </div>
          <p className="text-[9px] uppercase tracking-[0.4em] text-zinc-600 font-bold">ACCESS CONTROL</p>
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center gap-16 w-full max-w-md">

          {/* Date/Status Display */}
          {!isGuestVerified ? (
            <div className="text-center space-y-3">
              <h1 className="font-black tracking-[-0.05em] leading-none" style={{
                fontSize: 'clamp(4rem, 15vw, 7rem)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontStretch: 'ultra-condensed',
                background: 'linear-gradient(to bottom, #ffffff 0%, #e4e4e7 50%, #71717a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                transform: 'scaleY(1.1)'
              }}>
                FEB<span className="text-zinc-700">.</span>28
              </h1>
              <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-amber-500/70 tracking-wider">
                <span>21:00 HRS</span>
                <span className="text-zinc-700">•</span>
                <span>LIMA, PE</span>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-14 h-14 border border-emerald-500/40 bg-emerald-500/5">
                <Check className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.3em] text-emerald-500/60 mb-2">IDENTITY CONFIRMED</p>
                <h2 className="text-3xl font-serif italic text-white">{matchedGuest?.name}</h2>
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="w-full max-w-[320px]">
            {!isGuestVerified ? (
              <div className="relative">
                <div className="flex items-center border-b border-zinc-800 pb-3 group focus-within:border-amber-500/50 transition-colors">
                  <Hash className="w-4 h-4 text-zinc-700 group-focus-within:text-amber-500 mr-3 transition-colors" />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setPhoneInput(val);
                      if (verificationState !== 'idle') setVerificationState('idle');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneVerify()}
                    placeholder="CODE / PHONE"
                    className="flex-1 bg-transparent text-white font-mono text-sm tracking-[0.3em] outline-none placeholder-zinc-800"
                  />
                  <button
                    onClick={handlePhoneVerify}
                    disabled={!isPhoneValid}
                    className={`ml-3 transition-all ${isPhoneValid ? 'text-amber-500 hover:text-white' : 'text-zinc-800 cursor-not-allowed'}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {verificationState === 'not_found' && (
                  <p className="absolute -bottom-7 left-0 text-[9px] font-mono text-red-500 uppercase tracking-widest">
                    INVALID CREDENTIALS
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <button onClick={handleResetVerification}
                  className="text-[9px] font-mono text-zinc-700 hover:text-zinc-500 underline decoration-zinc-800 underline-offset-4 uppercase tracking-[0.2em]">
                  RESET IDENTITY
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Trigger */}
        <div className="flex flex-col items-center gap-6">
          <div
            className="relative w-20 h-20 cursor-pointer select-none active:scale-95 transition-transform"
            onMouseDown={() => isGuestVerified && setIsHolding(true)}
            onMouseUp={() => setIsHolding(false)}
            onMouseLeave={() => setIsHolding(false)}
            onTouchStart={() => isGuestVerified && setIsHolding(true)}
            onTouchEnd={() => setIsHolding(false)}
          >
            {/* Diamond Container */}
            <div className={`absolute inset-0 rotate-45 border transition-all duration-300 ${isGuestVerified ? 'border-amber-500/40' : 'border-zinc-800'
              } ${isHolding ? 'scale-90' : 'scale-100'}`}>

              {/* Progress Fill */}
              <div className="absolute inset-0 bg-amber-500 transition-all duration-75"
                style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }} />

              {/* Inner Black Square */}
              <div className="absolute inset-[2px] bg-black flex items-center justify-center -rotate-45">
                {isGuestVerified ? (
                  <Key className={`w-6 h-6 transition-colors ${progress > 50 ? 'text-amber-500' : 'text-zinc-600'}`} />
                ) : (
                  <Lock className="w-6 h-6 text-zinc-800" />
                )}
              </div>
            </div>
          </div>

          <p className={`text-[9px] uppercase tracking-[0.3em] font-bold transition-colors ${isHolding ? 'text-amber-500' : isGuestVerified ? 'text-zinc-500 animate-pulse' : 'text-zinc-800'
            }`}>
            {isHolding ? 'AUTHENTICATING...' : isGuestVerified ? 'HOLD TO UNLOCK' : 'ENTER CREDENTIALS'}
          </p>
        </div>

      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>
    </div>
  );
};
