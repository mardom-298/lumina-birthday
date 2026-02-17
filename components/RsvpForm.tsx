
import React, { useState, useEffect } from 'react';
import { RsvpData, VenueOption, EventConfig, TicketTier } from '../types';
import { Music, ArrowRight, ArrowLeft, Ticket, Play, X, Sparkles, Trophy, Timer, ShieldAlert, Smartphone, Users, Crown, Zap, Check, Info, AlertCircle, Star, PartyPopper, CheckCircle2 } from 'lucide-react';
import { MiniGame } from './MiniGame';
import { supabase } from '../src/supabaseClient';

interface RsvpFormProps {
  onSubmit: (data: RsvpData) => void;
  onBack: () => void;
  venueOptions: VenueOption[];
  config: EventConfig;
  existingRsvpsCount: number;
  isVotingClosed: boolean;
  initialData?: RsvpData;
}

export const INITIAL_TIERS: TicketTier[] = [
  { id: 'platinum', name: 'PLATINUM VIP', description: 'Acceso total + Barra Libre', stock: 5, color: 'text-amber-400', gradient: 'from-amber-400/20 to-amber-900/40', border: 'border-amber-400/30', perks: ['Barra Libre', 'Zona VIP', 'Meet & Greet'] },
  { id: 'emerald', name: 'EMERALD GUEST', description: 'Acceso Preferencial', stock: 12, color: 'text-emerald-400', gradient: 'from-emerald-400/20 to-emerald-900/40', border: 'border-emerald-400/30', perks: ['Zona Preferencial', 'Welcome Drink'] },
  { id: 'standard', name: 'STANDARD ECHO', description: 'Acceso General', stock: 25, color: 'text-gray-400', gradient: 'from-gray-600/20 to-gray-900/40', border: 'border-white/10', perks: ['Acceso General'] }
];

