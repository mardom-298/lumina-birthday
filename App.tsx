
import React, { useState, useEffect, useRef } from 'react';
import { UnlockScreen } from './components/UnlockScreen';
import { DetailsCard } from './components/DetailsCard';
// Removed duplicate import
import { SuccessScreen } from './components/SuccessScreen';
import { AdminPanel } from './components/AdminPanel';
import { GuestDock } from './components/GuestDock';
import { DesktopNav } from './components/DesktopNav';
import { GuestHelp } from './components/GuestHelp';
import { AppState, RsvpData, VenueOption, EventConfig, TicketTier, GuestEntry } from './types';
import { supabase } from './src/supabaseClient';
import { RsvpForm, INITIAL_TIERS } from './components/RsvpForm';

const DEFAULT_VENUES: VenueOption[] = [
  {
    id: 'lounge',
    name: 'Skyline Rooftop',
    vibe: 'Relajado & Elegante',
    minSpend: 'S/ 80',
    closingTime: '02:00 AM',
    description: 'Cócteles de autor, vista panorámica a la ciudad y ambiente para conversar.',
    perks: ['Vista Increíble', 'Música Chill'],
    color: 'from-indigo-500 to-blue-500',
    videoUrl: 'https://v4.cdnpk.net/videvo_files/video/free/2019-05/large_watermarked/190516_06_AZ-Sunset-Timelapses_07_preview.mp4',
    googleMapsUrl: 'https://maps.app.goo.gl/3f9n'
  },
  {
    id: 'club',
    name: 'Neon Pulse Club',
    vibe: 'Energía al Máximo',
    minSpend: 'S/ 120',
    closingTime: '06:00 AM',
    description: 'Para bailar hasta las últimas consecuencias. Luces potentes y el mejor sonido.',
    perks: ['Pista Privada', 'DJ de Moda'],
    color: 'from-fuchsia-600 to-purple-600',
    videoUrl: 'https://v4.cdnpk.net/videvo_files/video/free/2013-08/large_watermarked/hd0097_preview.mp4',
    googleMapsUrl: 'https://maps.app.goo.gl/3f9n'
  },
  {
    id: 'pub',
    name: 'The Urban Pub',
    vibe: 'Casual & Entre Patas',
    minSpend: 'S/ 40',
    closingTime: '03:00 AM',
    description: 'Cervezas artesanales bien heladas, piqueos peruanos y buena música para compartir.',
    perks: ['Precios Amigos', 'Ambiente Familiar'],
    color: 'from-orange-500 to-amber-500',
    videoUrl: 'https://v4.cdnpk.net/videvo_files/video/free/2019-11/large_watermarked/190828_07_Experimental_Night_Street_02_preview.mp4',
    googleMapsUrl: 'https://maps.app.goo.gl/3f9n'
  }
];

const DEFAULT_CONFIG: EventConfig = {
  dateDisplay: "28 . 02",
  fullDate: "Sábado, 28 de Febrero 2026",
  time: "09:00 PM",
  locationPlaceholder: "Ubicación por Confirmar",
  adminUser: "71267719",
  adminPassword: "S0p0rt3#",
  guestPasscode: "2026",
  votingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  winningVenueId: null,
  maxCapacity: 50
};

// ╔══════════════════════════════════════════════════════════════╗
// ║  LISTA DE INVITADOS — Edita aquí para agregar tus invitados ║
// ║  Estos invitados funcionan en TODOS los dispositivos.       ║
// ║  Formato: { id, name (nombre), phone (9 dígitos), used }   ║
// ╚══════════════════════════════════════════════════════════════╝
const DEFAULT_GUESTS: GuestEntry[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Carlos', phone: '987654321', used: false },
  { id: '22222222-2222-2222-2222-222222222222', name: 'María', phone: '912345678', used: false },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Alonso', phone: '956781234', used: false },
  // Agrega más invitados aquí siguiendo el mismo formato de UUID (puedes usar generadores online)
];

const mapRsvpFromDb = (dbRsvp: any, venues: VenueOption[]): RsvpData => {
  const venue = venues.find(v => v.id === dbRsvp.selected_venue_id) || null;
  const tier = INITIAL_TIERS.find(t => t.id === dbRsvp.selected_tier_id);

  return {
    firstName: dbRsvp.first_name,
    lastName: dbRsvp.last_name,
    email: dbRsvp.email || '',
    selectedVenue: venue,
    selectedTier: tier,
    guestCount: dbRsvp.guest_count || 0,
    ticketIds: dbRsvp.ticket_ids || [],
    timestamp: new Date(dbRsvp.created_at).getTime(),
    isAttending: true, // Default as it's missing in DB schema currently
    songRequest: '',   // Default as it's missing in DB schema currently
  };
};

