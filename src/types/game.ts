// src/types/game.ts

export type Naipe = 'paus' | 'copas' | 'espadas' | 'ouros';
export type ValorCarta = '4' | '5' | '6' | '7' | 'Q' | 'J' | 'K' | 'A' | '2' | '3';

export interface Carta {
  valor: ValorCarta;
  naipe: Naipe;
}

export interface Jogador {
  id: string;
  nome: string;
  vidas: number; // Começa com 5 ou o número de cartas da partida
  promessa: number | null; // Quantas vazas disse que vai fazer (null se ainda não escolheu)
  vazasGanhas: number;
  cartas: Carta[]; // A mão atual do jogador
}

export interface Sala {
  status: 'aguardando' | 'distribuindo' | 'apostando' | 'jogando' | 'processando_vaza' | 'fim_rodada';
  rodadaAtual: number; // 1, 2, 3...
  vira: Carta | null; // A carta que define a manilha
  manilha: ValorCarta | null;
  turnoDe: string; // ID do jogador que deve jogar agora
  jogadores: Record<string, Jogador>; // Dicionário de jogadores indexado pelo ID
  mesa: { jogadorId: string; carta: Carta }[]; // Cartas jogadas na vaza atual
  chat?: Record<string, { autor: string; texto: string; timestamp: number }>;
}