export const RsvpForm: React.FC<RsvpFormProps> = ({ onSubmit, onBack, venueOptions, config, existingRsvpsCount, isVotingClosed, initialData }) => {
  const winningVenue = config.winningVenueId ? venueOptions.find(v => v.id === config.winningVenueId) : null;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RsvpData>({
    id: initialData?.id,
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    selectedVenue: initialData?.selectedVenue || winningVenue || null,
    selectedTier: initialData?.selectedTier || undefined,
    guestCount: initialData?.guestCount || 0,
    isAttending: initialData?.isAttending ?? true,
    songRequest: initialData?.songRequest || '',
    timestamp: initialData?.timestamp || Date.now()
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [tiers, setTiers] = useState<TicketTier[]>(INITIAL_TIERS);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [tiersLoading, setTiersLoading] = useState(true);

  // Load tiers from Supabase on mount + subscribe to real-time changes
  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const { data, error } = await supabase.from('ticket_tiers').select('*').order('stock', { ascending: true });
        if (error) {
          console.error('Error fetching tiers:', error);
          return; // Keep INITIAL_TIERS as fallback
        }
        if (data && data.length > 0) {
          const tierOrder = ['platinum', 'emerald', 'standard'];
          const sortedData = data.sort((a, b) => tierOrder.indexOf(a.id) - tierOrder.indexOf(b.id));

          setTiers(sortedData.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description || '',
            stock: t.stock,
            color: t.color || 'text-gray-400',
            gradient: t.gradient || 'from-gray-600/20 to-gray-900/40',
            border: t.border || 'border-white/10',
            perks: t.perks || []
          })));
        }
      } catch (e) {
        console.error('Tier fetch exception:', e);
      } finally {
        setTiersLoading(false);
      }
    };
    fetchTiers();

    // Real-time subscription to tier stock changes
    const channel = supabase
      .channel('ticket-tiers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_tiers' }, (payload: any) => {
        const updated = payload.new;
        if (updated) {
          setTiers(prev => {
            const newTiers = prev.map(t => t.id === updated.id ? {
              ...t,
              stock: updated.stock,
              name: updated.name || t.name,
              description: updated.description || t.description,
              perks: updated.perks || t.perks
            } : t);
            // Re-sort just in case
            const tierOrder = ['platinum', 'emerald', 'standard'];
            return newTiers.sort((a, b) => tierOrder.indexOf(a.id) - tierOrder.indexOf(b.id));
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Dynamic total steps based on voting status
  const totalSteps = isVotingClosed ? 6 : 3;

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = "El nombre es obligatorio";
    if (!formData.lastName.trim()) newErrors.lastName = "El apellido es obligatorio";
    if (!formData.email.trim()) newErrors.email = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Ingresa un email válido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field: keyof RsvpData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error on edit
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (!isVotingClosed) {
        // Voting open: step 2 is venue vote
        if (!formData.selectedVenue) return;
        setStep(3); // Go to "vote registered" confirmation
      } else {
        // Voting closed: step 2 is winning venue info (auto-advance)
        setStep(3); // Go to category selection
      }
    } else if (step === 3) {
      if (isVotingClosed) {
        // Category selection → launch game
        if (formData.selectedTier) setShowGame(true);
      }
      // Voting open: step 3 is the final "thanks" screen, no next
    } else if (step === 4) {
      // Acompañantes → resumen
      setStep(5);
    } else if (step === 5) {
      // Resumen → submit
      setStep(6);
    }
  };

  const handlePrevStep = () => {
    if (step === 1) onBack();
    else setStep(step - 1);
  };

  const onGameComplete = async () => {
    setShowGame(false);
    setClaimError(null);

    if (!formData.selectedTier) return;

    // Atomic stock decrement via Supabase RPC
    try {
      const { data, error } = await supabase.rpc('claim_ticket', { tier_id: formData.selectedTier.id });

      if (error) {
        console.error('Claim ticket RPC error:', error);
        setClaimError('Error al reclamar boleto. Intenta de nuevo.');
        return;
      }

      if (data === -1) {
        // Stock ran out while playing the game
        setClaimError(`¡Lo sentimos! Los boletos ${formData.selectedTier.name} se agotaron mientras jugabas. Elige otra categoría.`);
        // Deselect the sold-out tier
        updateField('selectedTier', undefined);
        return;
      }

      // Success! Stock was decremented atomically
      // The real-time subscription will update the UI for everyone else
      setStep(4); // Go to acompañantes
    } catch (e) {
      console.error('Claim ticket exception:', e);
      setClaimError('Error de conexión. Intenta de nuevo.');
    }
  };

  // Submit for voting-only flow
  const handleVoteSubmit = () => {
    const voteData: RsvpData = { ...formData, timestamp: Date.now() };
    onSubmit(voteData);
  };

  // Submit for full ticket flow  
  const handleFinalSubmit = () => {
    setIsProcessing(true);
    const totalTickets = 1 + formData.guestCount;
    const ticketIds = Array.from({ length: totalTickets }).map((_, i) =>
      `LUM-${formData.firstName.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}-${i}`
    );
    const finalData = { ...formData, timestamp: Date.now(), ticketIds };
    setTimeout(() => onSubmit(finalData), 2500);
  };

  if (showGame && formData.selectedTier) {
    const diff = formData.selectedTier.id === 'platinum' ? 'hard' : formData.selectedTier.id === 'emerald' ? 'medium' : 'easy';
    return <MiniGame difficulty={diff} onComplete={onGameComplete} onCancel={() => setShowGame(false)} />;
  }

  if (isProcessing) {
    return (
      <div className="w-full max-w-md mx-auto min-h-[400px] flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/50 animate-pulse">Autenticando Pase Digital...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md md:max-w-5xl mx-auto flex flex-col px-4 pb-12 animate-fade-in">
      {/* Progress Bar */}
      <div className="flex gap-2 mb-8 px-4 max-w-md mx-auto w-full">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= i + 1 ? 'bg-amber-400' : 'bg-white/10'}`}></div>
        ))}
      </div>

      <div className="glass-card rounded-[3.5rem] p-1 flex flex-col relative overflow-hidden shadow-2xl min-h-[550px]">

        {/* ============================================ */}
        {/* STEP 1: Datos Personales (both flows) */}
        {/* ============================================ */}
        {step === 1 && (
          <div className="w-full max-w-2xl mx-auto p-8 sm:p-12 animate-fade-in">
            <h2 className="text-3xl font-serif italic mb-2 text-center">Tu Registro</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4 text-center">TUS DATOS OFICIALES</p>
            <p className="text-[10px] text-gray-500 text-center mb-10 flex items-center justify-center gap-1">
              <span className="text-amber-500">*</span> Campos obligatorios
            </p>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <input type="text" value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} className={`w-full bg-black/40 border ${errors.firstName ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-white/10 focus:border-amber-500'} rounded-2xl py-5 px-6 text-sm text-white outline-none transition-all placeholder-gray-600`} placeholder="Nombre" />
                    <span className="absolute top-3 right-4 text-amber-500 text-xs font-bold">*</span>
                  </div>
                  {errors.firstName && (<div className="flex items-center gap-1.5 px-3"><AlertCircle className="w-3 h-3 text-red-500 shrink-0" /><p className="text-[10px] text-red-500 font-bold">{errors.firstName}</p></div>)}
                </div>
                {/* Apellido */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <input type="text" value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} className={`w-full bg-black/40 border ${errors.lastName ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-white/10 focus:border-amber-500'} rounded-2xl py-5 px-6 text-sm text-white outline-none transition-all placeholder-gray-600`} placeholder="Apellido" />
                    <span className="absolute top-3 right-4 text-amber-500 text-xs font-bold">*</span>
                  </div>
                  {errors.lastName && (<div className="flex items-center gap-1.5 px-3"><AlertCircle className="w-3 h-3 text-red-500 shrink-0" /><p className="text-[10px] text-red-500 font-bold">{errors.lastName}</p></div>)}
                </div>
              </div>
              {/* Email */}
              <div className="space-y-1.5">
                <div className="relative">
                  <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className={`w-full bg-black/40 border ${errors.email ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-white/10 focus:border-amber-500'} rounded-2xl py-5 px-6 text-sm text-white outline-none transition-all placeholder-gray-600`} placeholder="Correo Electrónico" />
                  <span className="absolute top-3 right-4 text-amber-500 text-xs font-bold">*</span>
                </div>
                {errors.email && (<div className="flex items-center gap-1.5 px-3"><AlertCircle className="w-3 h-3 text-red-500 shrink-0" /><p className="text-[10px] text-red-500 font-bold">{errors.email}</p></div>)}
              </div>

              {/* Song Request - Optional */}
              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Music className="w-4 h-4 text-amber-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Tu Canción Infaltable</span>
                  <span className="text-[8px] text-gray-600 italic ml-auto">(opcional)</span>
                </div>
                <input
                  type="text"
                  value={formData.songRequest}
                  onChange={(e) => updateField('songRequest', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-amber-500 rounded-2xl py-5 px-6 text-sm text-white outline-none transition-all placeholder-gray-600"
                  placeholder="Ej: Despacito — Luis Fonsi"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={handlePrevStep} className="p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button onClick={handleNextStep} className="flex-1 bg-white text-black py-5 rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-all">
                {isVotingClosed ? 'Ver Sede Ganadora' : 'Votar por Sede'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 2: Voting Open → Vote for Venue */}
        {/* ============================================ */}
        {step === 2 && !isVotingClosed && (
          <div className="w-full p-8 sm:p-12 flex flex-col animate-fade-in text-center">
            <h2 className="text-3xl font-serif italic mb-2">Tu Voto</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-10">ELIGE EL DESTINO DE LA NOCHE</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {venueOptions.map((venue) => (
                <div
                  key={venue.id}
                  className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer relative group hover:scale-[1.02] ${formData.selectedVenue?.id === venue.id
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_30px_rgba(251,191,36,0.15)]'
                    : 'border-white/5 bg-white/5 hover:border-white/20'
                    }`}
                  onClick={() => updateField('selectedVenue', venue)}
                >
                  <span className="font-bold text-xl text-white block">{venue.name}</span>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2">{venue.vibe}</p>
                  {formData.selectedVenue?.id === venue.id && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-scale-in">
                      <Check className="w-3.5 h-3.5 text-black" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-12 max-w-md mx-auto w-full">
              <button onClick={handlePrevStep} className="p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextStep}
                disabled={!formData.selectedVenue}
                className="flex-1 py-5 bg-white text-black rounded-2xl font-black text-[11px] uppercase disabled:opacity-20 transition-all active:scale-95"
              >
                Registrar Mi Voto
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 3 (Voting Open): Vote Registered! */}
        {/* ============================================ */}
        {step === 3 && !isVotingClosed && (
          <div className="w-full p-8 sm:p-12 flex flex-col items-center text-center animate-fade-in min-h-[450px] justify-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
              <CheckCircle2 className="text-emerald-500 w-10 h-10" />
            </div>
            <h2 className="text-3xl font-serif italic mb-3">¡Voto Registrado!</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-4">
              Gracias, <span className="text-white font-bold">{formData.firstName}</span>. Tu voto por <span className="text-amber-500 font-bold">{formData.selectedVenue?.name}</span> fue registrado con éxito.
            </p>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 max-w-xs mb-10">
              <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">¿Qué sigue?</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Cuando se cierre la votación, vuelve para reclamar tu pase digital y elegir tu categoría de boleto.
              </p>
            </div>
            <button onClick={handleVoteSubmit} className="w-full max-w-xs py-5 bg-white text-black rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-all">
              Entendido
            </button>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 2 (Voting Closed): Winning Venue Info */}
        {/* ============================================ */}
        {step === 2 && isVotingClosed && (
          <div className="w-full p-8 sm:p-12 flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
              <Trophy className="text-amber-500 w-8 h-8" />
            </div>
            <h2 className="text-3xl font-serif italic mb-2">Sede Confirmada</h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-10">EL LUGAR ELEGIDO POR TODOS</p>

            {winningVenue ? (
              <div className={`p-10 rounded-[2.5rem] border border-amber-500 bg-amber-500/10 w-full max-w-sm shadow-[0_0_40px_rgba(251,191,36,0.1)]`}>
                <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-3" />
                <span className="font-bold text-2xl text-white block">{winningVenue.name}</span>
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-2">{winningVenue.vibe}</p>
              </div>
            ) : (
              <div className="p-10 rounded-[2.5rem] border border-white/10 bg-white/5 w-full max-w-sm">
                <span className="font-bold text-xl text-white block">Sede por definir</span>
                <p className="text-[9px] text-gray-500 mt-2">El organizador aún no ha confirmado la sede ganadora.</p>
              </div>
            )}

            <div className="flex gap-4 mt-10 max-w-sm w-full">
              <button onClick={handlePrevStep} className="p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button onClick={handleNextStep} className="flex-1 bg-white text-black py-5 rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-all">
                Elegir Categoría
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 3 (Voting Closed): Category Selection */}
        {/* ============================================ */}
        {step === 3 && isVotingClosed && (
          <div className="w-full p-8 sm:p-12 text-center animate-fade-in">
            <h2 className="text-3xl font-serif italic mb-2">Categoría</h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-6">SELECCIONA TU PASE DIGITAL</p>
            {claimError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3 max-w-xl mx-auto animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-[11px] text-red-400 text-left">{claimError}</p>
              </div>
            )}
            <div className="space-y-4 max-w-xl mx-auto">
              {tiers.map(tier => {
                const isAgotado = tier.stock <= 0;
                const isSelected = formData.selectedTier?.id === tier.id;
                return (
                  <div
                    key={tier.id}
                    onClick={() => !isAgotado && updateField('selectedTier', tier)}
                    className={`p-6 rounded-[2.2rem] border transition-all flex items-center justify-between relative overflow-hidden ${isAgotado
                      ? 'opacity-40 grayscale cursor-not-allowed border-white/5 bg-white/5'
                      : isSelected
                        ? `bg-gradient-to-r ${tier.gradient} ${tier.border} cursor-pointer shadow-lg`
                        : 'bg-white/5 border-white/5 hover:border-white/20 cursor-pointer'
                      }`}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold ${isAgotado ? 'text-gray-500' : tier.color}`}>{tier.name}</h4>
                        {isSelected && !isAgotado && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{tier.description}</p>
                      {tier.perks.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {tier.perks.map((perk, i) => (
                            <span key={i} className="text-[7px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full text-gray-400 uppercase tracking-widest">{perk}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isAgotado ? (
                      <span className="text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest shrink-0">Agotado</span>
                    ) : (
                      <span className={`text-[10px] font-black shrink-0 ${tier.stock <= 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {tier.stock} DISP.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-10 max-w-xl mx-auto">
              <button onClick={handlePrevStep} className="p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5" /></button>
              <button
                onClick={handleNextStep}
                disabled={!formData.selectedTier || formData.selectedTier.stock <= 0}
                className="flex-1 bg-amber-500 text-black py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest disabled:opacity-20 transition-all active:scale-95"
              >
                Desbloquear con Juego
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 4 (Voting Closed): Acompañantes */}
        {/* ============================================ */}
        {step === 4 && isVotingClosed && (
          <div className="w-full p-8 sm:p-12 flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <Check className="text-emerald-500 w-8 h-8" />
            </div>
            <h2 className="text-3xl font-serif italic mb-2">¡Pase Ganado!</h2>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-12">¿VIENES CON ALGUIEN MÁS?</p>
            <div className="flex items-center gap-12 mb-12">
              <button onClick={() => updateField('guestCount', Math.max(0, formData.guestCount - 1))} className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-2xl hover:bg-white/10 transition-all active:scale-95">-</button>
              <span className="text-6xl font-serif italic text-white font-bold">{formData.guestCount}</span>
              <button onClick={() => updateField('guestCount', Math.min(3, formData.guestCount + 1))} className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-2xl hover:bg-white/10 transition-all active:scale-95">+</button>
            </div>
            <p className="text-[10px] text-gray-500 mb-8">Máximo 3 acompañantes adicionales</p>
            <div className="flex gap-4 w-full max-w-xs">
              <button onClick={handlePrevStep} className="p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5" /></button>
              <button onClick={handleNextStep} className="flex-1 py-5 bg-white text-black rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-all">Ver Resumen</button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 5 (Voting Closed): Resumen Final */}
        {/* ============================================ */}
        {step === 5 && isVotingClosed && (
          <div className="w-full p-8 sm:p-12 animate-fade-in text-center">
            <h2 className="text-3xl font-serif italic mb-10">Resumen Final</h2>
            <div className="bg-white/5 p-10 rounded-[2.5rem] mb-10 space-y-4 max-w-md mx-auto">
              <div className="flex justify-between border-b border-white/5 pb-3"><span className="text-[10px] uppercase text-gray-500 font-black">Invitado</span><span className="font-bold">{formData.firstName} {formData.lastName}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-3"><span className="text-[10px] uppercase text-gray-500 font-black">Correo</span><span className="font-bold text-sm truncate ml-4">{formData.email}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-3"><span className="text-[10px] uppercase text-gray-500 font-black">Sede</span><span className="font-bold text-amber-500">{formData.selectedVenue?.name}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-3"><span className="text-[10px] uppercase text-gray-500 font-black">Boleto</span><span className={`font-bold ${formData.selectedTier?.color}`}>{formData.selectedTier?.name}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-3"><span className="text-[10px] uppercase text-gray-500 font-black">Adicionales</span><span className="font-bold">+{formData.guestCount} Persona(s)</span></div>
              {formData.songRequest && (
                <div className="flex justify-between"><span className="text-[10px] uppercase text-gray-500 font-black">Canción</span><span className="font-bold text-sm italic truncate ml-4">"{formData.songRequest}"</span></div>
              )}
            </div>
            <div className="flex gap-4 max-w-md mx-auto">
              <button onClick={handlePrevStep} className="p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5" /></button>
              <button onClick={handleFinalSubmit} className="flex-1 bg-white text-black py-5 rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-all">Emitir Boletos</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
