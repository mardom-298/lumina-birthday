
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, MapPin, Sparkles, Vote, Play, X, Map, Timer, Trophy, AlertCircle, Wallet, Music, Disc, ExternalLink, ChevronRight, Pause, Headphones, LogOut } from 'lucide-react';
import { EventConfig, VenueOption } from '../types';

interface DetailsCardProps {
  onContinue: () => void;
  onExit?: () => void;
  config: EventConfig;
  venues: VenueOption[];
  hasAlreadyVoted?: boolean;
  guestName?: string;
}

const PLAYLIST_TRACKS = [
  { id: '2097036720', color: '0d0df0', title: 'MIX BEELE', artist: 'DjAnglo_1', description: 'La plena, Solcito, Frente al Mar & mas' },
  { id: '2161172100', color: '607c7c', title: 'EN PRIVADO EDM', artist: 'Waic', description: 'Xavi, Manuel Turizo Remix' },
  { id: '2113555638', color: 'ff5500', title: 'YO Y TÚ REMIX', artist: 'roymarmusic', description: 'Beéle, Quevedo - ROYMAR REMIX' },
  { id: '1927905131', color: 'd650ae', title: 'MIX SOLTERA', artist: 'NESGER DJ', description: 'Shakira - NESGER DJ 2024' },
  { id: '1955520143', color: '21101c', title: '+57 REMIX', artist: 'DALE PLAY', description: 'Karol G, Feid, J Balvin & mas' },
  { id: '797495047', color: '60ace0', title: 'ADIOS AMOR ADIOS', artist: 'Caña Brava', description: 'Orquesta Caña Brava' },
  { id: '68957071', color: '60ace0', title: 'TROPI IDENTICA', artist: 'Mirko´Balcazar', description: 'Internacional Identica' },
  { id: '2211822479', color: '60ace0', title: 'LÁGRIMA POR LÁGRIMA', artist: 'Armonia 10', description: 'En Vivo' }
];

const CountdownTimer = ({ deadline }: { deadline: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    if (isNaN(end)) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!timeLeft) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Votación Finalizada</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 justify-center items-center py-4 bg-amber-500/5 rounded-3xl border border-amber-500/10 mb-6 shadow-[inset_0_0_20px_rgba(251,191,36,0.05)]">
      <div className="text-center w-12">
        <p className="text-xl font-bold text-white leading-none tabular-nums">{timeLeft.d}</p>
        <p className="text-[7px] uppercase font-black tracking-widest text-amber-500/50">Días</p>
      </div>
      <div className="h-6 w-[1px] bg-white/5"></div>
      <div className="text-center w-12">
        <p className="text-xl font-bold text-white leading-none tabular-nums">{timeLeft.h}</p>
        <p className="text-[7px] uppercase font-black tracking-widest text-amber-500/50">Horas</p>
      </div>
      <div className="h-6 w-[1px] bg-white/5"></div>
      <div className="text-center w-12">
        <p className="text-xl font-bold text-white leading-none tabular-nums">{timeLeft.m}</p>
        <p className="text-[7px] uppercase font-black tracking-widest text-amber-500/50">Min</p>
      </div>
      <div className="h-6 w-[1px] bg-white/5"></div>
      <div className="text-center w-12">
        <p className="text-xl font-bold text-amber-500 leading-none tabular-nums animate-pulse">{timeLeft.s}</p>
        <p className="text-[7px] uppercase font-black tracking-widest text-amber-500">Seg</p>
      </div>
    </div>
  );
};