// Playlist track IDs must match DetailsCard PLAYLIST_TRACKS order
const TRACK_IDS = [
  '2097036720', '2161172100', '2113555638', '1927905131',
  '1955520143', '797495047', '68957071', '2211822479'
];

const GlobalAudioPlayer = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<any>(null);
  const currentIndexRef = useRef(0);

  const loadTrack = (widget: any, index: number, autoPlay: boolean = true) => {
    currentIndexRef.current = index;
    const trackId = TRACK_IDS[index];
    const url = `https://api.soundcloud.com/tracks/${trackId}`;
    widget.load(url, {
      auto_play: autoPlay,
      hide_related: true,
      show_comments: false,
      show_user: false,
      show_reposts: false,
      show_teaser: false,
      visual: false,
      color: "#fbbf24",
      callback: () => {
        // Notify DetailsCard which track is playing
        window.dispatchEvent(new CustomEvent('bg-music-now-playing', { detail: { trackId } }));
      }
    });
  };

  useEffect(() => {
    const initWidget = () => {
      if (!iframeRef.current) return;
      const SC = (window as any).SC;
      if (!SC || !SC.Widget) {
        setTimeout(initWidget, 500);
        return;
      }

      const widget = SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      // When the widget is ready, bind the FINISH event for auto-advance
      widget.bind(SC.Widget.Events.READY, () => {
        widget.bind(SC.Widget.Events.FINISH, () => {
          // Advance to next track, loop back to first if at end
          const nextIndex = (currentIndexRef.current + 1) % TRACK_IDS.length;
          loadTrack(widget, nextIndex, true);
        });

        // Auto-play the first track on page load
        widget.play();
        window.dispatchEvent(new CustomEvent('bg-music-now-playing', { detail: { trackId: TRACK_IDS[0] } }));
      });

      // Listen for global music control events
      const handlePlay = () => widget.play();
      const handlePause = () => widget.pause();
      const handleToggle = () => widget.toggle();
      const handleChangeTrack = (e: any) => {
        const trackId = e.detail.trackId;
        const idx = TRACK_IDS.indexOf(trackId);
        if (idx !== -1) {
          loadTrack(widget, idx, true);
        } else {
          // Unknown track, load directly
          widget.load(`https://api.soundcloud.com/tracks/${trackId}`, {
            auto_play: true, hide_related: true, show_comments: false,
            show_user: false, show_reposts: false, show_teaser: false,
            visual: false, color: "#fbbf24"
          });
        }
      };

      window.addEventListener('bg-music-play', handlePlay);
      window.addEventListener('bg-music-pause', handlePause);
      window.addEventListener('bg-music-toggle', handleToggle);
      window.addEventListener('bg-music-change-track', handleChangeTrack);

      return () => {
        window.removeEventListener('bg-music-play', handlePlay);
        window.removeEventListener('bg-music-pause', handlePause);
        window.removeEventListener('bg-music-toggle', handleToggle);
        window.removeEventListener('bg-music-change-track', handleChangeTrack);
      };
    };

    initWidget();
  }, []);

  return (
    <div className="fixed top-0 left-0 w-8 h-8 opacity-0 pointer-events-none overflow-hidden z-[-100]">
      <iframe
        ref={iframeRef}
        width="100%"
        height="100"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${TRACK_IDS[0]}&color=%23fbbf24&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`}
      />
    </div>
  );
};

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LOCKED);
  const [currentRsvpData, setCurrentRsvpData] = useState<RsvpData | null>(null);
  const [bgMusicPlaying, setBgMusicPlaying] = useState(false);

  // ── Supabase State ────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<VenueOption[]>(DEFAULT_VENUES);
  const [config, setConfig] = useState<EventConfig>(DEFAULT_CONFIG);
  const [allRsvps, setAllRsvps] = useState<RsvpData[]>([]);

  // ── Fetch Data from Supabase ──────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Config & Venues
        const { data: configData } = await supabase.from('config').select('value').eq('key', 'event_settings').single();
        if (configData) setConfig({ ...DEFAULT_CONFIG, ...configData.value });

        const { data: venuesData } = await supabase.from('config').select('value').eq('key', 'venues').single();
        const currentVenues = venuesData ? venuesData.value : DEFAULT_VENUES;
        if (venuesData) setVenues(currentVenues);

        // 2. Guests (Seed if empty)
        const { data: guestsData } = await supabase.from('guests').select('*');
        if (!guestsData || guestsData.length === 0) {
          await supabase.from('guests').insert(DEFAULT_GUESTS.map(g => ({
            id: g.id,
            name: g.name,
            phone: g.phone,
            used: g.used,
            used_at: null
          })));
          setGuestList(DEFAULT_GUESTS);
        } else {
          setGuestList(guestsData.map((g: any) => ({
            id: g.id,
            name: g.name,
            phone: g.phone,
            used: g.used,
            usedAt: g.used_at ? new Date(g.used_at).getTime() : undefined
          })));
        }

        // 3. RSVPs
        const { data: rsvpsData } = await supabase.from('rsvps').select('*');
        if (rsvpsData) {
          setAllRsvps(rsvpsData.map(r => mapRsvpFromDb(r, currentVenues)));
        }

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Supabase Real-time Subscription ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('config-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, (payload: any) => {
        const record = payload.new;
        if (!record) return;
        if (record.key === 'event_settings') {
          setConfig((prev: EventConfig) => ({ ...prev, ...record.value }));
        } else if (record.key === 'venues') {
          setVenues(record.value);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────
  const updateConfig = async (newConfig: EventConfig) => {
    setConfig(newConfig);
    await supabase.from('config').upsert({ key: 'event_settings', value: newConfig }, { onConflict: 'key' });
  };
  const updateVenues = async (newVenues: VenueOption[]) => {
    setVenues(newVenues);
    await supabase.from('config').upsert({ key: 'venues', value: newVenues }, { onConflict: 'key' });
  };

  // ── Guest whitelist ────────────────────────────────────────────────
  // Default guests are hardcoded so they work on ALL devices.
  // The admin can add more from the panel — those are merged from localStorage.
  // To add your real guests, edit the DEFAULT_GUESTS array below.
  const [guestList, setGuestList] = useState<GuestEntry[]>(DEFAULT_GUESTS);

  const updateGuestList = async (newList: GuestEntry[]) => {
    // Diff to find deleted guests
    const toDelete = guestList.filter(g => !newList.find(n => n.id === g.id)).map(g => g.id);
    setGuestList(newList);

    if (toDelete.length > 0) {
      await supabase.from('guests').delete().in('id', toDelete);
    }

    // Sync updates/inserts to Supabase
    const dbGuests = newList.map(g => ({
      id: g.id.length < 10 ? undefined : g.id, // Skip 'g1' etc if any left
      name: g.name,
      phone: g.phone,
      used: g.used,
      used_at: g.usedAt ? new Date(g.usedAt).toISOString() : null
    }));
    await supabase.from('guests').upsert(dbGuests);
  };
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', hour12: false, minute: '2-digit' }));

  useEffect(() => {
    const saved = localStorage.getItem('lumina_rsvp');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentRsvpData(parsed);
      } catch (e) { }
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', hour12: false, minute: '2-digit' }));
    }, 1000);

    const handleToggle = () => setBgMusicPlaying(prev => !prev);
    const handlePause = () => setBgMusicPlaying(false);
    const handlePlay = () => setBgMusicPlaying(true);

    window.addEventListener('bg-music-toggle', handleToggle);
    window.addEventListener('bg-music-pause', handlePause);
    window.addEventListener('bg-music-play', handlePlay);

    return () => {
      clearInterval(timer);
      window.removeEventListener('bg-music-toggle', handleToggle);
      window.removeEventListener('bg-music-pause', handlePause);
      window.removeEventListener('bg-music-play', handlePlay);
    };
  }, []);

  const handleUnlock = async (guest: GuestEntry) => {
    // Mark guest as used
    const updatedList = guestList.map(g =>
      g.id === guest.id ? { ...g, used: true, usedAt: Date.now() } : g
    );
    updateGuestList(updatedList);

    // Al desbloquear, notificamos al widget que empiece
    window.dispatchEvent(new CustomEvent('bg-music-play'));
    setBgMusicPlaying(true);

    // Check if this guest already voted (has RSVP in DB)
    const { data: existingRsvp } = await supabase
      .from('rsvps')
      .select('*')
      .or(`first_name.ilike.%${guest.name.split(' ')[0]}%`)
      .limit(1);

    if (existingRsvp && existingRsvp.length > 0) {
      // Guest already has an RSVP
      const rsvpData = mapRsvpFromDb(existingRsvp[0], venues);
      setCurrentRsvpData(rsvpData);
      localStorage.setItem('lumina_rsvp', JSON.stringify(rsvpData));

      // If voting is still open and they already voted, go to INVITATION (shows countdown)
      // If voting closed and they have tickets, go to SUCCESS
      const votingStillOpen = config.votingDeadline && new Date(config.votingDeadline).getTime() > Date.now() && !config.winningVenueId;
      if (votingStillOpen) {
        setAppState(AppState.INVITATION);
      } else if (rsvpData.ticketIds && rsvpData.ticketIds.length > 0) {
        setAppState(AppState.SUCCESS);
      } else {
        setAppState(AppState.INVITATION);
      }
    } else if (currentRsvpData) {
      setAppState(AppState.SUCCESS);
    } else {
      setAppState(AppState.INVITATION);
    }
  };

  const handleAdminEnter = () => setAppState(AppState.ADMIN);
  const startRsvp = () => setAppState(AppState.RSVP);
  const handleBackToDetails = () => setAppState(AppState.INVITATION);
  const handleExit = () => {
    setAppState(AppState.LOCKED);
    window.dispatchEvent(new CustomEvent('bg-music-pause'));
    setBgMusicPlaying(false);
  };

  const handleRsvpSubmit = async (data: RsvpData) => {
    setCurrentRsvpData(data);
    const updatedRsvps = [...allRsvps, data];
    setAllRsvps(updatedRsvps);
    // Local cache for current user session
    localStorage.setItem('lumina_rsvp', JSON.stringify(data));

    // Save to Supabase
    await supabase.from('rsvps').insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      selected_venue_id: data.selectedVenue?.id || null,
      selected_tier_id: data.selectedTier?.id || null,
      guest_count: data.guestCount,
      ticket_ids: data.ticketIds,
      created_at: new Date().toISOString() // using ISO for timestamptz
    });

    setAppState(AppState.SUCCESS);
  };

  const isVotingClosed = config.votingDeadline ? new Date(config.votingDeadline).getTime() < Date.now() : false;
  const winningVenue = config.winningVenueId ? venues.find(v => v.id === config.winningVenueId) : venues[0];

  return (
    <main className={`min-h-screen w-full flex flex-col justify-start sm:justify-center items-center p-4 sm:p-8 relative font-sans text-white overflow-x-hidden bg-black selection:bg-amber-500/30`}>
      <GlobalAudioPlayer />

      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '-2s' }}></div>
      </div>

      <div className="z-10 w-full md:w-auto transition-all duration-1000 ease-in-out relative flex flex-col items-center max-w-md md:max-w-5xl mx-auto">
        <GuestHelp appState={appState} className="top-4 right-4" isVotingClosed={isVotingClosed} hasTickets={!!(currentRsvpData?.ticketIds && currentRsvpData.ticketIds.length > 0)} />

        {appState === AppState.LOCKED && (
          <UnlockScreen onUnlock={handleUnlock} config={config} onAdminEnter={handleAdminEnter} guestList={guestList} />
        )}

        {appState === AppState.INVITATION && (
          <DetailsCard onContinue={startRsvp} config={config} venues={venues} hasAlreadyVoted={!!currentRsvpData} />
        )}

        {appState === AppState.RSVP && (
          <RsvpForm onSubmit={handleRsvpSubmit} onBack={handleBackToDetails} venueOptions={venues} config={config} existingRsvpsCount={allRsvps.length} isVotingClosed={isVotingClosed} />
        )}

        {appState === AppState.SUCCESS && currentRsvpData && (
          <SuccessScreen data={currentRsvpData} config={config} onExit={handleExit} />
        )}

        {appState === AppState.ADMIN && (
          <AdminPanel config={config} venues={venues} rsvps={allRsvps} onUpdateConfig={updateConfig} onUpdateVenues={updateVenues} onExit={() => setAppState(AppState.LOCKED)} guestList={guestList} onUpdateGuests={updateGuestList} />
        )}
      </div>

      <GuestDock appState={appState} config={config} winningVenue={winningVenue || null} rsvpData={currentRsvpData} isMusicPlaying={bgMusicPlaying} />

      <DesktopNav appState={appState} winningVenue={winningVenue || null} onLogout={handleExit} />

      {appState !== AppState.ADMIN && (
        <div className="fixed bottom-4 right-6 sm:bottom-6 sm:right-8 z-50 pointer-events-none flex flex-col items-end opacity-20 transition-all">
          <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.2em] text-white uppercase">{currentTime}</p>
          <p className="text-[7px] sm:text-[8px] font-mono tracking-[0.4em] text-white uppercase mt-0.5">MARINO · 28</p>
        </div>
      )}
    </main>
  );
}

export default App;
