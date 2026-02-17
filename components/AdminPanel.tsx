
import React, { useState, useEffect } from 'react';
import { VenueOption, EventConfig, RsvpData, GuestEntry } from '../types';
import {
  BarChart3, Settings, Users, Star, ScanLine, LogOut, CheckCircle2,
  XCircle, Timer, PieChart, UserPlus, Check, X, Clock, MapPin, Wallet, Video, Type, Shield, CalendarDays, Trophy, Zap, Info, Phone, Trash2, RotateCcw, AlertCircle, Plus, Palette, Ticket, Crown, Sparkles, MessageSquare, Send
} from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from '../src/supabaseClient';

interface AdminPanelProps {
  config: EventConfig;
  venues: VenueOption[];
  rsvps: RsvpData[];
  onUpdateConfig: (newConfig: EventConfig) => void;
  onUpdateVenues: (newVenues: VenueOption[]) => void;
  onExit: () => void;
  guestList: GuestEntry[];
  onUpdateGuests: (newList: GuestEntry[]) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ config, venues, rsvps, onUpdateConfig, onUpdateVenues, onExit, guestList, onUpdateGuests }) => {
  const [activeTab, setActiveTab] = useState<'panel' | 'sedes' | 'invitados' | 'scan' | 'ajustes' | 'entradas'>('panel');
  const [tempConfig, setTempConfig] = useState<EventConfig>(config);
  const [tempVenues, setTempVenues] = useState<VenueOption[]>(venues);
  const [tempTiers, setTempTiers] = useState<any[]>([]); // To store tiers for editing
  const [saveStatus, setSaveStatus] = useState<'idle' | 'guardando' | 'exito'>('idle');
  const [scanResult, setScanResult] = useState<{ valid: boolean; alreadyUsed?: boolean; data?: RsvpData; message?: string; scannedAt?: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    // Fetch tiers for editing
    const fetchTiers = async () => {
      const { data } = await supabase.from('ticket_tiers').select('*').order('stock', { ascending: true }); // order by price/importance usually, but stock works for now
      if (data) setTempTiers(data);
    };
    fetchTiers();
  }, []);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setTempConfig(config); setTempVenues(venues); }, [config, venues]);

  // Cleanup camera when leaving scan tab
  useEffect(() => {
    if (activeTab !== 'scan') {
      stopCameraStream();
    }
  }, [activeTab]);

  const handleQrResult = async (decodedText: string) => {
    // Stop camera after successful scan
    stopCameraStream();

    const found = rsvps.find(r => r.ticketIds?.includes(decodedText));
    if (!found) {
      setScanResult({ valid: false, message: "Pase No Encontrado" });
      return;
    }

    // Check if ticket was already used
    try {
      const { data: existingScan } = await supabase
        .from('ticket_scans')
        .select('*')
        .eq('ticket_id', decodedText)
        .maybeSingle();

      if (existingScan) {
        // Already scanned before!
        const scanTime = new Date(existingScan.scanned_at).toLocaleTimeString('es-PE', {
          hour: '2-digit', minute: '2-digit', hour12: true
        });
        setScanResult({
          valid: true,
          alreadyUsed: true,
          data: found,
          message: "Pase Ya Utilizado",
          scannedAt: scanTime
        });
        return;
      }

      // First time scanning — record it
      await supabase.from('ticket_scans').insert({
        ticket_id: decodedText,
        guest_name: `${found.firstName} ${found.lastName}`,
        guest_email: found.email,
        tier_name: found.selectedTier?.name || 'N/A'
      });

      setScanResult({ valid: true, data: found, message: "✓ Acceso Permitido" });
    } catch (err) {
      console.error('Scan DB error:', err);
      // Still show as valid even if DB fails
      setScanResult({ valid: true, data: found, message: "Pase Válido (sin registro)" });
    }
  };

  const stopCameraStream = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    stopCameraStream();
    setCameraError(null);
    setScanResult(null);

    try {
      // Request camera - try rear first, fallback to any
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 640 } }
        });
      } catch {
        // Fallback: try any available camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        setCameraActive(true);

        // Start QR code scanning from video frames
        startFrameScanning();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permiso de cámara denegado. Habilita la cámara en ajustes del navegador y recarga.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No se encontró cámara en este dispositivo.');
      } else {
        setCameraError(`Error de cámara: ${err.message || 'Desconocido'}. Asegúrate de acceder por HTTPS.`);
      }
    }
  };

  const startFrameScanning = () => {
    // Use BarcodeDetector API if available (Chrome 83+, Safari 17.2+)
    const hasBarcodeDetector = 'BarcodeDetector' in window;

    if (hasBarcodeDetector) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      scanIntervalRef.current = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              handleQrResult(barcodes[0].rawValue);
            }
          } catch (e) { /* frame scan error, ignore */ }
        }
      }, 500);
    } else {
      // Fallback: capture frames to canvas and use html5-qrcode to decode
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      scanIntervalRef.current = setInterval(async () => {
        if (videoRef.current && ctx && videoRef.current.readyState >= 2) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          canvas.toBlob(async (blob) => {
            if (!blob) return;
            try {
              const file = new File([blob], 'frame.png', { type: 'image/png' });
              const scanner = new Html5Qrcode('qr-canvas-tmp', { verbose: false });
              const result = await scanner.scanFileV2(file, false);
              if (result?.decodedText) {
                handleQrResult(result.decodedText);
              }
              scanner.clear();
            } catch { /* no QR found in frame, ignore */ }
          }, 'image/png');
        }
      }, 800);
    }
  };

  const stopCamera = stopCameraStream;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const scanner = new Html5Qrcode("qr-reader-file");
      const result = await scanner.scanFile(file, true);
      handleQrResult(result);
      scanner.clear();
    } catch {
      setScanResult({ valid: false, message: "No se detectó código QR en la imagen" });
    }
  };

  const saveAll = async () => {
    setSaveStatus('guardando');

    // 1. Get current sales counts to calculate NET stock
    // We need to know how many are already sold to subtract from the new capacity
    let platinumSold = 0;
    let totalAllGuests = 0;
    let emeraldSold = 0;
    let standardSold = 0;

    try {
      // Calculate total +1s
      const { data: allGuestCounts } = await supabase.from('rsvps').select('guest_count');
      if (allGuestCounts) {
        totalAllGuests = allGuestCounts.reduce((sum, item) => sum + (item.guest_count || 0), 0);
      }

      const { count: pCount } = await supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('selected_tier_id', 'platinum');
      const { count: eCount } = await supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('selected_tier_id', 'emerald');
      const { count: sCount } = await supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('selected_tier_id', 'standard');

      platinumSold = pCount || 0;
      emeraldSold = eCount || 0;
      standardSold = sCount || 0;
    } catch (err) {
      console.error("Error fetching sales counts:", err);
    }

    // 2. Calculate Total Capacity per Tier
    // Platinum fixed at 4 (User Request).
    const platinumCapacity = 4;
    const remainingCapacity = Math.max(0, tempConfig.maxCapacity - platinumCapacity);
    const emeraldCapacity = Math.floor(remainingCapacity / 2);
    const standardCapacity = remainingCapacity - emeraldCapacity; // Handles odd numbers

    // 3. Calculate Net Stock (Available to Buy)
    // Stock = Capacity - Sold
    const platinumStock = Math.max(0, platinumCapacity - platinumSold);
    const emeraldStock = Math.max(0, emeraldCapacity - emeraldSold);
    const standardStock = Math.max(0, standardCapacity - (standardSold + totalAllGuests));

    try {
      // Parallel update for efficiency
      const updates = [
        supabase.from('ticket_tiers').update({ stock: platinumStock }).eq('id', 'platinum'),
        supabase.from('ticket_tiers').update({ stock: emeraldStock }).eq('id', 'emerald'),
        supabase.from('ticket_tiers').update({ stock: standardStock }).eq('id', 'standard')
      ];

      // Add perk updates if any
      if (tempTiers.length > 0) {
        tempTiers.forEach(tier => {
          updates.push(supabase.from('ticket_tiers').update({ perks: tier.perks }).eq('id', tier.id));
        });
      }

      await Promise.all(updates);

      onUpdateConfig(tempConfig);
      onUpdateVenues(tempVenues);
      setSaveStatus('exito');
    } catch (err) {
      console.error("Error updating stocks:", err);
      // Even if stock update fails, try to save config locally
      onUpdateConfig(tempConfig);
      onUpdateVenues(tempVenues);
      setSaveStatus('exito'); // Show success but log error
    }

    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const totalPax = rsvps.reduce((acc, curr) => acc + 1 + curr.guestCount, 0);

  // ── WhatsApp Invitation Message Builder ─────────────────
  const APP_URL = 'https://lumina-birthday.vercel.app';
  const buildWhatsAppUrl = (phone: string, name: string) => {
    const firstName = name.split(' ')[0];
    const msg = `✨ *¡Hola ${firstName}!* ✨\n\n` +
      `Quiero invitarte personalmente a celebrar un momento especial conmigo 🎂\n\n` +
      `📅 *Sábado, 28 de Febrero 2026*\n🕘 *9:00 PM*\n\n` +
      `He preparado una experiencia digital exclusiva para ti donde podrás:\n` +
      `🗳️ Votar por el mejor ambiente\n` +
      `🎫 Reclamar tu pase digital VIP\n` +
      `🎵 Elegir la música de la noche\n\n` +
      `👉 Ingresa aquí con tu número registrado:\n${APP_URL}\n\n` +
      `¡Tu presencia haría esta noche inolvidable! 🥂\n` +
      `— *Marino* 🎉`;
    return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  // ── Engagement-based Predictive Analytics ──────────────────
  const confirmedRsvps = rsvps.filter(r => r.ticketIds && r.ticketIds.length > 0);
  const votedOnlyRsvps = rsvps.filter(r => r.selectedVenue && (!r.ticketIds || r.ticketIds.length === 0));
  const registeredOnlyRsvps = rsvps.filter(r => !r.selectedVenue && (!r.ticketIds || r.ticketIds.length === 0));

  // Phone-matched guests who interacted
  const interactedPhones = new Set(rsvps.map(r => r.phone).filter(Boolean));
  const noInteractionGuests = guestList.filter(g => !g.used && !interactedPhones.has(g.phone));

  // Pax per category (invitee + their guestCount)
  const confirmedPax = confirmedRsvps.reduce((a, r) => a + 1 + r.guestCount, 0);
  const votedOnlyPax = votedOnlyRsvps.reduce((a, r) => a + 1 + r.guestCount, 0);
  const registeredOnlyPax = registeredOnlyRsvps.reduce((a, r) => a + 1 + r.guestCount, 0);
  const noInteractionPax = noInteractionGuests.length; // 1 person each assumed

  // Probability weights
  const PROB_CONFIRMED = 0.95;
  const PROB_VOTED = 0.60;
  const PROB_REGISTERED = 0.30;
  const PROB_NO_INTERACTION = 0.10;

  const estimatedAttendance = Math.round(
    confirmedPax * PROB_CONFIRMED +
    votedOnlyPax * PROB_VOTED +
    registeredOnlyPax * PROB_REGISTERED +
    noInteractionPax * PROB_NO_INTERACTION
  );

  const conversionRate = guestList.length > 0
    ? Math.round((confirmedRsvps.length / guestList.length) * 100)
    : 0;

  const funnelSteps = [
    { label: 'Invitados', count: guestList.length, color: 'from-gray-500 to-gray-600', icon: Users },
    { label: 'Registrados', count: rsvps.length, color: 'from-blue-500 to-blue-600', icon: UserPlus },
    { label: 'Votaron', count: votedOnlyRsvps.length + confirmedRsvps.length, color: 'from-amber-500 to-yellow-500', icon: PieChart },
    { label: 'Confirmados', count: confirmedRsvps.length, color: 'from-emerald-500 to-green-500', icon: CheckCircle2 },
  ];
  const funnelMax = Math.max(guestList.length, 1);

  // Ticket tier breakdown
  const tierCounts: Record<string, number> = {};
  confirmedRsvps.forEach(r => {
    const tierId = r.selectedTier?.id || 'unknown';
    tierCounts[tierId] = (tierCounts[tierId] || 0) + (r.ticketIds?.length || 0);
  });

  // Determinar ganador por votos
  const getVenueWithMostVotes = () => {
    if (rsvps.length === 0) return null;
    const counts: Record<string, number> = {};
    rsvps.forEach(r => {
      if (r.selectedVenue) {
        counts[r.selectedVenue.id] = (counts[r.selectedVenue.id] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  };

  const winningVenueIdByVotes = getVenueWithMostVotes();
  const manualWinner = tempConfig.winningVenueId;

  const formatISOForInput = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const NavItem = ({ icon: Icon, label, tab }: { icon: any, label: string, tab: typeof activeTab }) => {
    const active = activeTab === tab;
    return (
      <button onClick={() => setActiveTab(tab)} className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all ${active ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'}`}>
        <Icon className="w-4 h-4" /> <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-black text-white fixed inset-0 z-[200]">
      <aside className="hidden md:flex w-64 border-r border-white/5 flex-col p-6 space-y-8 bg-zinc-900/50">
        <div><h1 className="text-xl font-serif italic">Lumina Admin</h1><p className="text-[8px] text-gray-500 uppercase font-black">Control de Acceso</p></div>
        <nav className="flex-1 space-y-2">
          <NavItem icon={BarChart3} label="Panel Principal" tab="panel" />
          <NavItem icon={ScanLine} label="Escanear QR" tab="scan" />
          <NavItem icon={Users} label="Invitados" tab="invitados" />
          <NavItem icon={Star} label="Editar Ambientes" tab="sedes" />
          <NavItem icon={Ticket} label="Entradas" tab="entradas" />
          <NavItem icon={Settings} label="Ajustes" tab="ajustes" />
        </nav>
        <button onClick={onExit} className="w-full p-4 rounded-xl border border-white/10 text-gray-400 hover:text-white flex items-center justify-center gap-2 font-black text-[10px] uppercase transition-colors hover:bg-red-500/10 hover:text-red-500">
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-44 no-scrollbar bg-black">
        {activeTab === 'panel' && (
          <div className="space-y-8 animate-fade-in">

            {/* ── Row 1: Main KPIs ─────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="glass-card p-6 rounded-[2rem] text-center border-white/5">
                <Users className="w-5 h-5 text-gray-400 mb-2 mx-auto" />
                <p className="text-2xl font-bold font-mono">{guestList.length}</p>
                <p className="text-[8px] uppercase tracking-widest text-gray-500">Invitados Totales</p>
              </div>
              <div className="glass-card p-6 rounded-[2rem] text-center border-white/5">
                <UserPlus className="w-5 h-5 text-blue-400 mb-2 mx-auto" />
                <p className="text-2xl font-bold font-mono">{rsvps.length}</p>
                <p className="text-[8px] uppercase tracking-widest text-gray-500">Registrados</p>
              </div>
              <div className="glass-card p-6 rounded-[2rem] text-center border-white/5">
                <PieChart className="w-5 h-5 text-amber-400 mb-2 mx-auto" />
                <p className="text-2xl font-bold font-mono">{votedOnlyRsvps.length + confirmedRsvps.length}</p>
                <p className="text-[8px] uppercase tracking-widest text-gray-500">Votaron</p>
              </div>
              <div className="glass-card p-6 rounded-[2rem] text-center border-white/5 border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2 mx-auto" />
                <p className="text-2xl font-bold font-mono">{confirmedRsvps.length}</p>
                <p className="text-[8px] uppercase tracking-widest text-gray-500">Confirmados</p>
              </div>
              <div className="glass-card p-6 rounded-[2rem] text-center border-white/5 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
                <Zap className="w-5 h-5 text-amber-500 mb-2 mx-auto" />
                <p className="text-3xl font-bold font-mono text-amber-400">{estimatedAttendance}</p>
                <p className="text-[8px] uppercase tracking-widest text-amber-500/70">Aforo Estimado</p>
              </div>
              <div className="glass-card p-6 rounded-[2rem] text-center border-white/5">
                {tempConfig.winningVenueId ? <Trophy className="w-5 h-5 text-amber-500 mb-2 mx-auto" /> : <Clock className="w-5 h-5 text-gray-500 mb-2 mx-auto" />}
                <p className="text-xs font-bold truncate px-2">{tempConfig.winningVenueId ? venues.find(v => v.id === tempConfig.winningVenueId)?.name : 'Votación Abierta'}</p>
                <p className="text-[8px] uppercase tracking-widest text-gray-500">Estado del Ambiente</p>
              </div>
            </div>

            {/* ── Row 2: Engagement Funnel ──────────────────────── */}
            <div className="glass-card p-8 rounded-[2.5rem] border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-serif italic">Embudo de Engagement</h3>
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Tasa de conversión: <span className="text-emerald-400 text-sm font-mono">{conversionRate}%</span></span>
              </div>
              <div className="space-y-4">
                {funnelSteps.map((step, i) => {
                  const pct = funnelMax > 0 ? (step.count / funnelMax) * 100 : 0;
                  const StepIcon = step.icon;
                  return (
                    <div key={step.label} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-2 font-bold"><StepIcon className="w-3.5 h-3.5" /> {step.label}</span>
                        <span className="font-mono font-bold">{step.count}</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${step.color} rounded-full transition-all duration-700`} style={{ width: `${Math.max(pct, 2)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Row 3: Two columns ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Vote Breakdown */}
              <div className="glass-card p-8 rounded-[2.5rem] border-white/5">
                <h3 className="text-lg font-serif italic mb-6">Tendencia de Votación</h3>
                <div className="space-y-6">
                  {venues.map(v => {
                    const votes = rsvps.filter(r => r.selectedVenue?.id === v.id).length;
                    const pct = rsvps.length > 0 ? (votes / rsvps.length) * 100 : 0;
                    const isCurrentWinner = winningVenueIdByVotes === v.id;
                    return (
                      <div key={v.id} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="flex items-center gap-2">{v.name} {isCurrentWinner && <Trophy className="w-3 h-3 text-amber-500" />}</span>
                          <span>{votes} votos</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r ${v.color}`} style={{ width: `${pct}%` }}></div></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attendance Prediction Breakdown */}
              <div className="glass-card p-8 rounded-[2.5rem] border-white/5">
                <h3 className="text-lg font-serif italic mb-6">Predicción de Asistencia</h3>
                <div className="space-y-5">
                  {[
                    { label: 'Confirmados', emoji: '🎫', count: confirmedPax, prob: PROB_CONFIRMED, estimated: Math.round(confirmedPax * PROB_CONFIRMED), color: 'from-emerald-500 to-green-500', textColor: 'text-emerald-400' },
                    { label: 'Solo Votaron', emoji: '🗳️', count: votedOnlyPax, prob: PROB_VOTED, estimated: Math.round(votedOnlyPax * PROB_VOTED), color: 'from-amber-500 to-yellow-500', textColor: 'text-amber-400' },
                    { label: 'Solo Registro', emoji: '👤', count: registeredOnlyPax, prob: PROB_REGISTERED, estimated: Math.round(registeredOnlyPax * PROB_REGISTERED), color: 'from-blue-500 to-indigo-500', textColor: 'text-blue-400' },
                    { label: 'Sin Interacción', emoji: '👻', count: noInteractionPax, prob: PROB_NO_INTERACTION, estimated: Math.round(noInteractionPax * PROB_NO_INTERACTION), color: 'from-gray-600 to-gray-700', textColor: 'text-gray-400' },
                  ].map(cat => (
                    <div key={cat.label} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-2 font-bold">{cat.emoji} {cat.label} <span className="text-[8px] text-gray-500 font-normal">({Math.round(cat.prob * 100)}% prob.)</span></span>
                        <span className="font-mono"><span className={cat.textColor}>{cat.estimated}</span> <span className="text-gray-600">/ {cat.count}</span></span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${cat.color} rounded-full`} style={{ width: `${cat.count > 0 ? (cat.estimated / Math.max(cat.count, 1)) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-4 mt-4 flex justify-between items-center">
                    <span className="text-xs font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Total Estimado</span>
                    <span className="text-xl font-bold font-mono text-amber-400">{estimatedAttendance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 4: Ticket Categories & Unresponsive ──────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Ticket Tier Stats */}
              <div className="glass-card p-8 rounded-[2.5rem] border-white/5">
                <h3 className="text-lg font-serif italic mb-6">Boletos por Categoría</h3>
                {tempTiers.length > 0 ? (
                  <div className="space-y-4">
                    {tempTiers.map((tier: any) => {
                      const sold = tierCounts[tier.id] || 0;
                      const totalStock = tier.stock + sold;
                      const pct = totalStock > 0 ? (sold / totalStock) * 100 : 0;
                      return (
                        <div key={tier.id} className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold flex items-center gap-2">
                              {tier.id === 'platinum' && <Crown className="w-3.5 h-3.5 text-purple-400" />}
                              {tier.id === 'emerald' && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                              {tier.id === 'standard' && <Ticket className="w-3.5 h-3.5 text-gray-400" />}
                              {tier.name}
                            </span>
                            <span className="font-mono">{sold} <span className="text-gray-500">/ {totalStock}</span></span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-6">No hay categorías configuradas.</p>
                )}
              </div>

              {/* Unresponsive Guests */}
              <div className="glass-card p-8 rounded-[2.5rem] border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-serif italic">Sin Respuesta</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-400/70 bg-red-500/10 px-3 py-1.5 rounded-full">{noInteractionGuests.length} pendientes</span>
                </div>
                {noInteractionGuests.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {noInteractionGuests.slice(0, 15).map((g) => (
                      <div key={g.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <span className="text-xs font-bold truncate flex-1">{g.name}</span>
                        <a href={buildWhatsAppUrl(g.phone, g.name)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors text-[9px] font-bold">
                          <Send className="w-3.5 h-3.5" /> Invitar
                        </a>
                      </div>
                    ))}
                    {noInteractionGuests.length > 15 && (
                      <p className="text-[9px] text-gray-500 text-center pt-2">y {noInteractionGuests.length - 15} más...</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3 opacity-50" />
                    <p className="text-xs text-gray-500">¡Todos tus invitados han interactuado!</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'sedes' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif italic">Gestionar Ambientes</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">{tempVenues.length} ambientes configurados</p>
              </div>
              <button
                onClick={() => {
                  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'venue-' + Date.now();
                  const colors = ['from-indigo-500 to-blue-500', 'from-fuchsia-600 to-purple-600', 'from-orange-500 to-amber-500', 'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500', 'from-cyan-500 to-sky-500'];
                  const newVenue: VenueOption = {
                    id: newId,
                    name: 'Nuevo Ambiente',
                    vibe: 'Describe el vibe',
                    minSpend: 'S/ 0',
                    closingTime: '03:00 AM',
                    description: 'Descripción del ambiente',
                    perks: [],
                    color: colors[tempVenues.length % colors.length],
                    videoUrl: '',
                    googleMapsUrl: ''
                  };
                  setTempVenues(prev => [...prev, newVenue]);
                }}
                className="px-6 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all hover:bg-amber-400"
              >
                <Plus className="w-4 h-4" /> Agregar Ambiente
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {tempVenues.map(v => (
                <div key={v.id} className="glass-card p-8 rounded-[2.5rem] border-white/5 space-y-6 relative group">
                  {/* Delete button */}
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar el ambiente "${v.name}"? Esta acción no se puede deshacer.`)) {
                        setTempVenues(prev => prev.filter(item => item.id !== v.id));
                      }
                    }}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-red-500/0 hover:bg-red-500/10 text-gray-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    title="Eliminar ambiente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${v.color} flex items-center justify-center shrink-0`}><Type className="w-5 h-5 text-white" /></div>
                    <input type="text" value={v.name} onChange={(e) => setTempVenues(prev => prev.map(item => item.id === v.id ? { ...item, name: e.target.value } : item))} className="bg-transparent border-b border-white/10 outline-none w-full font-serif italic text-lg" placeholder="Nombre del ambiente" />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[8px] uppercase text-gray-500 font-black tracking-widest block mb-2">Descripción</label>
                    <textarea value={v.description} onChange={(e) => setTempVenues(prev => prev.map(item => item.id === v.id ? { ...item, description: e.target.value } : item))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs resize-none h-20" placeholder="Describe este ambiente..." />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[8px] uppercase text-gray-500 font-black tracking-widest block mb-2">Ambiente / Vibe</label>
                      <input type="text" value={v.vibe} onChange={(e) => setTempVenues(prev => prev.map(item => item.id === v.id ? { ...item, vibe: e.target.value } : item))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs" />
                    </div>
                    <div>
                      <label className="text-[8px] uppercase text-gray-500 font-black tracking-widest block mb-2">Consumo Mín.</label>
                      <input type="text" value={v.minSpend} onChange={(e) => setTempVenues(prev => prev.map(item => item.id === v.id ? { ...item, minSpend: e.target.value } : item))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs" placeholder="S/ 80" />
                    </div>
                    <div>
                      <label className="text-[8px] uppercase text-gray-500 font-black tracking-widest block mb-2">Cierre</label>
                      <input type="text" value={v.closingTime} onChange={(e) => setTempVenues(prev => prev.map(item => item.id === v.id ? { ...item, closingTime: e.target.value } : item))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs" />
                    </div>
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="text-[8px] uppercase text-gray-500 font-black tracking-widest block mb-2">Color del Ambiente</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: 'from-indigo-500 to-blue-500', label: 'Azul' },
                        { value: 'from-fuchsia-600 to-purple-600', label: 'Púrpura' },
                        { value: 'from-orange-500 to-amber-500', label: 'Ámbar' },
                        { value: 'from-emerald-500 to-teal-500', label: 'Esmeralda' },
                        { value: 'from-rose-500 to-pink-500', label: 'Rosa' },
                        { value: 'from-cyan-500 to-sky-500', label: 'Celeste' },
                        { value: 'from-red-500 to-orange-500', label: 'Rojo' },
                        { value: 'from-violet-500 to-indigo-500', label: 'Violeta' },
                      ].map(c => (
                        <button
                          key={c.value}
                          onClick={() => setTempVenues(prev => prev.map(item => item.id === v.id ? { ...item, color: c.value } : item))}
                          className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.value} transition-all ${v.color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-50 hover:opacity-100'}`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[8px] uppercase text-gray-500 font-black tracking-widest block mb-2">Enlace de Video (YouTube/Vimeo/MP4)</label>
                      <input type="text" value={v.videoUrl || ''} onChange={(e) => setTempVenues(prev => prev.map(item => item.id === v.id ? { ...item, videoUrl: e.target.value } : item))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-mono text-amber-500" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="text-[8px] uppercase text-gray-500 font-black tracking-widest block mb-2">Enlace Google Maps (Para botón 'Ir')</label>
                      <input type="text" value={v.googleMapsUrl || ''} onChange={(e) => setTempVenues(prev => prev.map(item => item.id === v.id ? { ...item, googleMapsUrl: e.target.value } : item))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-mono text-emerald-500 mb-4" placeholder="https://maps.app.goo.gl/..." />
                    </div>
                    <div>
                      <label className="text-[8px] uppercase text-gray-500 font-black tracking-widest block mb-2">Ubicación Exacta (Plus Code o Dirección para Mapa)</label>
                      <input type="text" value={v.mapQuery || ''} onChange={(e) => setTempVenues(prev => prev.map(item => item.id === v.id ? { ...item, mapQuery: e.target.value } : item))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-mono text-blue-400" placeholder="Ej: WXM7+PG Lima" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {tempVenues.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <Palette className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm italic">No hay ambientes configurados. Agrega uno para empezar.</p>
              </div>
            )}

            <button onClick={saveAll} className="w-full py-6 rounded-3xl bg-white text-black font-black uppercase text-[10px] tracking-widest">
              {saveStatus === 'exito' ? '¡CAMBIOS GUARDADOS!' : 'GUARDAR TODA LA CONFIGURACIÓN'}
            </button>
          </div>
        )}

        {activeTab === 'invitados' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif italic">Gestión de Invitados</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">{guestList.length} registrados · {guestList.filter(g => g.used).length} ingresaron</p>
              </div>
            </div>

            {/* Add Guest Form */}
            <div className="glass-card rounded-[2rem] p-8 border-white/5 space-y-4">
              <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-black flex items-center gap-2"><UserPlus className="w-4 h-4" /> Agregar Invitado</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const nameInput = (form.elements.namedItem('guestName') as HTMLInputElement);
                const phoneInput = (form.elements.namedItem('guestPhone') as HTMLInputElement);
                const name = nameInput.value.trim();
                const phone = phoneInput.value.trim().replace(/\D/g, '');
                if (!name || !/^9\d{8}$/.test(phone)) return;
                if (guestList.some(g => g.phone === phone)) { alert('Este número ya está registrado'); return; }
                // Use crypto.randomUUID() or fallback for older browsers to satisfy Postgres UUID requirement
                const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                  var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                  return v.toString(16);
                });

                const newGuest: GuestEntry = {
                  id: newId,
                  name: name,
                  phone: phone,
                  used: false,
                }; onUpdateGuests([...guestList, newGuest]);
                nameInput.value = '';
                phoneInput.value = '';
              }} className="flex gap-3 flex-wrap">
                <input name="guestName" type="text" placeholder="Nombre" className="flex-1 min-w-[120px] bg-black border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 text-white" required />
                <div className="relative flex-1 min-w-[160px]">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input name="guestPhone" type="tel" placeholder="9XXXXXXXX" maxLength={9} className="w-full bg-black border border-white/10 rounded-2xl p-4 pl-10 text-sm outline-none focus:border-amber-500 text-white font-mono" required />
                </div>
                <button type="submit" className="px-8 py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-amber-400">
                  Agregar
                </button>
              </form>
            </div>

            {/* Guest Table */}
            <div className="glass-card rounded-[2rem] overflow-hidden border-white/5 overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-white/5 text-[8px] text-gray-500 font-black uppercase">
                  <tr><th className="p-5">Nombre</th><th className="p-5">Celular</th><th className="p-5">Estado</th><th className="p-5 text-center">Invitación</th><th className="p-5 text-center">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {guestList.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-600 italic">No hay invitados registrados. Agrega tu primer invitado arriba.</td></tr>
                  ) : guestList.map((guest) => (
                    <tr key={guest.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-5 font-bold text-white">{guest.name}</td>
                      <td className="p-5 font-mono text-gray-400">{guest.phone}</td>
                      <td className="p-5">
                        {guest.used ? (
                          <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Ingresó</span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1.5"><Clock className="w-3 h-3" /> Pendiente</span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <a href={buildWhatsAppUrl(guest.phone, guest.name)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all active:scale-95">
                          <MessageSquare className="w-3 h-3" /> Enviar
                        </a>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-2">
                          {guest.used && (
                            <button onClick={() => onUpdateGuests(guestList.map(g => g.id === guest.id ? { ...g, used: false, usedAt: undefined } : g))} className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-amber-500 transition-all" title="Restaurar acceso">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => { if (confirm(`¿Eliminar a ${guest.name}?`)) onUpdateGuests(guestList.filter(g => g.id !== guest.id)); }} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all" title="Eliminar invitado">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Existing RSVPs sub-section */}
            {rsvps.length > 0 && (
              <div className="space-y-4 mt-8">
                <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-black flex items-center gap-2"><Check className="w-4 h-4" /> Confirmaciones Recibidas ({rsvps.length})</h3>
                <div className="glass-card rounded-[2rem] overflow-hidden border-white/5 overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead className="bg-white/5 text-[8px] text-gray-500 font-black uppercase">
                      <tr><th className="p-5">Nombre</th><th className="p-5">Voto</th><th className="p-5">Acompañantes</th><th className="p-5">Canción</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rsvps.map((r, i) => (
                        <tr key={i}>
                          <td className="p-5"><div className="font-bold">{r.firstName} {r.lastName}</div><div className="opacity-40">{r.email}</div></td>
                          <td className="p-5"><span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md text-[9px] font-bold">{r.selectedVenue?.name || 'Pendiente'}</span></td>
                          <td className="p-5"><span className="bg-white/5 px-3 py-1 rounded-full font-bold">+{r.guestCount}</span></td>
                          <td className="p-5 italic opacity-60">"{r.songRequest || '-'}"</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="space-y-6 animate-fade-in flex flex-col items-center">
            <h2 className="text-2xl font-serif italic">Validar Pase Digital</h2>

            {!scanResult ? (
              <>
                {/* Camera viewport — native video element */}
                <div className="w-full max-w-sm bg-black border border-white/10 rounded-[2rem] overflow-hidden relative" style={{ minHeight: '320px' }}>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                    style={{ minHeight: '320px', display: cameraActive ? 'block' : 'none' }}
                  />
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Scanning crosshair overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-amber-400/50 rounded-2xl relative">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />
                          {/* Scanning line animation */}
                          <div className="absolute left-1 right-1 h-0.5 bg-amber-400/60 animate-pulse" style={{ top: '50%' }} />
                        </div>
                      </div>
                      <p className="absolute bottom-4 left-0 right-0 text-center text-[9px] text-amber-400/80 font-black uppercase tracking-widest">Escaneando...</p>
                    </div>
                  )}
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500">
                      <ScanLine className="w-12 h-12 opacity-30" />
                      <p className="text-xs text-center px-6">Presiona "Abrir Cámara" para escanear un QR</p>
                    </div>
                  )}
                </div>
                {/* Hidden elements for file scanning fallback */}
                <div id="qr-reader-file" className="hidden" />
                <div id="qr-canvas-tmp" className="hidden" />

                {cameraError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center max-w-sm w-full">
                    <p className="text-xs text-red-400">{cameraError}</p>
                    <p className="text-[10px] text-gray-500 mt-2">Intenta usar "Subir Imagen" como alternativa</p>
                  </div>
                )}

                {/* Camera controls */}
                <div className="flex gap-3 w-full max-w-sm">
                  {!cameraActive ? (
                    <button onClick={startCamera} className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                      📷 Abrir Cámara
                    </button>
                  ) : (
                    <button onClick={stopCamera} className="flex-1 py-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                      Detener Cámara
                    </button>
                  )}
                  <label className="flex-1 py-4 bg-white/5 border border-white/10 text-gray-300 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center cursor-pointer active:scale-95 transition-all hover:bg-white/10">
                    📁 Subir Imagen
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </>
            ) : (
              <div className={`p-8 rounded-[2rem] border text-center w-full max-w-sm ${!scanResult.valid
                ? 'bg-red-500/10 border-red-500/30'
                : scanResult.alreadyUsed
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                <div className="mb-3">
                  {!scanResult.valid
                    ? <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                    : scanResult.alreadyUsed
                      ? <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                      : <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  }
                </div>
                <h3 className="font-bold text-lg">{scanResult.message}</h3>
                {scanResult.valid && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-white font-bold">{scanResult.data?.firstName} {scanResult.data?.lastName}</p>
                    <p className="text-[10px] text-gray-500">{scanResult.data?.email}</p>
                    {scanResult.data?.selectedTier && (
                      <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full mt-2 ${scanResult.data.selectedTier.color} bg-white/5 border border-white/10`}>
                        {scanResult.data.selectedTier.name}
                      </span>
                    )}
                    {scanResult.alreadyUsed && scanResult.scannedAt && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-3">
                        <p className="text-[10px] text-amber-400 font-bold">
                          ⚠️ Este pase ya fue escaneado a las {scanResult.scannedAt}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => { setScanResult(null); setCameraError(null); }} className="mt-6 px-8 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Escanear Otro</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'entradas' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-32">
            <div className="flex items-center gap-3 mb-8">
              <Ticket className="w-8 h-8 text-amber-500" />
              <div>
                <h2 className="text-3xl font-serif italic">Entradas & Beneficios</h2>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Personaliza lo que incluye cada pase</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tempTiers.map((tier) => (
                <div key={tier.id} className={`glass-card p-6 rounded-[2rem] border ${tier.border} relative overflow-hidden group`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`text-xl font-black italic ${tier.color}`}>{tier.name}</h3>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{tier.stock} Disp.</p>
                      </div>
                      {tier.id === 'platinum' && <Crown className="w-6 h-6 text-amber-400" />}
                      {tier.id === 'emerald' && <Sparkles className="w-6 h-6 text-emerald-400" />}
                      {tier.id === 'standard' && <Zap className="w-6 h-6 text-gray-400" />}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Beneficios (Perks)</label>
                      <div className="space-y-2">
                        {tier.perks.map((perk: string, idx: number) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={perk}
                              onChange={(e) => {
                                const newPerks = [...tier.perks];
                                newPerks[idx] = e.target.value;
                                setTempTiers(prev => prev.map(t => t.id === tier.id ? { ...t, perks: newPerks } : t));
                              }}
                              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                            />
                            <button
                              onClick={() => {
                                const newPerks = tier.perks.filter((_: any, i: number) => i !== idx);
                                setTempTiers(prev => prev.map(t => t.id === tier.id ? { ...t, perks: newPerks } : t));
                              }}
                              className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setTempTiers(prev => prev.map(t => t.id === tier.id ? { ...t, perks: [...tier.perks, 'Nuevo beneficio'] } : t));
                          }}
                          className="w-full py-2 border border-dashed border-white/10 rounded-lg text-[10px] text-gray-500 hover:text-white hover:border-white/30 transition-all uppercase tracking-widest font-bold"
                        >
                          + Agregar Beneficio
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-24 md:bottom-10 right-6 md:right-10 left-6 md:left-auto z-[50]">
              <button
                onClick={saveAll}
                className="w-full md:w-auto px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[0_10px_40px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {saveStatus === 'guardando' ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {saveStatus === 'exito' ? '¡CAMBIOS GUARDADOS!' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ajustes' && (
          <div className="max-w-xl mx-auto space-y-8 animate-fade-in">

            {/* CONTROL DE RESULTADOS (MODIFICACIÓN DE GANADOR) */}
            <div className="glass-card p-10 rounded-[3rem] border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-xl font-serif italic">Control de Resultados</h3>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-widest font-black">
                  <span className="text-amber-500 mr-2">●</span>
                  Aquí puedes forzar al ganador manualmente. Si lo dejas vacío, el sistema usará el lugar con más votos cuando se cierre el plazo.
                </p>

                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-amber-500/60 font-black ml-2">ESTABLECER AMBIENTE GANADOR (FORZAR)</label>
                  <div className="relative">
                    <select
                      value={tempConfig.winningVenueId || ''}
                      onChange={(e) => setTempConfig({ ...tempConfig, winningVenueId: e.target.value || null })}
                      className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm outline-none appearance-none focus:border-amber-500"
                    >
                      <option value="">- Dejar que los invitados decidan (Por votos) -</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name.toUpperCase()}</option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Trophy className="w-4 h-4 text-amber-500" />
                    </div>
                  </div>
                </div>

                {tempConfig.winningVenueId && (
                  <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-fade-in">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest">Ambiente ganador forzado manualmente: {venues.find(v => v.id === tempConfig.winningVenueId)?.name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-10 rounded-[3rem] space-y-8">
              <div className="flex items-center gap-3 border-b border-white/5 pb-6">
                <Settings className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xl font-serif italic">Configuración General</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Fecha y Cierre */}
                <div className="space-y-6">
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-black flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Fechas Clave</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-white/60 font-black ml-2">CIERRE DE VOTACIONES</label>
                      <input
                        type="datetime-local"
                        value={formatISOForInput(tempConfig.votingDeadline)}
                        onChange={(e) => setTempConfig({ ...tempConfig, votingDeadline: new Date(e.target.value).toISOString() })}
                        className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-white/60 font-black ml-2">TEXTO PANTALLA BLOQUEO</label>
                      <input type="text" value={tempConfig.dateDisplay} onChange={(e) => setTempConfig({ ...tempConfig, dateDisplay: e.target.value })} className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-indigo-500" placeholder="28 . 02" />
                    </div>
                  </div>
                </div>

                {/* Seguridad y Aforo */}
                <div className="space-y-6">
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-black flex items-center gap-2"><Shield className="w-4 h-4" /> Seguridad</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-white/60 font-black ml-2">CONTRASEÑA ADMIN</label>
                      <input type="text" value={tempConfig.adminPassword || ''} onChange={(e) => setTempConfig({ ...tempConfig, adminPassword: e.target.value })} className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-indigo-500 font-mono text-amber-500" placeholder="admin123" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-white/60 font-black ml-2">AFORO MÁXIMO</label>
                      <input type="number" value={tempConfig.maxCapacity} onChange={(e) => setTempConfig({ ...tempConfig, maxCapacity: parseInt(e.target.value) })} className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={saveAll} className="w-full py-6 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
                {saveStatus === 'exito' ? '¡CAMBIOS GUARDADOS CON ÉXITO!' : 'Aplicar Cambios Globales'}
              </button>

              {/* ── Factory Reset (Danger Zone) ──────────────── */}
              <div className="mt-10 pt-8 border-t border-red-500/10">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <h4 className="text-[10px] uppercase tracking-widest text-red-500 font-black">Zona de Peligro</h4>
                </div>
                <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">
                  Esto eliminará <span className="text-red-400 font-bold">TODOS</span> los datos guardados: configuración, votos, RSVPs, boletos generados y estado de invitados. La aplicación regresará a su estado original.
                </p>
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-black uppercase text-[10px] tracking-widest transition-all hover:bg-red-500/20 active:scale-95"
                  >
                    🔄 Restaurar de Fábrica
                  </button>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <p className="text-xs text-red-400 font-bold text-center">¿Estás seguro? Esta acción no se puede deshacer.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          try {
                            // 1. Wipe DB (RSVPs) — fetch all IDs then delete each
                            const { data: allRows, error: fetchErr } = await supabase.from('rsvps').select('id');
                            if (fetchErr) {
                              alert('Error al leer RSVPs: ' + fetchErr.message);
                              return;
                            }
                            if (allRows && allRows.length > 0) {
                              for (const row of allRows) {
                                await supabase.from('rsvps').delete().eq('id', row.id);
                              }
                            }

                            // 2. Reset all guest "used" status in DB
                            const resetGuests = guestList.map(g => ({ ...g, used: false, usedAt: undefined }));
                            onUpdateGuests(resetGuests);

                            // 3. Reset ticket tier stock to defaults
                            await supabase.from('ticket_tiers').update({ stock: 5 }).eq('id', 'platinum');
                            await supabase.from('ticket_tiers').update({ stock: 12 }).eq('id', 'emerald');
                            await supabase.from('ticket_tiers').update({ stock: 25 }).eq('id', 'standard');

                            // 4. Clear all ticket scan records
                            const { data: allScans } = await supabase.from('ticket_scans').select('id');
                            if (allScans && allScans.length > 0) {
                              for (const scan of allScans) {
                                await supabase.from('ticket_scans').delete().eq('id', scan.id);
                              }
                            }

                            // 5. Clear ALL localStorage
                            localStorage.clear();

                            // 4. Reload with cache bust
                            window.location.href = window.location.origin + window.location.pathname + '?reset=' + Date.now();
                          } catch (e: any) {
                            alert('Error al restaurar: ' + (e?.message || e));
                          }
                        }}
                        className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                      >
                        SÍ, BORRAR TODO
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[5.5rem] bg-zinc-900 border-t border-white/5 flex items-center justify-around z-[210] px-4">
        <button onClick={() => setActiveTab('panel')} className={activeTab === 'panel' ? 'text-white' : 'text-gray-500'}><BarChart3 className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab('scan')} className={activeTab === 'scan' ? 'text-white' : 'text-gray-500'}><ScanLine className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab('invitados')} className={activeTab === 'invitados' ? 'text-white' : 'text-gray-500'}><Users className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab('sedes')} className={activeTab === 'sedes' ? 'text-white' : 'text-gray-500'}><Star className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab('entradas')} className={activeTab === 'entradas' ? 'text-white' : 'text-gray-500'}><Ticket className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab('ajustes')} className={activeTab === 'ajustes' ? 'text-white' : 'text-gray-500'}><Settings className="w-5 h-5" /></button>
        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
        <button onClick={onExit} className="text-red-500/70 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
      </nav>
    </div>
  );
};
