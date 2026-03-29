import { Carta, Naipe, ValorCarta } from '../types/game';

// A ordem base de força (do mais fraco para o mais forte)
export const ORDEM_VALORES: ValorCarta[] = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
export const NAIPES: Naipe[] = ['ouros', 'espadas', 'copas', 'paus']; // Do mais fraco pro mais forte no desempate da manilha

/**
 * Cria um baralho novo de 40 cartas (sem 8, 9, 10 e coringas)
 */
export function criarBaralho(): Carta[] {
  const baralho: Carta[] = [];

  for (const naipe of NAIPES) {
    for (const valor of ORDEM_VALORES) {
      baralho.push({ valor, naipe });
    }
  }

  return baralho;
}

/**
 * Embaralha um array de cartas usando o algoritmo de Fisher-Yates.
 * Retorna um novo array para não mutar o estado original (boa prática no React).
 */
export function embaralhar(baralho: Carta[]): Carta[] {
  // Cria uma cópia do baralho para manter a imutabilidade
  const baralhoEmbaralhado = [...baralho];

  for (let i = baralhoEmbaralhado.length - 1; i > 0; i--) {
    // Sorteia um índice aleatório entre 0 e i
    const j = Math.floor(Math.random() * (i + 1));
    
    // Troca os elementos de lugar
    [baralhoEmbaralhado[i], baralhoEmbaralhado[j]] = [baralhoEmbaralhado[j], baralhoEmbaralhado[i]];
  }

  return baralhoEmbaralhado;
}

/**
 * Descobre qual é o valor da manilha baseada na carta Vira.
 * Usa o operador de módulo (%) para criar um ciclo circular (se o vira for 3, a manilha é 4).
 */
export function obterValorManilha(vira: Carta): ValorCarta {
  const indexVira = ORDEM_VALORES.indexOf(vira.valor);
  
  // O módulo garante que se o index + 1 for igual ao tamanho do array, ele volta pro zero.
  const indexManilha = (indexVira + 1) % ORDEM_VALORES.length;
  
  return ORDEM_VALORES[indexManilha];
}

/**
 * Distribui as cartas para os jogadores e define o Vira da rodada.
 * Retorna um objeto com o novo estado, mantendo os princípios de funções puras.
 */
export function distribuirCartas(
  baralhoEmbaralhado: Carta[],
  jogadoresIds: string[],
  rodadaAtual: number
) {
  const maos: Record<string, Carta[]> = {};
  let ponteiroBaralho = 0;

  // 1. Dá as cartas para cada jogador (a quantidade de cartas = número da rodada)
  jogadoresIds.forEach((id) => {
    maos[id] = [];
    for (let i = 0; i < rodadaAtual; i++) {
      maos[id].push(baralhoEmbaralhado[ponteiroBaralho]);
      ponteiroBaralho++;
    }
  });

  // 2. A próxima carta do baralho vira a carta do centro (o Vira)
  const vira = baralhoEmbaralhado[ponteiroBaralho];
  ponteiroBaralho++;

  // 3. (Opcional) Guardamos o que sobrou do baralho
  const baralhoRestante = baralhoEmbaralhado.slice(ponteiroBaralho);

  return { 
    maos, 
    vira, 
    manilha: obterValorManilha(vira),
    baralhoRestante 
  };
}

/**
 * Analisa as cartas jogadas na mesa e determina o ID do jogador vencedor da vaza.
 * Regras: Manilha vence carta normal. Empate de manilha é resolvido pelo naipe.
 */
export function determinarVencedorVaza(
  mesa: { jogadorId: string; carta: Carta }[],
  valorManilha: ValorCarta
): string | null {
  if (mesa.length === 0) return null;

  // Assumimos que a primeira carta jogada é a vencedora até que se prove o contrário
  let jogadaVencedora = mesa[0];

  for (let i = 1; i < mesa.length; i++) {
    const jogadaAtual = mesa[i];

    const atualEhManilha = jogadaAtual.carta.valor === valorManilha;
    const vencedoraEhManilha = jogadaVencedora.carta.valor === valorManilha;

    if (atualEhManilha && !vencedoraEhManilha) {
      // Se a carta atual é manilha e a que estava ganhando não era, a atual assume a liderança
      jogadaVencedora = jogadaAtual;
      
    } else if (atualEhManilha && vencedoraEhManilha) {
      // Ambas são manilhas! Desempate pela força do naipe (Paus > Copas > Espadas > Ouros)
      // Como nosso array NAIPES está ordenado do mais fraco pro mais forte, quem tiver o maior index ganha.
      const forcaNaipeAtual = NAIPES.indexOf(jogadaAtual.carta.naipe);
      const forcaNaipeVencedora = NAIPES.indexOf(jogadaVencedora.carta.naipe);
      
      if (forcaNaipeAtual > forcaNaipeVencedora) {
        jogadaVencedora = jogadaAtual;
      }
      
    } else if (!atualEhManilha && !vencedoraEhManilha) {
      // Nenhuma das duas é manilha. Comparação normal pela força da carta.
      const forcaAtual = ORDEM_VALORES.indexOf(jogadaAtual.carta.valor);
      const forcaVencedora = ORDEM_VALORES.indexOf(jogadaVencedora.carta.valor);
      
      if (forcaAtual > forcaVencedora) {
        jogadaVencedora = jogadaAtual;
      }
      // Nota: Em caso de empate de cartas normais (ex: dois '3'), a lógica mantém o primeiro que jogou como vencedor.
    }
  }

  return jogadaVencedora.jogadorId;
}