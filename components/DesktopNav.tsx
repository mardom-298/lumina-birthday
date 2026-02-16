
import React from 'react';
import { MapPin, Music, MessageCircle, LogOut, Ticket, Share2 } from 'lucide-react';
import { AppState, VenueOption } from '../types';

interface DesktopNavProps {
  appState: AppState;
  winningVenue: VenueOption | null;
  onLogout: () => void;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({ appState, winningVenue, onLogout }) => {
  if (appState === AppState.LOCKED || appState === AppState.ADMIN) return null;

  const handleOpenMap = () => {
    if (appState === AppState.SUCCESS && winningVenue) {
      window.open(winningVenue.googleMapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(winningVenue.name)}`, '_blank');
    } else {
      window.dispatchEvent(new CustomEvent('switch-to-map'));
    }
  };

  const handleOpenPlaylist = () => {
    window.dispatchEvent(new CustomEvent('switch-to-music'));
  };

  const handleContactOrganizer = () => {
    window.open(`https://wa.me/51994126635`, '_blank');
  };

  const handleWhatsAppShare = () => {
    const message = `¡Ya tengo mis entradas para el cumple! 🎫 ¡Nos vemos allá! 🥳`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const scrollToTicket = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="hidden md:flex fixed top-8 right-8 z-50 items-center gap-4 animate-fade-in">
      <div className="flex bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-1.5 shadow-2xl">
        {appState === AppState.SUCCESS ? (
          <>
            <button
              onClick={handleOpenMap}
              className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white group"
            >
              <MapPin className="w-4 h-4 lg:w-5 lg:h-5 group-hover:text-emerald-400 transition-colors" />
              <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest">Lugar</span>
            </button>
            <div className="w-[1px] h-6 lg:h-8 bg-white/10 my-auto"></div>
            <button
              onClick={scrollToTicket}
              className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white group"
            >
              <Ticket className="w-4 h-4 lg:w-5 lg:h-5 group-hover:text-amber-400 transition-colors" />
              <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest">Pase</span>
            </button>
            <div className="w-[1px] h-6 lg:h-8 bg-white/10 my-auto"></div>
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white group"
            >
              <Share2 className="w-4 h-4 lg:w-5 lg:h-5 group-hover:text-blue-400 transition-colors" />
              <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest">Enviar</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleOpenPlaylist}
              className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white group"
            >
              <Music className="w-4 h-4 lg:w-5 lg:h-5 group-hover:text-amber-400 transition-colors" />
              <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest">Música</span>
            </button>
            <div className="w-[1px] h-6 lg:h-8 bg-white/10 my-auto"></div>
            <button
              onClick={handleOpenMap}
              className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white group"
            >
              <MapPin className="w-4 h-4 lg:w-5 lg:h-5 group-hover:text-emerald-400 transition-colors" />
              <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest">Ubi</span>
            </button>
            <div className="w-[1px] h-6 lg:h-8 bg-white/10 my-auto"></div>
            <button
              onClick={handleContactOrganizer}
              className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white group"
            >
              <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5 group-hover:text-blue-400 transition-colors" />
              <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest">Chat</span>
            </button>
          </>
        )}
      </div>


    </div>
  );
};
