
import React, { useState } from 'react';
import { HelpCircle, X, Touchpad, Vote, Ticket, Smartphone, Clock } from 'lucide-react';
import { AppState } from '../types';

interface GuestHelpProps {
  appState: AppState;
  className?: string;
  isVotingClosed?: boolean;
  hasTickets?: boolean;
}

export const GuestHelp: React.FC<GuestHelpProps> = ({ appState, className, isVotingClosed, hasTickets }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (appState === AppState.ADMIN) return null;

  const getContent = () => {
    switch (appState) {
      case AppState.LOCKED:
        return {
          icon: Touchpad,
          title: "¿Cómo ingresar?",
          text: "Esta es una invitación interactiva. Para acceder, debes mantener presionado el círculo central durante unos segundos hasta que se complete el círculo dorado.",
          tip: "Si estás en celular, usa tu pulgar y no lo sueltes."
        };
      case AppState.INVITATION:
        if (isVotingClosed) {
          return {
            icon: Ticket,
            title: "Sede Confirmada",
            text: "La votación ha terminado y ya tenemos un lugar ganador. Completa tu registro para reclamar tu pase digital.",
            tip: "Selecciona tu categoría de boleto y supera el desafío para obtener tu acceso."
          };
        }
        return {
          icon: Vote,
          title: "Tu Voto Cuenta",
          text: "Aún no hemos decidido el lugar final. Registra tus datos y vota por tu sede favorita. ¡El lugar con más votos será el elegido!",
          tip: "Toca las tarjetas de sedes para ver los videos de cada lugar."
        };
      case AppState.RSVP:
        if (isVotingClosed) {
          return {
            icon: Ticket,
            title: "Registro y Desafío",
            text: "Completa todos los campos obligatorios (*) para continuar. Luego elige tu categoría de boleto y supera el minijuego para reclamar tu pase.",
            tip: "El nombre y correo son obligatorios para validar tu pase en la puerta."
          };
        }
        return {
          icon: Vote,
          title: "Registra y Vota",
          text: "Completa todos los campos obligatorios (*) y luego elige tu sede favorita. Tu voto decidirá el destino de la noche.",
          tip: "El nombre y correo son obligatorios. La canción es opcional pero puede sonar en la fiesta."
        };
      case AppState.SUCCESS:
        if (!hasTickets) {
          return {
            icon: Clock,
            title: "Voto Registrado",
            text: "Tu voto está registrado. Cuando se cierre la votación, vuelve a entrar con tu código de acceso para reclamar tu pase digital.",
            tip: "Guarda tu código de acceso, lo necesitarás para volver."
          };
        }
        return {
          icon: Smartphone,
          title: "Tu Acceso Listo",
          text: "Este es tu pase oficial. Por favor, toma una captura de pantalla o descarga el PDF para mostrarlo en la puerta.",
          tip: "El código QR es único y se validará al ingresar."
        };
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  const Icon = content.icon;

  return (
    <>
      {/* Botón de Ayuda */}
      <button
        onClick={() => setIsOpen(true)}
        className={`absolute z-[60] group flex flex-col items-center justify-center gap-1 transition-all active:scale-95 top-6 right-6 md:fixed md:top-24 md:right-10 ${className || ''}`}
      >
        <div className="relative w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover:text-white group-hover:border-white/30 transition-all">
          <div className="absolute inset-0 bg-white/5 animate-pulse group-hover:hidden rounded-full"></div>
          <HelpCircle className="w-3 h-3" />
        </div>
        <span className="text-[7px] font-black tracking-[0.2em] text-white/40 uppercase block text-center">Ayuda</span>
      </button>

      {/* Modal de Ayuda */}
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-6 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-24 bg-gradient-to-b from-amber-500/10 to-transparent flex items-center justify-center">
              <div className="w-12 h-12 bg-black rounded-full border border-amber-500/30 flex items-center justify-center shadow-xl">
                <Icon className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 text-gray-600 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-10 pt-4 text-center">
              <h3 className="text-xl font-serif italic text-white mb-4">{content.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-8">
                {content.text}
              </p>

              {content.tip && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-8 text-left flex gap-4">
                  <div className="w-1 h-full bg-amber-500/50 rounded-full shrink-0"></div>
                  <p className="text-[11px] text-gray-300 italic">
                    <span className="font-black text-amber-500 not-italic uppercase tracking-widest block mb-1">Dato Pro:</span>
                    {content.tip}
                  </p>
                </div>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
