// src/app/sala/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { Sala } from '../../../types/game';
import { criarBaralho, embaralhar, distribuirCartas } from '../../../utils/engine';
import Carta from '../../components/carta'; // Importando o componente visual

export default function SalaDeJogo() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const salaId = params.id as string;
  const jogadorId = searchParams.get('jogadorId');

  const [sala, setSala] = useState<Sala | null>(null);

  useEffect(() => {
    if (!salaId) return;

    const salaRef = ref(db, `salas/${salaId}`);

    const unsubscribe = onValue(salaRef, (snapshot) => {
      if (snapshot.exists()) {
        setSala(snapshot.val() as Sala);
      } else {
        alert('Sala não encontrada ou foi encerrada.');
      }
    });

    return () => {
      off(salaRef);
      unsubscribe();
    };
  }, [salaId]);

  if (!sala) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
        <h1 className="text-white text-2xl font-bold animate-pulse">Carregando a mesa...</h1>
      </div>
    );
  }

  const jogadorAtual = sala.jogadores[jogadorId || ''];
  const ehHost = jogadorId === 'host'; 

  const iniciarPartida = async () => {
    if (!sala || !salaId) return;

    const baralho = criarBaralho();
    const baralhoEmbaralhado = embaralhar(baralho);
    const jogadoresIds = Object.keys(sala.jogadores);

    const { maos, vira, manilha } = distribuirCartas(
      baralhoEmbaralhado,
      jogadoresIds,
      sala.rodadaAtual
    );

    const atualizacoes: Record<string, any> = {
      status: 'apostando', 
      vira: vira,
      manilha: manilha 
    };

    jogadoresIds.forEach(id => {
      atualizacoes[`jogadores/${id}/cartas`] = maos[id];
      atualizacoes[`jogadores/${id}/promessa`] = null; 
      atualizacoes[`jogadores/${id}/vazasGanhas`] = 0; 
    });

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
            Código: <span className="font-mono bg-black/30 px-2 py-1 rounded select-all">{salaId}</span>
          </p>
        </div>
        {sala.status !== 'aguardando' && sala.manilha && (
            <div className="text-center bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-bold shadow-md">
                <p className="text-xs uppercase tracking-widest">Manilha</p>
                <p className="text-2xl">{sala.manilha}</p>
            </div>
        )}
        <div className="text-right">
          <p className="font-bold text-lg">{jogadorAtual?.nome}</p>
          <p className="text-sm text-red-200 font-bold">Vidas: {jogadorAtual?.vidas}</p>
        </div>
      </header>

      {/* A Mesa Central Oval */}
      <div className="flex-1 w-full max-w-5xl bg-red-700 rounded-[100px] border-[12px] border-red-900 shadow-2xl relative flex items-center justify-center p-8 min-h-[400px]">
        
        {sala.status === 'aguardando' ? (
          <div className="text-center bg-black/40 p-8 rounded-3xl backdrop-blur-sm z-10">
            <h3 className="text-3xl text-white font-bold mb-2">Aguardando jogadores...</h3>
            <p className="text-red-200 mb-8 text-lg">Envie o código da sala para seus amigos.</p>
            
            {ehHost ? (
              <button 
                onClick={iniciarPartida} // Adicionado o evento onClick aqui!
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-10 rounded-xl text-xl shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-2 active:shadow-none transition-all"
              >
                Distribuir Cartas e Começar
              </button>
            ) : (
              <p className="text-yellow-400 font-bold animate-pulse">Aguardando o host iniciar a partida...</p>
            )}
          </div>
        ) : (
          /* ===== A MESA DURANTE O JOGO ===== */
          <>
            {/* Oponentes (Topo da mesa) */}
            <div className="absolute top-8 left-0 w-full flex justify-center gap-6 md:gap-12 px-8">
              {Object.values(sala.jogadores)
                .filter(j => j.id !== jogadorId) // Filtra para não mostrar você mesmo aqui
                .map(oponente => (
                  <div key={oponente.id} className="flex flex-col items-center">
                    {/* Leque de cartas do oponente */}
                    <div className="flex justify-center" style={{ marginLeft: (oponente.cartas?.length || 0) > 1 ? '20px' : '0' }}>
                      {oponente.cartas?.map((carta, index) => (
                        <Carta 
                          key={index} 
                          carta={carta} 
                          // A Mágica: Se for rodada 1, vemos a carta deles! Senão, vemos as costas.
                          virada={sala.rodadaAtual !== 1} 
                          className="scale-75 -ml-10 first:ml-0 shadow-xl"
                        />
                      ))}
                    </div>
                    <span className="bg-black/60 text-white px-4 py-1 rounded-full text-xs mt-2 font-bold shadow-md whitespace-nowrap">
                      {oponente.nome} <span className="text-red-400">❤ {oponente.vidas}</span>
                    </span>
                  </div>
              ))}
            </div>

            {/* Centro da Mesa (Vira e Baralho) */}
            <div className="flex flex-col items-center gap-6 z-0">
              {sala.vira && (
                <div className="flex items-center gap-4 md:gap-8 bg-black/20 p-5 rounded-3xl">
                  <div className="text-center flex flex-col items-center">
                    <p className="text-yellow-400 font-black mb-1 tracking-widest text-xs">VIRA</p>
                    <Carta carta={sala.vira} className="scale-90 md:scale-100 shadow-lg" />
                  </div>
                  <div className="text-center flex flex-col items-center opacity-80">
                    <p className="text-white font-black mb-1 tracking-widest text-xs">BARALHO</p>
                    <div className="relative">
                      <Carta virada={true} className="scale-90 md:scale-100 absolute top-1 left-1 opacity-40" />
                      <Carta virada={true} className="scale-90 md:scale-100 relative z-10 shadow-lg" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Jogador Atual (Base da mesa) */}
            <div className="absolute -bottom-10 left-0 w-full flex flex-col items-center z-10">
              <div className="flex gap-1 justify-center" style={{ marginLeft: (jogadorAtual?.cartas?.length || 0) > 1 ? '30px' : '0' }}>
                {jogadorAtual?.cartas?.map((carta, index) => (
                  <Carta 
                    key={index} 
                    carta={carta} 
                    // A Mágica Inversa: Se for rodada 1, sua própria carta fica virada para baixo!
                    virada={sala.rodadaAtual === 1} 
                    className={`transform transition-transform cursor-pointer shadow-2xl scale-110 md:scale-125 ${
                        (jogadorAtual.cartas?.length || 0) > 1 ? '-ml-8 first:ml-0' : ''
                    } hover:-translate-y-6`}
                  />
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Lobby: Lista de quem já entrou (Só mostra no modo aguardando) */}
      {sala.status === 'aguardando' && (
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
      )}

    </main>
  );
}