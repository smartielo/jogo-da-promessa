// src/app/sala/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ref, onValue, off, update } from 'firebase/database'; // Adicionámos o update
import { db } from '../../../lib/firebase';
import { Sala } from '../../../types/game';
import { criarBaralho, embaralhar, distribuirCartas } from '../../../utils/engine'; // O nosso motor

export default function SalaDeJogo() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Pega os dados da URL (ex: /sala/-Nabc123?jogadorId=host)
  const salaId = params.id as string;
  const jogadorId = searchParams.get('jogadorId');

  const [sala, setSala] = useState<Sala | null>(null);

  useEffect(() => {
    if (!salaId) return;

    // Aponta para a sala específica no banco de dados
    const salaRef = ref(db, `salas/${salaId}`);

    // O onValue é o "Ouvinte" em tempo real. Qualquer mudança no banco atualiza o React na mesma hora!
    const unsubscribe = onValue(salaRef, (snapshot) => {
      if (snapshot.exists()) {
        setSala(snapshot.val() as Sala);
      } else {
        alert('Sala não encontrada ou foi encerrada.');
      }
    });

    // Limpa o ouvinte quando o jogador sai da página para não vazar memória
    return () => {
      off(salaRef);
      unsubscribe();
    };
  }, [salaId]);

  // Tela de carregamento enquanto busca os dados no Firebase
  if (!sala) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
        <h1 className="text-white text-2xl font-bold animate-pulse">Carregando a mesa...</h1>
      </div>
    );
  }

  // Descobre quem é o jogador atual olhando para o dicionário de jogadores
  const jogadorAtual = sala.jogadores[jogadorId || ''];
  
  // Para simplificar agora, vamos assumir que o "host" (quem criou) é o dono da sala
  const ehHost = jogadorId === 'host'; 

  const iniciarPartida = async () => {
    if (!sala || !salaId) return;

    // 1. Prepara o baralho novo e mistura
    const baralho = criarBaralho();
    const baralhoEmbaralhado = embaralhar(baralho);

    // 2. Obtém os IDs de todos os jogadores sentados à mesa
    const jogadoresIds = Object.keys(sala.jogadores);

    // 3. Usa o motor para cortar e distribuir as cartas
    const { maos, vira, manilha } = distribuirCartas(
      baralhoEmbaralhado,
      jogadoresIds,
      sala.rodadaAtual
    );

    // 4. Prepara a atualização atómica para o Firebase
    // Usamos um objeto de dicionário para atualizar caminhos específicos
    const atualizacoes: Record<string, any> = {
      status: 'apostando', // Muda o ecrã de 'aguardando' para a fase de promessas
      vira: vira,
      manilha: manilha // Guardamos a manilha para a interface saber facilmente
    };

    // 5. Injeta as cartas novas na mão de cada jogador no objeto de atualização
    jogadoresIds.forEach(id => {
      atualizacoes[`jogadores/${id}/cartas`] = maos[id];
      atualizacoes[`jogadores/${id}/promessa`] = null; // Limpa a aposta da rodada anterior
      atualizacoes[`jogadores/${id}/vazasGanhas`] = 0; // Limpa as vazas ganhas
    });

    // 6. Envia tudo para o Firebase de uma só vez
    try {
      await update(ref(db, `salas/${salaId}`), atualizacoes);
    } catch (error) {
      console.error("Erro ao distribuir as cartas:", error);
      alert("Ocorreu um erro ao iniciar a partida.");
    }
  };

  return (
    <main className="min-h-screen bg-red-800 p-4 flex flex-col items-center">
      
      {/* Cabeçalho Superior */}
      <header className="w-full max-w-5xl bg-white/10 backdrop-blur-md p-4 rounded-xl flex justify-between items-center text-white shadow-lg mb-8">
        <div>
          <h2 className="text-2xl font-black italic">A PROMESSA</h2>
          <p className="text-sm opacity-90 mt-1">
            Código da Sala: <span className="font-mono bg-black/30 px-2 py-1 rounded select-all">{salaId}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{jogadorAtual?.nome}</p>
          <p className="text-sm text-red-200 font-bold">Vidas: {jogadorAtual?.vidas}</p>
        </div>
      </header>

      {/* A Mesa Central (Com o formato oval inspirado em jogos de cartas) */}
      <div className="flex-1 w-full max-w-5xl bg-red-700 rounded-[100px] border-[12px] border-red-900 shadow-2xl relative flex items-center justify-center p-8">
        
        {sala.status === 'aguardando' ? (
          <div className="text-center bg-black/40 p-8 rounded-3xl backdrop-blur-sm">
            <h3 className="text-3xl text-white font-bold mb-2">Aguardando jogadores...</h3>
            <p className="text-red-200 mb-8 text-lg">Envie o código da sala para seus amigos.</p>
            
            {/* Apenas quem criou a sala vê o botão de começar */}
            {ehHost ? (
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-10 rounded-xl text-xl shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-2 active:shadow-none transition-all">
                Distribuir Cartas e Começar
              </button>
            ) : (
              <p className="text-yellow-400 font-bold animate-pulse">Aguardando o host iniciar a partida...</p>
            )}
          </div>
        ) : (
          <div className="text-white text-2xl font-bold">A partida começou!</div>
        )}

      </div>

      {/* Lobby: Lista de quem já entrou na sala */}
      <div className="w-full max-w-5xl mt-8 flex flex-wrap justify-center gap-4">
        {Object.values(sala.jogadores).map((jog) => (
          <div key={jog.id} className="bg-white px-6 py-3 rounded-full shadow-lg text-center flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
            <p className="font-bold text-gray-800 text-lg">
              {jog.nome} {jog.id === jogadorId ? <span className="text-red-500 text-sm">(Você)</span> : ''}
            </p>
          </div>
        ))}
      </div>

    </main>
  );
}