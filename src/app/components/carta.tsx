// src/components/Carta.tsx
import { Carta as CartaType } from '../../types/game';

interface CartaProps {
  carta?: CartaType;
  virada?: boolean;
  onClick?: () => void;
  className?: string;
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
  espadas: 'text-slate-950', // Preto puro para alto contraste
  paus: 'text-slate-950'
};

export default function Carta({ carta, virada = false, onClick, className = '' }: CartaProps) {
  // Arte do Verso (Blindada)
  if (virada || !carta) {
    return (
      <div 
        onClick={onClick}
        className={`w-20 h-32 md:w-24 md:h-36 bg-slate-950 rounded-xl border-[4px] md:border-[5px] border-white/90 shadow-2xl flex items-center justify-center cursor-pointer transition-all hover:border-emerald-400 ${className}`}
      >
        <div className="w-14 h-20 md:w-16 md:h-24 bg-emerald-900 rounded-full flex items-center justify-center border-2 border-emerald-700 transform -skew-x-6 rotate-[-15deg] shadow-inner">
          <span className="text-emerald-400 font-black italic text-xl md:text-2xl transform rotate-[15deg] select-none">P</span>
        </div>
      </div>
    );
  }

  const cor = naipeCor[carta.naipe];
  const simbolo = naipeSimbolo[carta.naipe];

  // Render da Frente com CSS GRID (Correção Absoluta de Alinhamento)
  return (
    <div 
      onClick={onClick}
      className={`w-20 h-32 md:w-24 md:h-36 bg-white rounded-xl border border-slate-300 shadow-xl cursor-pointer transition-transform hover:-translate-y-2 select-none grid grid-rows-[35px,1fr,35px] grid-cols-1 p-2 ${className}`}
    >
      {/* LINHA 1 DO GRID: Topo Esquerdo */}
      <div className={`flex flex-col items-center leading-none ${cor} self-start justify-self-start h-[35px]`}>
        <span className="text-xl md:text-2xl font-black">{carta.valor}</span>
        <span className="text-xl md:text-2xl -mt-0.5 md:-mt-1">{simbolo}</span>
      </div>

      {/* LINHA 2 DO GRID: Centro Perfeito (Não toca nas linhas 1 e 3) */}
      <div className={`flex items-center justify-center h-full w-full`}>
        {/* Tamanho otimizado para não vazar */}
        <span className={`text-4xl md:text-5xl ${cor} leading-none`}>{simbolo}</span>
      </div>

      {/* LINHA 3 DO GRID: Fundo Direito (Invertido) */}
      <div className={`flex flex-col items-center leading-none ${cor} self-end justify-self-end transform rotate-180 h-[35px]`}>
        <span className="text-xl md:text-2xl font-black">{carta.valor}</span>
        <span className="text-xl md:text-2xl -mt-0.5 md:-mt-1">{simbolo}</span>
      </div>
    </div>
  );
}