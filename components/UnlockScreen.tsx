
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, X, Key, AlertCircle, Phone, Check, Shield, Star, ChevronRight, Hash, ScanLine } from 'lucide-react';
import { EventConfig, GuestEntry } from '../types';

interface UnlockScreenProps {
  onUnlock: (guest: GuestEntry) => void;
  config: EventConfig;
  onAdminEnter: () => void;
  guestList: GuestEntry[];
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_COOLDOWN = 5 * 60 * 1000;

// ─── Titanium Dust Particle System ───────────────────────────────────
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
      size: number; opacity: number; life: number; maxLife: number;
    }

    const particles: Particle[] = [];
    // Fewer, slower, subtler particles (dust motes)
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.1, // Very slow horizontal drift
        vy: (Math.random() - 0.5) * 0.1 - 0.05, // Slight upward drift
        size: Math.random() * 1.5,
        opacity: Math.random() * 0.3 + 0.05,
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
        // White/Silver dust
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * fade})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-[1] pointer-events-none mix-blend-screen" />;
};

// ─── Geometric Hold Button ──────────────────────────────────────────
const GeometricHoldBtn: React.FC<{ progress: number; isHolding: boolean; isActive: boolean }> = ({ progress, isHolding, isActive }) => {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Container rotated 45deg for diamond shape */}
      <div className={`relative w-16 h-16 transition-all duration-500 ${isHolding ? 'scale-90' : 'scale-100'} ${isActive ? 'rotate-45' : ''}`}>

        {/* Background Border */}
        <div className={`absolute inset-0 border transition-all duration-500 ${isActive ? 'border-amber-500/30' : 'border-zinc-700'}`} />

        {/* Progress Fill (Clip Path based) */}
        <div className="absolute inset-0 bg-amber-500 transition-all duration-75 ease-linear"
          style={{
            clipPath: `inset(${100 - progress}% 0 0 0)`,
            opacity: isActive ? 1 : 0
          }}
        />

        {/* Inner Content */}
        <div className={`absolute inset-[2px] bg-black flex items-center justify-center transition-all duration-300 ${isActive ? '-rotate-45' : ''}`}>
          {isActive ? (
            <Key className={`w-5 h-5 transition-colors ${progress > 50 ? 'text-amber-500' : 'text-zinc-500'}`} />
          ) : (
            <Lock className="w-5 h-5 text-zinc-600" />
          )}
        </div>
      </div>

      {/* Decorative corners for tech feel when active */}
      {isActive && (
        <div className="absolute inset-[-4px] pointer-events-none animate-pulse-slow">
          <div className="absolute top-0 left-1/2 -ml-[1px] w-[2px] h-2 bg-amber-500/50" />
          <div className="absolute bottom-0 left-1/2 -ml-[1px] w-[2px] h-2 bg-amber-500/50" />
          <div className="absolute left-0 top-1/2 -mt-[1px] h-[2px] w-2 bg-amber-500/50" />
          <div className="absolute right-0 top-1/2 -mt-[1px] h-[2px] w-2 bg-amber-500/50" />
        </div>
      )}
    </div>
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
  const [scanAnim, setScanAnim] = useState(false);

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

  // Hold-to-enter logic
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
          // Faster fill for snappier feel
          return prev + 2.5;
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
      setVerificationState('found');
      setMatchedGuest(found);
      setScanAnim(true); // Trigger scan animation
      setTimeout(() => setScanAnim(false), 2000);
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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden font-sans">

      {/* ── Background: Black Titanium ────────────────────────── */}
      <div className="absolute inset-0 z-0 bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-zinc-950 opacity-80" />
        {/* Brushed Metal Texture Overlay (CSS Pattern) */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, #fff 1px, #fff 2px)' }} />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
      </div>

      <ParticleField />

      {/* ── Scan Line Animation (On Verify) ──────────────────── */}
      {scanAnim && (
        <div className="absolute inset-0 z-[10] pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-scan-down" />
          <div className="absolute inset-0 bg-amber-500/5 animate-flash" />
        </div>
      )}

      {/* ── Admin Login (Hidden Trigger) ─────────────────────── */}
      <button onClick={() => setShowAdminLogin(true)} className="fixed top-0 right-0 w-16 h-16 opacity-0 z-[100]" />

      {/* ── Admin Login Modal ────────────────────────────────── */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
          <div className="w-full max-w-xs p-8 bg-zinc-900 border border-zinc-800 relative shadow-2xl">
            <button onClick={() => { setShowAdminLogin(false); setUserInput(''); }} className="absolute top-4 right-4 text-zinc-600 hover:text-white"><X className="w-5 h-5" /></button>
            <div className="mb-8 text-center">
              <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center mx-auto mb-4 border border-zinc-700"><Lock className="w-5 h-5 text-amber-500" /></div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Admin Access</h3>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input type="text" placeholder="USER" value={userInput} onChange={(e) => setUserInput(e.target.value)} className="w-full bg-black border border-zinc-800 p-3 text-xs font-mono text-white outline-none focus:border-amber-500 transition-colors" />
              <input type="password" placeholder="PASS" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full bg-black border border-zinc-800 p-3 text-xs font-mono text-white outline-none focus:border-amber-500 transition-colors" />
              {adminError && <div className="text-red-500 text-[10px] font-mono text-center">ACCESS DENIED</div>}
              <button type="submit" className="w-full bg-zinc-100 text-black font-bold py-3 text-xs tracking-widest hover:bg-amber-400 transition-colors">LOGIN</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Main Content Container ───────────────────────────── */}
      <div className="z-20 w-full max-w-md px-6 flex flex-col items-center justify-between h-[85vh]">

        {/* ── Top: Minimal Branding ──────────────────────────── */}
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-amber-500/50 to-transparent" />
          <div className="border border-amber-500/30 px-6 py-2 bg-black/50 backdrop-blur-sm">
            <span className="font-serif italic text-amber-500 text-xl tracking-wider">M · 28</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold">Access Control</p>
        </div>

        {/* ── Center: Dynamic Content ────────────────────────── */}
        <div className="w-full flex-1 flex flex-col items-center justify-center space-y-12">

          {/* Status / Date Display */}
          <div className="text-center space-y-2">
            {!isGuestVerified ? (
              <>
                <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 scale-y-110">
                  FEB<span className="text-zinc-600">.</span>28
                </h1>
                <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-amber-500/80">
                  <span>21:00 HRS</span>
                  <span>•</span>
                  <span>LIMA, PE</span>
                </div>
              </>
            ) : (
              <div className="animate-fade-in space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-500/70 mb-2">Identify Confirmed</p>
                  <h2 className="text-3xl font-serif italic text-white">{matchedGuest?.name}</h2>
                </div>
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className={`w-full max-w-[280px] transition-all duration-300 ${shakeInput ? 'translate-x-[-5px]' : ''}`}>

            {!isGuestVerified ? (
              <div className="relative group">
                <div className="absolute left-0 bottom-4 text-zinc-600 group-focus-within:text-amber-500 transition-colors">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setPhoneInput(val);
                    if (verificationState === 'not_found' || verificationState === 'used') setVerificationState('idle');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneVerify()}
                  placeholder="CODE / PHONE"
                  className="w-full bg-transparent border-b border-zinc-800 py-4 pl-8 pr-12 text-center font-mono text-lg tracking-[0.3em] text-white outline-none focus:border-amber-500/50 transition-all placeholder-zinc-800"
                />
                <button
                  onClick={handlePhoneVerify}
                  disabled={!isPhoneValid}
                  className={`absolute right-0 bottom-3 p-2 rounded-full transition-all ${isPhoneValid ? 'text-amber-500 hover:text-white hover:bg-amber-500/20' : 'text-zinc-800 cursor-not-allowed'}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Error State */}
                {(verificationState === 'not_found' || verificationState === 'used') && (
                  <div className="absolute -bottom-8 left-0 right-0 text-center animate-fade-in">
                    <span className="text-[9px] font-mono text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1">
                      {verificationState === 'used' ? 'Access Already Used' : 'Invalid Credentials'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <button onClick={handleResetVerification} className="text-[9px] font-mono text-zinc-600 hover:text-zinc-400 underline decoration-zinc-800 underline-offset-4 uppercase tracking-widest transition-colors">
                  Reset Identity
                </button>
              </div>
            )}

          </div>

        </div>

        {/* ── Bottom: Trigger ────────────────────────────────── */}
        <div className="mb-8 flex flex-col items-center gap-6">
          <div
            className="cursor-pointer touch-none select-none active:scale-95 transition-transform"
            onMouseDown={() => setIsHolding(true)} onMouseUp={() => setIsHolding(false)} onMouseLeave={() => setIsHolding(false)}
            onTouchStart={() => setIsHolding(true)} onTouchEnd={() => setIsHolding(false)}
          >
            <GeometricHoldBtn progress={progress} isHolding={isHolding} isActive={isGuestVerified} />
          </div>

          <p className={`text-[9px] uppercase tracking-[0.3em] font-bold transition-all duration-500 ${isHolding ? 'text-amber-500' : isGuestVerified ? 'text-zinc-400 animate-pulse' : 'text-zinc-700'}`}>
            {isHolding ? 'Authenticating...' : isGuestVerified ? 'Hold to Unlock' : 'Enter Credentials'}
          </p>
        </div>

      </div>

      {/* ── Global Styles ────────────────────────────────────── */}
      <style>{`
        @keyframes scan-down {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-down { animation: scan-down 1.5s ease-in-out infinite; }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }

        @keyframes flash {
            0%, 100% { opacity: 0; }
            10%, 30% { opacity: 0.1; }
            20%, 40% { opacity: 0; }
        }
        .animate-flash { animation: flash 0.5s ease-out; }
        
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
