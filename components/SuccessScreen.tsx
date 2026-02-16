
import React, { useEffect, useState, useRef } from 'react';
import { RsvpData, GeneratedPersona, EventConfig, TicketTier } from '../types';
import { generatePartyPersona } from '../services/geminiService';
import { Share2, Download, Sparkles, Wifi, Music, MapPin, MessageCircle, CheckCircle2, Crown, Zap, LogOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface SuccessScreenProps {
    data: RsvpData;
    config: EventConfig;
    onExit?: () => void;
}

// Logic to get the lowest tier for guests (hardcoded concept based on app logic)
const GUEST_TIER_MOCK: TicketTier = {
    id: 'urban',
    name: 'URBAN ECHO',
    description: 'Acceso General',
    stock: 99,
    color: 'text-gray-200',
    gradient: 'from-gray-600 to-gray-800',
    border: 'border-white/20',
    perks: ['Acceso General']
};

interface TicketCardProps {
    data: RsvpData;
    persona: GeneratedPersona | null;
    guestIndex: number;
    isMainGuest: boolean;
    ticketId: string;
    eventTime: string;
    eventDate: string;
}

const TicketCard: React.FC<TicketCardProps> = ({
    data,
    persona,
    guestIndex,
    isMainGuest,
    ticketId,
    eventTime,
    eventDate
}) => {
    const [qrUrl, setQrUrl] = useState<string>('');

    // Rule: Main guest gets selected tier, guests get Urban Echo (unless selected was Urban Echo)
    const tier = isMainGuest
        ? (data.selectedTier || GUEST_TIER_MOCK)
        : GUEST_TIER_MOCK;

    useEffect(() => {
        QRCode.toDataURL(ticketId, {
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
            width: 200
        }).then(url => setQrUrl(url));
    }, [ticketId]);

    return (
        <div id={`ticket-${guestIndex}`} className={`ticket-node relative w-full aspect-[9/16] bg-black text-white rounded-[2rem] overflow-hidden shadow-2xl border ${tier.border} mb-8 transform transition-all max-w-[320px] mx-auto flex flex-col hover:scale-105 duration-500`}>

            {/* Holographic Mesh Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-20`}></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>

            {/* Floating Orbs */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-[60px]"></div>
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-500/10 rounded-full blur-[60px]"></div>

            {/* TOP SECTION: Event Info */}
            <div className="relative z-10 p-6 flex-1 flex flex-col justify-between">
                <div className="flex border-b border-white/10 pb-4 mb-4">
                    <div className="flex-1 border-r border-white/10 pr-4">
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">FECHA</p>
                        <p className="text-sm font-bold text-white uppercase">{eventDate}</p>
                    </div>
                    <div className="flex-1 pl-4">
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">HORA</p>
                        <p className="text-sm font-bold text-white uppercase">{eventTime}</p>
                    </div>
                </div>

                <div className="my-8 text-center relative">
                    {/* Decorative Circle */}
                    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]`}></div>
                    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-dashed border-white/20 rounded-full animate-[spin_15s_linear_infinite_reverse]`}></div>

                    <div className="relative z-10">
                        <p className={`text-[10px] font-black tracking-[0.4em] uppercase mb-2 ${tier.color} opacity-80`}>CATEGORÍA</p>
                        <h2 className={`text-4xl font-serif italic ${tier.color} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-tight`}>
                            {tier.name.split(' ')[0]}<br />
                            <span className="text-2xl">{tier.name.split(' ').slice(1).join(' ')}</span>
                        </h2>
                        {tier.id === 'imperial' && <Crown className="w-6 h-6 text-amber-400 mx-auto mt-2" />}
                    </div>
                </div>

                <div className="relative">
                    <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1">ASISTENTE</p>
                    {/* Fixed text clipping and wrapping issues here */}
                    <p className="text-lg font-bold text-white uppercase tracking-wide leading-snug break-words whitespace-normal">
                        {isMainGuest ? `${data.firstName} ${data.lastName}` : `Acompañante #${guestIndex}`}
                    </p>
                    {isMainGuest && persona && (
                        <div className="mt-2 text-[10px] text-gray-300 italic opacity-80 border-l-2 border-white/20 pl-3">
                            "{persona.description}"
                        </div>
                    )}
                </div>
            </div>

            {/* MIDDLE: Tear Line */}
            <div className="relative h-6 flex items-center w-full z-10 my-2">
                <div className="w-4 h-8 bg-[#050505] rounded-r-full absolute left-0"></div>
                <div className="w-full border-t-2 border-dashed border-white/20 h-0"></div>
                <div className="w-4 h-8 bg-[#050505] rounded-l-full absolute right-0"></div>
            </div>

            {/* BOTTOM: QR & Details */}
            <div className="relative z-10 p-6 pt-2 bg-black/20 backdrop-blur-sm">
                <div className="flex items-end justify-between gap-4">
                    <div className="bg-white p-2 rounded-xl shrink-0">
                        {qrUrl ? (
                            <img src={qrUrl} alt="QR" className="w-20 h-20 object-contain mix-blend-multiply" />
                        ) : (
                            <div className="w-20 h-20 bg-gray-200 animate-pulse rounded"></div>
                        )}
                    </div>
                    <div className="flex-1 text-right flex flex-col justify-end h-full">
                        <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-1">CÓDIGO ÚNICO</p>
                        <p className="font-mono text-xs text-white tracking-[0.2em]">{ticketId.substring(0, 8).toUpperCase()}</p>
                        <div className="mt-2 flex items-center justify-end gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-wider">VERIFICADO</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-between items-center opacity-40">
                    <span className="text-[7px] font-mono tracking-widest">LUMINA-2026-OFICIAL</span>
                    <span className="text-[7px] font-mono tracking-widest">ACCESO ÚNICO</span>
                </div>
            </div>
        </div>
    );
};

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ data, config, onExit }) => {
    const [persona, setPersona] = useState<GeneratedPersona | null>(null);
    const [loading, setLoading] = useState(true);

    // Check if this is a vote-only submission (no tickets)
    const isVoteOnly = !data.ticketIds || data.ticketIds.length === 0;

    // Use stored ticket IDs if available, otherwise fallback to generated (legacy support)
    const ticketIds = data.ticketIds || [];

    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (!data.isAttending || isVoteOnly) return;
        const fetchPersona = async () => {
            try {
                const result = await generatePartyPersona(data.firstName);
                setPersona(result);
            } catch (e) {
                console.error("AI Error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchPersona();
    }, [data, isVoteOnly]);

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const width = pdf.internal.pageSize.getWidth();
        const height = pdf.internal.pageSize.getHeight();

        try {
            for (let i = 0; i < ticketIds.length; i++) {
                const element = document.getElementById(`ticket-${i}`);
                if (!element) continue;

                if (i > 0) pdf.addPage();

                // Improve capture quality
                const canvas = await html2canvas(element, {
                    scale: 3, // Higher scale for better crispness
                    backgroundColor: '#000000',
                    useCORS: true,
                    logging: false
                });

                const imgData = canvas.toDataURL('image/png');

                // Calculate dimensions to fit nicely centered on A4
                // Ticket is roughly 9/16 aspect ratio.
                const ticketRatio = canvas.width / canvas.height;
                const printWidth = width * 0.6; // Use 60% of page width
                const printHeight = printWidth / ticketRatio;

                const x = (width - printWidth) / 2;
                const y = (height - printHeight) / 2;

                // Add dark background for the page
                pdf.setFillColor(5, 5, 5);
                pdf.rect(0, 0, width, height, 'F');

                pdf.addImage(imgData, 'PNG', x, y, printWidth, printHeight);

                // Add helper text below
                pdf.setTextColor(150, 150, 150);
                pdf.setFontSize(8);
                pdf.text(`Boleto ${i + 1} de ${ticketIds.length} - ${data.firstName} ${data.lastName}`, width / 2, y + printHeight + 10, { align: 'center' });
            }

            pdf.save(`Lumina_Boletos_${data.firstName}.pdf`);
        } catch (err) {
            console.error("Error generating PDF", err);
            alert("Hubo un error generando los boletos. Intenta hacer una captura de pantalla.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleWhatsApp = () => {
        const tierName = data.selectedTier?.name || "General";
        const venueName = data.selectedVenue?.name || "Evento";
        const totalGuests = 1 + data.guestCount;

        const message = `¡Hola! Soy ${data.firstName} ${data.lastName}. Ya tengo mis entradas confirmadas para ${venueName}.\n\n🎫 Mi Boleto: ${tierName}\n👥 Total Personas: ${totalGuests}\n\n¡Nos vemos ahí! 🥂`;

        const url = `https://wa.me/51994126635?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    if (!data.isAttending) {
        return (
            <div className="text-center p-12 glass-card rounded-[3.5rem] max-w-xs mx-auto animate-fade-in-up">
                <h2 className="text-2xl font-serif italic mb-6">¡Gracias por avisar!</h2>
                <p className="text-gray-400 text-sm leading-relaxed">No te preocupes, se te extrañará esta vez. ¡Nos vemos en la siguiente!</p>
            </div>
        );
    }

    // Vote-only screen (voting was open, no tickets yet)
    if (isVoteOnly) {
        return (
            <div className="w-full max-w-sm mx-auto animate-fade-in-up px-4 pb-32">
                <div className="glass-card rounded-[3.5rem] p-10 text-center border border-white/5">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-serif italic mb-3">¡Registro Exitoso!</h2>
                    <p className="text-sm text-gray-400 leading-relaxed mb-2">
                        <span className="text-white font-bold">{data.firstName}</span>, tu voto por <span className="text-amber-500 font-bold">{data.selectedVenue?.name}</span> fue registrado.
                    </p>

                    <div className="my-8 p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-left space-y-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Próximo paso</p>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            Cuando se cierre la votación, vuelve a entrar con tu código para reclamar tu <span className="text-white font-bold">pase digital</span> y elegir tu categoría de boleto.
                        </p>
                    </div>

                    <button
                        onClick={onExit}
                        className="w-full py-5 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[420px] md:max-w-5xl mx-auto animate-fade-in-up px-2 pb-32">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-serif italic mb-2">¡Todo Listo!</h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Aquí tienes tus pases de acceso</p>
            </div>

            <div className="flex flex-col md:flex-row md:items-start gap-8">
                {/* Render Tickets Loop (Grid on Desktop) */}
                <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-2 md:gap-8 flex-1">
                    {ticketIds.map((id, i) => (
                        <TicketCard
                            key={id}
                            ticketId={id}
                            data={data}
                            persona={i === 0 ? persona : null}
                            guestIndex={i === 0 ? 0 : i}
                            isMainGuest={i === 0}
                            eventTime={config.time}
                            eventDate={config.dateDisplay}
                        />
                    ))}
                </div>

                {/* Sidebar Actions on Desktop */}
                <div className="flex flex-col gap-4 md:w-80 md:sticky md:top-8">
                    <div className="bg-zinc-900/80 border border-white/10 rounded-[2rem] p-6 text-center backdrop-blur-md">
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-4">CONFIRMACIÓN RÁPIDA</p>
                        <button
                            onClick={handleWhatsApp}
                            className="w-full py-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-[11px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg mb-3"
                        >
                            <MessageCircle className="w-5 h-5 fill-black" />
                            CONFIRMAR POR WHATSAPP
                        </button>

                        <button
                            onClick={() => window.open(data.selectedVenue?.googleMapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(data.selectedVenue?.name || '')}`, '_blank')}
                            className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all border border-white/10"
                        >
                            <MapPin className="w-4 h-4" />
                            VER UBICACIÓN
                        </button>
                    </div>

                    <div className="flex gap-3 sticky bottom-4 z-50 md:static">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="flex-1 py-5 rounded-2xl bg-white text-black text-[11px] font-black tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50 hover:bg-gray-100"
                        >
                            {isDownloading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {isDownloading ? "GENERANDO PDF..." : "DESCARGAR BOLETOS (PDF)"}
                        </button>
                    </div>

                    {/* Exit Button */}
                    <button
                        onClick={onExit}
                        className="w-full py-4 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/15 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        <LogOut className="w-4 h-4" /> SALIR
                    </button>
                </div>
            </div>
        </div>
    );
};
