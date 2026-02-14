
import React from 'react';
import { MapPin, Music, Share2, Ticket, MessageCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { AppState, EventConfig, VenueOption, RsvpData } from '../types';

interface GuestDockProps {
  appState: AppState;
  config: EventConfig;
  winningVenue: VenueOption | null;
  rsvpData: RsvpData | null;
  isMusicPlaying?: boolean;
}

export const GuestDock: React.FC<GuestDockProps> = ({ appState, config, winningVenue, rsvpData, isMusicPlaying = false }) => {
  if (appState === AppState.LOCKED || appState === AppState.ADMIN || appState === AppState.RSVP) {
    return null;
  }

  const handleUbiClick = () => {
    window.dispatchEvent(new CustomEvent('switch-to-map'));
  };

  const handleVibeClick = () => {
    // Navigate to music tab
    window.dispatchEvent(new CustomEvent('switch-to-music'));
    // Toggle audio
    window.dispatchEvent(new CustomEvent('bg-music-toggle'));
  };

  const handleWhatsAppShare = () => {
    if (!rsvpData) return;
    const message = `¡Ya tengo mis entradas para el cumple! 🎫 ¡Nos vemos allá! 🥳`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const scrollToTicket = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleContactOrganizer = () => { window.open(`https://wa.me/51994126635`, '_blank'); };

  const DockItem = ({ icon: Icon, label, onClick, highlight = false }: { icon: any, label: string, onClick: () => void, highlight?: boolean }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1 min-w-[65px] group active:scale-95 transition-all pt-2 z-20">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${highlight ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-gray-400 group-hover:text-white'}`}>
        <Icon className={`w-5 h-5 ${highlight ? 'fill-current' : ''}`} />
      </div>
      <span className={`text-[9px] font-black tracking-[0.1em] uppercase ${highlight ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{label}</span>
    </button>
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[90] animate-fade-in-up flex justify-center">
      <div className="h-[5.8rem] w-full max-w-md relative">
        <div className="absolute inset-x-0 bottom-0 h-[5.5rem] bg-[#080808]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        </div>

        <div className="relative h-full flex items-start justify-around px-2 pt-1">
          {appState === AppState.INVITATION && (
            <>
              <DockItem icon={MapPin} label="LUGAR" onClick={handleUbiClick} />
              <div className="relative -top-6 z-30 flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full p-[2px] transition-all duration-500 ${isMusicPlaying ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_30px_rgba(251,191,36,0.6)] scale-110' : 'bg-zinc-800 shadow-xl opacity-60'}`}>
                  <button onClick={handleVibeClick} className="w-full h-full rounded-full bg-[#121212] flex flex-col items-center justify-center text-white active:scale-95 transition-transform overflow-hidden relative">
                    {isMusicPlaying ? (
                      <>
                        <PauseCircle className="w-6 h-6 text-amber-400 z-10" />
                        <div className="absolute inset-0 flex items-center justify-center gap-[2px]">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="w-1 h-8 bg-amber-500/20 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}></div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <PlayCircle className="w-6 h-6 text-gray-500" />
                    )}
                  </button>
                </div>
                <span className={`block text-center text-[10px] font-black tracking-widest uppercase mt-2 transition-colors ${isMusicPlaying ? 'text-amber-500' : 'text-gray-500'}`}>MÚSICA</span>
              </div>
              <DockItem icon={MessageCircle} label="AYUDA" onClick={handleContactOrganizer} />
            </>
          )}

          {appState === AppState.SUCCESS && (
            <>
              <DockItem icon={MapPin} label="LUGAR" onClick={handleUbiClick} />
              <div className="relative -top-6 z-30 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-400 to-blue-500 p-[2px] shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                  <button onClick={scrollToTicket} className="w-full h-full rounded-full bg-[#0a0a0a] flex flex-col items-center justify-center text-white active:scale-95 transition-transform"><Ticket className="w-7 h-7 text-emerald-400 fill-current" /></button>
                </div>
                <span className="block text-center text-[10px] font-black tracking-widest uppercase text-emerald-400 mt-2">PASE</span>
              </div>
              <DockItem icon={Share2} label="ENVIAR" onClick={handleWhatsAppShare} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
