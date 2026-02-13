
import React from 'react';
import { MapPin, Music, MessageCircle, LogOut } from 'lucide-react';
import { AppState, VenueOption } from '../types';

interface DesktopNavProps {
  appState: AppState;
  winningVenue: VenueOption | null;
  onLogout: () => void;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({ appState, winningVenue, onLogout }) => {
  if (appState === AppState.LOCKED || appState === AppState.ADMIN) return null;

  const handleOpenMap = () => {
    // Disparar evento para navegar al mapa interno
    window.dispatchEvent(new CustomEvent('switch-to-map'));
  };

  const handleOpenPlaylist = () => {
    // Disparar evento para navegar a la playlist interna
    window.dispatchEvent(new CustomEvent('switch-to-music'));
  };

  const handleContactOrganizer = () => {
     window.open(`https://wa.me/51994126635`, '_blank');
  };

  return (
    <div className="hidden md:flex fixed top-8 right-8 z-50 items-center gap-4 animate-fade-in">
        <div className="flex bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-1.5 shadow-2xl">
            <button 
                onClick={handleOpenPlaylist} 
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white"
            >
                <Music className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Música</span>
            </button>
            <div className="w-[1px] h-6 bg-white/10 my-auto"></div>
            <button 
                onClick={handleOpenMap} 
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white"
            >
                <MapPin className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Ubi</span>
            </button>
            <div className="w-[1px] h-6 bg-white/10 my-auto"></div>
            <button 
                onClick={handleContactOrganizer} 
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white"
            >
                <MessageCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
            </button>
        </div>

        {appState === AppState.SUCCESS && (
             <button 
                onClick={onLogout}
                className="p-3.5 bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-white/10 rounded-full transition-all text-gray-400"
                title="Cerrar Sesión"
             >
                <LogOut className="w-4 h-4" />
             </button>
        )}
    </div>
  );
};
