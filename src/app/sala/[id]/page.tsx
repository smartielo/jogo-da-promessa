// src/app/sala/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { Sala } from '../../../types/game';
import { criarBaralho, embaralhar, distribuirCartas } from '../../../utils/engine';
import Carta from '../../components/carta';

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
      if (snapshot.exists()) setSala(snapshot.val() as Sala);
      else alert('Sala não encontrada ou foi encerrada.');
    });
    return () => { off(salaRef); unsubscribe(); };
  }, [salaId]);

  if (!sala) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <h1 className="text-emerald-400 text-2xl font-bold animate-pulse">Montando a mesa...</h1>
      </div>
    );
  }

  const jogadorAtual = sala.jogadores[jogadorId || ''];
  const ehHost = jogadorId === 'host'; 

  const iniciarPartida = async () => {
    if (!sala || !salaId) return;
    const baralho = embaralhar(criarBaralho());
    const jogadoresIds = Object.keys(sala.jogadores);
    const { maos, vira, manilha } = distribuirCartas(baralho, jogadoresIds, sala.rodadaAtual);

    const atualizacoes: Record<string, any> = { status: 'apostando', vira, manilha };
    jogadoresIds.forEach(id => {
      atualizacoes[`jogadores/${id}/cartas`] = maos[id];
      atualizacoes[`jogadores/${id}/promessa`] = -1; 
      atualizacoes[`jogadores/${id}/vazasGanhas`] = 0; 
    });

    try { await update(ref(db, `salas/${salaId}`), atualizacoes); } 
    catch (error) { console.error("Erro ao iniciar a partida:", error); }
  };

  const fazerPromessa = async (valor: number) => {
    if (!sala || !salaId || !jogadorId) return;
    const atualizacoes: Record<string, any> = {};
    atualizacoes[`jogadores/${jogadorId}/promessa`] = valor;

    const promessasFeitas = Object.values(sala.jogadores).filter(j => typeof j.promessa === 'number' && j.promessa >= 0).length;
    if (promessasFeitas + 1 === Object.keys(sala.jogadores).length) {
      atualizacoes['status'] = 'jogando';
    }
    try { await update(ref(db, `salas/${salaId}`), atualizacoes); } 
    catch (error) { console.error("Erro ao fazer promessa:", error); }
  };

  const precisaFazerPromessa = sala.status === 'apostando' && (jogadorAtual?.promessa === undefined || jogadorAtual?.promessa === -1);
  const fezPromessa = typeof jogadorAtual?.promessa === 'number' && jogadorAtual.promessa >= 0;

  return (
    <main className="h-screen w-screen bg-slate-900 flex flex-col overflow-hidden text-slate-100 font-sans relative">
      
      {/* CABEÇALHO UNIFICADO E GRUPADO NO CENTRO */}
      <header className="w-full bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center z-20 shadow-md flex-shrink-0">
        
        {/* Container Centralizado com gap fixo */}
        <div className="flex items-center justify-center mx-auto gap-4 md:gap-10 px-4 py-1 bg-slate-900 rounded-full border border-slate-700 shadow-inner">
          
          {/* Bloco Título */}
          <div className="flex flex-col flex-shrink-0 px-2">
            <h1 className="text-xl font-black italic text-emerald-400 leading-tight select-none">A PROMESSA</h1>
            <span className="text-[11px] text-slate-400 font-mono -mt-1 select-all">ID: {salaId}</span>
          </div>

          {/* Divisor Vertical */}
          {sala.status !== 'aguardando' && sala.manilha && (
              <div className="w-px h-8 bg-slate-700" />
          )}

          {/* Bloco Manilha */}
          {sala.status !== 'aguardando' && sala.manilha && (
            <div className="flex items-center gap-1.5 px-2 select-none">
              <span className="text-[11px] text-slate-400 uppercase tracking-widest">Manilha</span>
              <span className="text-xl md:text-2xl font-extrabold text-yellow-400 leading-none">{sala.manilha}</span>
            </div>
          )}

          {/* Divisor Vertical */}
          <div className="w-px h-8 bg-slate-700" />

          {/* Bloco Suas Informações */}
          <div className="flex items-center gap-2 px-1 select-none">
              <div className="text-right flex flex-col items-end leading-tight pr-1">
                  <span className="font-extrabold text-sm md:text-base text-white whitespace-nowrap">{jogadorAtual?.nome}</span>
                  <span className="text-[11px] text-emerald-400 font-bold -mt-0.5">Vidas: {jogadorAtual?.vidas}</span>
              </div>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-700 border border-emerald-400 flex items-center justify-center text-emerald-400 font-bold flex-shrink-0 shadow">
                  {jogadorAtual?.nome[0].toUpperCase()}
              </div>
          </div>

        </div>
      </header>

      {/* ÁREA DA MESA COM GRID PARA EVITAR SOBREPOSIÇÃO */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-2 md:p-6 flex flex-col relative z-0">
        <div className="w-full h-full bg-emerald-800 rounded-[2rem] md:rounded-[4rem] border-[6px] md:border-8 border-slate-700 shadow-inner flex flex-col relative overflow-hidden">

          {sala.status === 'aguardando' ? (
            <div className="m-auto text-center bg-slate-900/60 p-6 md:p-10 rounded-3xl backdrop-blur-md z-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-2">Aguardando jogadores</h3>
              <p className="text-slate-300 mb-6 text-sm md:text-base">A mesa está sendo preparada.</p>
              {ehHost ? (
                <button onClick={iniciarPartida} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-3 px-8 rounded-xl text-lg shadow-[0_4px_0_rgb(4,120,87)] active:translate-y-1 active:shadow-none transition-all">
                  Começar Jogo
                </button>
              ) : (
                <p className="text-emerald-400 font-bold animate-pulse">Aguardando host...</p>
              )}
              <div className="mt-8 flex flex-wrap justify-center gap-2 overflow-y-auto max-h-[150px] p-2">
                {Object.values(sala.jogadores).map((jog) => (
                  <span key={jog.id} className="bg-slate-800 px-3 py-1.5 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 overflow-hidden flex-shrink-0 shadow-md border border-slate-700/50">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="truncate max-w-[100px]">{jog.nome}</span> {jog.id === jogadorId ? <span className="text-emerald-500 font-normal">(Você)</span> : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* O JOGO EM SI DIVIDIDO EM 3 FAIXAS (LINHAS) */
            <div className="flex-1 w-full h-full flex flex-col justify-between p-4 md:p-8 relative">
              
              {/* LINHA 1: OPONENTES (TOPO) */}
              <div className="h-[30%] w-full flex justify-center items-start gap-4 md:gap-16 relative z-0">
                {Object.values(sala.jogadores).filter(j => j.id !== jogadorId).map(oponente => (
                  <div key={oponente.id} className="flex flex-col items-center">
                    <div className="flex justify-center h-20 md:h-28">
                      {oponente.cartas?.map((carta, index) => (
                        <div key={index} className={`transform origin-top scale-[0.55] md:scale-[0.7] ${index > 0 ? '-ml-10 md:-ml-12' : ''}`}>
                          <Carta carta={carta} virada={sala.rodadaAtual !== 1} className="shadow-2xl" />
                        </div>
                      ))}
                    </div>
                    {/* Badge Oponente Simplificada */}
                    <div className="bg-slate-900/80 px-3 py-1 rounded-lg text-center mt-[-10px] md:mt-[-5px] z-10 border border-slate-600/50 shadow-lg">
                      <p className="font-bold text-[10px] md:text-xs leading-tight truncate max-w-[80px] text-white">{oponente.nome}</p>
                      {typeof oponente.promessa === 'number' && oponente.promessa >= 0 ? (
                        <p className="text-yellow-400 text-[9px] md:text-[10px] uppercase font-black">Faz {oponente.promessa}</p>
                      ) : (
                        <p className="text-slate-400 text-[9px] md:text-[10px] uppercase">Pensando...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* LINHA 2: CENTRO DA MESA (VIRA E BARALHO) */}
              <div className="h-[40%] w-full flex items-center justify-center relative z-0">
                <div className="flex items-center gap-4 bg-emerald-900/40 p-3 md:p-6 rounded-[2rem] border border-emerald-700/50 relative">
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-400 font-bold text-[10px] md:text-xs tracking-widest mb-1 md:mb-2 select-none">VIRA</span>
                    <div className="transform scale-75 md:scale-90"><Carta carta={sala.vira!} shadow-xl /></div>
                  </div>
                  <div className="flex flex-col items-center opacity-80">
                    <span className="text-emerald-200 font-bold text-[10px] md:text-xs tracking-widest mb-1 md:mb-2 select-none">MESA</span>
                    <div className="transform scale-75 md:scale-90 relative">
                      <Carta virada={true} className="absolute top-1 left-1 opacity-50" />
                      <Carta virada={true} className="relative z-10 shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* PAINEL DE PROMESSA FLUTUANTE */}
                {precisaFazerPromessa && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-slate-900 p-4 md:p-6 rounded-2xl shadow-2xl border-2 border-yellow-500 flex flex-col items-center gap-3 w-[90%] max-w-[320px] animate-bounce-in">
                    <p className="text-yellow-400 font-black uppercase text-sm md:text-base text-center">Sua vez de prometer</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {Array.from({ length: sala.rodadaAtual + 1 }).map((_, i) => (
                        <button key={i} onClick={() => fazerPromessa(i)} className="w-12 h-12 md:w-14 md:h-14 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-xl rounded-xl shadow-[0_4px_0_rgb(161,98,7)] active:translate-y-1 active:shadow-none transition-all">
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* LINHA 3: SUA MÃO (BASE) - MODIFICADO PARA HORIZONTAL E CORES DO OPONENTE */}
              <div className="h-[30%] w-full flex items-end justify-center relative z-10 mt-auto px-4 pb-2 md:pb-4 gap-4 md:gap-6">
                
                {/* Badge da promessa no LADO ESQUERDO (Ancorado no pé da tela) */}
                {fezPromessa && (
                  <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg text-center border border-slate-600/50 shadow-xl self-end mb-1 md:mb-0">
                    <p className="font-bold text-[10px] md:text-xs text-white">Sua Promessa</p>
                    <p className="text-yellow-400 text-[9px] md:text-[10px] uppercase font-black">Você Faz: {jogadorAtual.promessa}</p>
                  </div>
                )}

                {/* Contêiner das cartas (Abaixado e Centralizado) */}
                <div className="flex justify-center h-24 md:h-36 items-end origin-bottom scale-[0.8] md:scale-100 mt-auto">
                  {jogadorAtual?.cartas?.map((carta, index) => (
                    <div key={index} className={`transform transition-transform hover:-translate-y-4 cursor-pointer ${index > 0 ? '-ml-8 md:-ml-12' : ''}`}>
                      <Carta carta={carta} virada={sala.rodadaAtual === 1} className="shadow-[0_-10px_20px_rgba(0,0,0,0.3)]" />
                    </div>
                  ))}
                </div>

                {/* Placeholder para balancear o Flex no lado direito se necessário (opcional) */}
                {fezPromessa && <div className="w-[80px] hidden md:block" />}

              </div>

            </div>
          )}
        </div>
      </div>
    </main>
  );
}