const VenueDetailsModal = ({ venue, onClose }: { venue: VenueOption; onClose: () => void }) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
    <div className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden relative shadow-2xl flex flex-col max-h-[80vh]">
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none"></div>
      <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/50 backdrop-blur-md rounded-full text-white z-20 border border-white/10 active:scale-95 transition-all">
        <X className="w-5 h-5" />
      </button>

      <div className={`h-40 bg-gradient-to-br ${venue.color} relative shrink-0`}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute bottom-6 left-8">
          <h3 className="text-3xl font-serif italic text-white">{venue.name}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mt-1">{venue.vibe}</p>
        </div>
      </div>

      <div className="p-8 overflow-y-auto space-y-8">
        <div>
          <h4 className="text-[9px] uppercase tracking-widest text-gray-500 font-black mb-3">Descripción</h4>
          <p className="text-sm text-gray-300 leading-relaxed font-light whitespace-pre-wrap">{venue.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <h5 className="text-[8px] uppercase tracking-widest text-gray-500 font-black mb-1">Consumo Mínimo</h5>
            <p className="text-lg font-bold text-white">{venue.minSpend}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <h5 className="text-[8px] uppercase tracking-widest text-gray-500 font-black mb-1">Horario Cierre</h5>
            <p className="text-lg font-bold text-white">{venue.closingTime}</p>
          </div>
        </div>

        {venue.perks && venue.perks.length > 0 && (
          <div>
            <h4 className="text-[9px] uppercase tracking-widest text-gray-500 font-black mb-3">Características</h4>
            <div className="flex flex-wrap gap-2">
              {venue.perks.map((perk, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 uppercase tracking-wide">
                  {perk}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-black/20">
        <button onClick={onClose} className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all">
          Entendido
        </button>
      </div>
    </div>
  </div>
);

export const DetailsCard: React.FC<DetailsCardProps> = ({ onContinue, onExit, config, venues, hasAlreadyVoted, guestName }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'vibes' | 'music'>('info');
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(PLAYLIST_TRACKS[0].id);
  const isVotingClosed = config.votingDeadline ? new Date(config.votingDeadline).getTime() < Date.now() : false;
  const winningVenue = config.winningVenueId ? venues.find(v => v.id === config.winningVenueId) : null;

  const [previewVenue, setPreviewVenue] = useState<VenueOption | null>(winningVenue || venues[0]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [showVenueDetails, setShowVenueDetails] = useState<VenueOption | null>(null); // Modal state
  const scrollRef = useRef<HTMLDivElement>(null);

  const targetVenueForMap = winningVenue || previewVenue || venues[0];

  useEffect(() => {
    const handleSwitchToMap = () => setActiveTab('vibes');
    const handleSwitchToMusic = () => setActiveTab('music');
    const handleNowPlaying = (e: any) => setCurrentPlayingId(e.detail.trackId);
    window.addEventListener('switch-to-map', handleSwitchToMap);
    window.addEventListener('switch-to-music', handleSwitchToMusic);
    window.addEventListener('bg-music-now-playing', handleNowPlaying);
    return () => {
      window.removeEventListener('switch-to-map', handleSwitchToMap);
      window.removeEventListener('switch-to-music', handleSwitchToMusic);
      window.removeEventListener('bg-music-now-playing', handleNowPlaying);
    };
  }, []);

  const handlePlayTrack = (trackId: string) => {
    setCurrentPlayingId(trackId);
    window.dispatchEvent(new CustomEvent('bg-music-change-track', { detail: { trackId } }));
  };

  useEffect(() => {
    if (activeVideo) window.dispatchEvent(new CustomEvent('bg-music-pause'));
    else setTimeout(() => window.dispatchEvent(new CustomEvent('bg-music-play')), 100);
  }, [activeVideo]);

  // Vimeo postMessage logic...
  useEffect(() => {
    if (!activeVideo) return;
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'ended' || data.event === 'finish') setActiveVideo(null);
      } catch { }
    };
    window.addEventListener('message', handleMessage);
    const iframe = document.getElementById('video-player-iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      setTimeout(() => {
        iframe.contentWindow?.postMessage('{"method":"addEventListener","value":"ended"}', '*');
        iframe.contentWindow?.postMessage('{"method":"addEventListener","value":"finish"}', '*');
      }, 1000);
    }
    return () => window.removeEventListener('message', handleMessage);
  }, [activeVideo]);

  // Helper for video embed...
  const parseVideoInfo = (url: string, isInteractive: boolean = false) => {
    if (!url) return { type: null, embed: null };
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let id = '';
      if (url.includes('shorts/')) id = url.split('shorts/')[1]?.split(/[?#&]/)[0];
      else if (url.includes('v=')) id = url.split('v=')[1]?.split(/[&?#]/)[0];
      else if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1]?.split(/[?#&]/)[0];
      const params = isInteractive ? `?autoplay=1&mute=0&controls=1` : `?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0`;
      return { type: 'youtube', embed: `https://www.youtube.com/embed/${id}${params}` };
    }
    if (url.includes('vimeo.com')) {
      let vimeoId = '';
      let hash = '';
      if (url.includes('player.vimeo.com/video/')) return { type: 'vimeo', embed: url };
      const parts = url.split('vimeo.com/')[1]?.split(/[?#]/)[0]?.split('/');
      if (parts && parts[0]) { vimeoId = parts[0]; if (parts[1]) hash = parts[1]; }
      if (vimeoId) {
        const hashParam = hash ? `?h=${hash}` : '';
        const sep = hashParam ? '&' : '?';
        const extraParams = `${sep}title=0&byline=0&portrait=0&dnt=1`;
        const autoplay = isInteractive ? `&autoplay=1&api=1` : '&api=1';
        return { type: 'vimeo', embed: `https://player.vimeo.com/video/${vimeoId}${hashParam}${extraParams}${autoplay}` };
      }
    }
    return { type: 'iframe', embed: url };
  };

  return (
    <div className="w-full max-w-md md:max-w-7xl mx-auto animate-fade-in-up relative px-2 sm:px-0 pb-40 md:pb-0 md:h-[85vh] md:flex md:items-center">

      {showVenueDetails && <VenueDetailsModal venue={showVenueDetails} onClose={() => setShowVenueDetails(null)} />}

      {activeVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in">
          <button onClick={() => setActiveVideo(null)} className="absolute top-8 right-8 p-3 bg-black/40 backdrop-blur-md rounded-full text-white z-[120] border border-white/10 active:scale-90 transition-transform"><X className="w-6 h-6" /></button>
          <div className="relative w-full h-full sm:h-[92vh] sm:max-w-4xl sm:rounded-[3.5rem] overflow-hidden bg-zinc-900 shadow-2xl">
            <iframe id="video-player-iframe" src={parseVideoInfo(activeVideo, true).embed!} className="w-full h-full border-0" allowFullScreen allow="autoplay" />
          </div>
        </div>
      )}

      <div className="glass-card rounded-[3rem] p-1 overflow-hidden relative shadow-2xl border border-white/5 flex flex-col md:flex-row md:h-full w-full">
        {/* Left Side (Poster) */}
        <div className="h-32 sm:h-44 md:h-full md:w-4/12 bg-zinc-900 relative rounded-t-[2.8rem] md:rounded-l-[2.8rem] md:rounded-tr-none flex items-center justify-center overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-900/80"></div>
          <div className="z-10 text-center px-6 md:text-left md:p-10 md:flex md:flex-col md:justify-end md:h-full md:items-start md:w-full">
            <div className="inline-block px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[8px] font-black tracking-[0.3em] text-amber-500 mb-3 uppercase">{winningVenue ? 'Ambiente Confirmado' : 'CELEBRANDO MIS 28'}</div>
            <h2 className="text-4xl sm:text-5xl font-serif italic text-white drop-shadow-2xl">Bienvenido <span className="text-amber-400">{guestName ? guestName.split(' ')[0] : 'Invitado'}</span></h2>
          </div>
        </div>

        {/* Right Side (Tabs) */}
        <div className="p-8 sm:p-10 flex-1 flex flex-col space-y-8 relative">
          <div className="flex bg-white/5 p-1 rounded-[1.5rem] border border-white/5 shrink-0 z-20">
            <button onClick={() => setActiveTab('info')} className={`flex-1 py-4 text-[9px] font-black tracking-[0.15em] rounded-2xl transition-all duration-500 uppercase ${activeTab === 'info' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Detalles</button>
            <button onClick={() => setActiveTab('vibes')} className={`flex-1 py-4 text-[9px] font-black tracking-[0.15em] rounded-2xl transition-all duration-500 uppercase ${activeTab === 'vibes' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Ambientes</button>
            <button onClick={() => setActiveTab('music')} className={`flex-1 py-4 text-[9px] font-black tracking-[0.15em] rounded-2xl transition-all duration-500 uppercase ${activeTab === 'music' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Música</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar pr-1 z-10">
            {activeTab === 'info' && (
              <div className="space-y-10 animate-fade-in py-2">
                {!winningVenue && config.votingDeadline && <CountdownTimer deadline={config.votingDeadline} />}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex items-center gap-5 group">
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-white/5 rounded-2xl border border-white/5 group-hover:border-amber-500/30 transition-colors"><Calendar className="w-5 h-5 text-amber-500" /></div>
                    <div><h3 className="text-lg font-bold text-white leading-tight">{config.fullDate}</h3><p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Fecha</p></div>
                  </div>
                  <div className="flex items-center gap-5 group">
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-white/5 rounded-2xl border border-white/5 group-hover:border-indigo-400/30 transition-colors"><Clock className="w-5 h-5 text-indigo-400" /></div>
                    <div><h3 className="text-lg font-bold text-white leading-tight">{config.time}</h3><p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Hora</p></div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-end justify-between px-2">
                    <p className="text-[9px] uppercase tracking-[0.3em] font-black text-gray-500 flex items-center gap-2">
                      {winningVenue ? <Trophy className="w-4 h-4 text-amber-500" /> : <Map className="w-4 h-4 text-emerald-500" />}
                      {winningVenue ? 'Ambiente Confirmado' : 'Ubicación Interactiva'}
                    </p>
                  </div>
                  {!winningVenue && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                      {venues.map((v) => (
                        <button key={v.id} onClick={() => setPreviewVenue(v)} className={`shrink-0 px-4 py-2.5 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${targetVenueForMap.id === v.id ? `bg-gradient-to-r ${v.color} border-transparent text-white shadow-lg scale-105` : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}>{v.name}</button>
                      ))}
                    </div>
                  )}
                  <div className="rounded-[2.5rem] overflow-hidden bg-black border border-white/10 h-72 shadow-2xl relative group">
                    <iframe title="Maps" width="100%" height="100%" style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) grayscale(0.2)' }} loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(targetVenueForMap.mapQuery || targetVenueForMap.name + " Lima")}&output=embed&z=16`}></iframe>
                    <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-between animate-fade-in-up">
                      <div className="flex flex-col gap-0.5"><span className="text-[7px] text-gray-500 font-black uppercase tracking-widest">Ambiente</span><span className="text-xs font-bold text-white">{targetVenueForMap.name}</span></div>
                      <a href={targetVenueForMap.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"><ExternalLink className="w-4 h-4" /></a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vibes' && (
              <div className="space-y-6 animate-fade-in py-2">
                <h3 className="text-lg font-serif italic px-2">{winningVenue ? 'Ambiente Ganador' : 'Opciones Disponibles'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venues.map((venue) => {
                    const isWinner = winningVenue?.id === venue.id;
                    if (winningVenue && !isWinner) return null;
                    const canInteract = !winningVenue || isWinner;

                    return (
                      <div
                        key={venue.id}
                        onClick={() => !winningVenue && setShowVenueDetails(venue)} // Open Modal
                        className={`p-6 rounded-[2.2rem] border transition-all relative overflow-hidden group ${isWinner ? 'border-amber-500 border-4 bg-gradient-to-br from-amber-500/20 to-black shadow-[0_0_50px_rgba(245,158,11,0.3)]' : `bg-white/5 ${previewVenue?.id === venue.id ? 'border-white/40' : 'border-white/5'} hover:border-white/20 cursor-pointer`}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white">{venue.name}</h4>
                              {isWinner && <Trophy className="w-3 h-3 text-amber-500" />}
                            </div>
                            <p className="text-[9px] text-gray-500 uppercase font-black mt-1 tracking-widest">{venue.vibe}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setActiveVideo(venue.videoUrl || ''); }} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"><Play className="w-4 h-4 fill-current ml-0.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'music' && (
              <div className="space-y-6 animate-fade-in py-2">
                <div className="text-center mb-8"><div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/20"><Headphones className="w-6 h-6 text-amber-500" /></div><p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Escuchar de Fondo</p></div>
                <div className="grid grid-cols-1 gap-3">
                  {PLAYLIST_TRACKS.map((track) => {
                    const isActive = currentPlayingId === track.id;
                    return (
                      <button key={track.id} onClick={() => handlePlayTrack(track.id)} className={`group w-full p-5 rounded-[2.2rem] border transition-all flex items-center gap-4 text-left ${isActive ? 'bg-amber-500/10 border-amber-500 shadow-xl' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-400 group-hover:text-white'}`}>{isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</div>
                        <div className="flex-1 overflow-hidden"><h4 className={`text-xs font-black truncate tracking-wide ${isActive ? 'text-amber-500' : 'text-white'}`}>{track.title}</h4><p className="text-[9px] text-gray-500 font-bold truncate uppercase mt-0.5">{track.artist}</p></div>
                        {isActive && (<div className="flex gap-1 items-end h-4 pb-1">{[1, 2, 3, 4].map(i => (<div key={i} className={`w-0.5 bg-amber-500 rounded-full animate-bounce h-full`} style={{ animationDuration: `${0.6 + i * 0.1}s` }}></div>))}</div>)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {(hasAlreadyVoted && !winningVenue) ? (
            <div className="w-full p-6 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 text-center space-y-4 shrink-0 z-20">
              <div className="flex items-center justify-center gap-2">
                <Timer className="w-5 h-5 text-amber-500" />
                <span className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em]">¡Ya registraste tu voto!</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed max-w-xs mx-auto">Tu selección ha sido guardada. Espera al cierre de votaciones para reclamar acceso.</p>
              {config.votingDeadline && <CountdownTimer deadline={config.votingDeadline} />}
            </div>
          ) : (
            <button onClick={onContinue} className="group w-full py-5 font-black rounded-[2rem] flex items-center justify-center gap-4 bg-white text-black active:scale-95 transition-all shadow-2xl shrink-0 z-20">
              {winningVenue || isVotingClosed ? <Sparkles className="w-5 h-5" /> : <Vote className="w-5 h-5" />}
              <span className="text-[10px] tracking-[0.4em] uppercase">{winningVenue || isVotingClosed ? 'RECLAMAR TU PASE' : 'REGISTRARSE Y VOTAR'}</span>
            </button>
          )}

          {/* Logout / Exit Button */}
          {onExit && (
            <button
              onClick={onExit}
              className="w-full py-3 sm:py-4 mt-2 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 z-20"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
