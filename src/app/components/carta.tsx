// src/components/Carta.tsx
import { Carta as CartaType } from '../../types/game';

interface CartaProps {
  carta?: CartaType;
  virada?: boolean; // Se true, mostra as costas da carta
  onClick?: () => void;
  className?: string; // Para passarmos classes extras do Tailwind (ex: rotação)
}

const naipeSimbolo = {
  copas: '♥',
  ouros: '♦',
  espadas: '♠',
  paus: '♣'
};

const naipeCor = {
  copas: 'text-red-600',
  ouros: 'text-red-600',
  espadas: 'text-black',
  paus: 'text-black'
};

export default function Carta({ carta, virada = false, onClick, className = '' }: CartaProps) {
  // Se a carta estiver virada (ou se não passarmos a carta), renderiza o Verso
  if (virada || !carta) {
    return (
      <div 
        onClick={onClick}
        className={`w-20 h-32 md:w-24 md:h-36 bg-red-700 rounded-xl border-[4px] border-white shadow-[2px_4px_6px_rgba(0,0,0,0.3)] flex items-center justify-center cursor-pointer transition-transform hover:-translate-y-2 ${className}`}
      >
        {/* Arte do verso da carta (inspirada na logo central) */}
        <div className="w-14 h-20 md:w-16 md:h-24 bg-red-800 rounded-full flex items-center justify-center border-2 border-white/50 transform -skew-x-6">
          <span className="text-white font-black italic text-sm md:text-md transform rotate-[-20deg]">P</span>
        </div>
      </div>
    );
  }

  // Se não, renderiza a Frente da Carta
  const cor = naipeCor[carta.naipe];
  const simbolo = naipeSimbolo[carta.naipe];

  return (
    <div 
      onClick={onClick}
      className={`w-20 h-32 md:w-24 md:h-36 bg-white rounded-xl border border-gray-300 shadow-[2px_4px_6px_rgba(0,0,0,0.3)] flex flex-col justify-between p-2 cursor-pointer transition-transform hover:-translate-y-2 ${className}`}
    >
      {/* Topo Esquerdo */}
      <div className={`flex flex-col items-center leading-none w-fit ${cor}`}>
        <span className="text-lg md:text-xl font-bold">{carta.valor}</span>
        <span className="text-xl md:text-2xl -mt-1">{simbolo}</span>
      </div>

      {/* Centro */}
      <div className={`text-4xl md:text-5xl self-center ${cor}`}>
        {simbolo}
      </div>

      {/* Fundo Direito (Invertido) */}
      <div className={`flex flex-col items-center leading-none w-fit self-end transform rotate-180 ${cor}`}>
        <span className="text-lg md:text-xl font-bold">{carta.valor}</span>
        <span className="text-xl md:text-2xl -mt-1">{simbolo}</span>
      </div>
    </div>
  );
}