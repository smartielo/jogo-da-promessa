// src/app/sala/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ref, onValue, off, update, push } from 'firebase/database';
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
  const [novaMensagem, setNovaMensagem] = useState('');
  const [chatAbertoMobile, setChatAbertoMobile] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Sincronização com Firebase
  useEffect(() => {
    if (!salaId) return;
    const salaRef = ref(db, `salas/${salaId}`);
    const unsubscribe = onValue(salaRef, (snapshot) => {
      if (snapshot.exists()) setSala(snapshot.val() as Sala);
      else alert('Sala não encontrada ou foi encerrada.');
    });
    return () => { off(salaRef); unsubscribe(); };
  }, [salaId]);

  // 2. Scroll automático do chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sala?.chat]);

  // 3. MOTOR DO JOGO: Transição de Vaza (CORRIGIDO PARA EVITAR ERRO DE SIZE)
  useEffect(() => {
    const statusAtual = sala?.status;
    
    if (statusAtual === 'processando_vaza' && jogadorId === 'host') {
      const timer = setTimeout(async () => {
        // Limpa a mesa e volta para o status de jogo
        // A lógica de pontuação real faremos na próxima sessão
        await update(ref(db, `salas/${salaId}`), {
          mesa: [],
          status: 'jogando'
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sala?.status, salaId, jogadorId]); // Lista de dependências agora é estável (sempre 3 itens)

  if (!sala) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <h1 className="text-emerald-400 text-2xl font-bold animate-pulse">Montando a mesa...</h1>
      </div>
    );
  }

  const jogadorAtual = sala.jogadores[jogadorId || ''];
  const ehHost = jogadorId === 'host'; 

  // --- FUNÇÕES DE AÇÃO ---
  const iniciarPartida = async () => {
    if (!sala || !salaId) return;
    const baralho = embaralhar(criarBaralho());
    const jogadoresIds = Object.keys(sala.jogadores);
    const { maos, vira, manilha } = distribuirCartas(baralho, jogadoresIds, sala.rodadaAtual);

    const atualizacoes: Record<string, any> = { 
      status: 'apostando', 
      vira, 
      manilha,
      mesa: [],
      turnoDe: jogadoresIds[0]
    };
    
    jogadoresIds.forEach(id => {
      atualizacoes[`jogadores/${id}/cartas`] = maos[id];
      atualizacoes[`jogadores/${id}/promessa`] = -1; 
      atualizacoes[`jogadores/${id}/vazasGanhas`] = 0; 
    });

    try { await update(ref(db, `salas/${salaId}`), atualizacoes); } 
    catch (error) { console.error("Erro ao iniciar:", error); }
  };

  const fazerPromessa = async (valor: number) => {
    if (!sala || !salaId || !jogadorId) return;
    const atualizacoes: Record<string, any> = { [`jogadores/${jogadorId}/promessa`]: valor };
    const promessasFeitas = Object.values(sala.jogadores).filter(j => typeof j.promessa === 'number' && j.promessa >= 0).length;
    if (promessasFeitas + 1 === Object.keys(sala.jogadores).length) atualizacoes['status'] = 'jogando';
    await update(ref(db, `salas/${salaId}`), atualizacoes);
  };

  const jogarCarta = async (indexCarta: number) => {
    if (sala.status !== 'jogando' || sala.turnoDe !== jogadorId || !jogadorAtual?.cartas) return;

    const cartaJogada = jogadorAtual.cartas[indexCarta];
    const novasCartas = [...jogadorAtual.cartas];
    novasCartas.splice(indexCarta, 1);

    const novaMesa = sala.mesa ? [...sala.mesa] : [];
    novaMesa.push({ jogadorId: jogadorId, carta: cartaJogada });

    const jogadoresIds = Object.keys(sala.jogadores);
    const indexAtual = jogadoresIds.indexOf(jogadorId);
    const proximoTurnoDe = jogadoresIds[(indexAtual + 1) % jogadoresIds.length];

    const atualizacoes: Record<string, any> = {
      [`jogadores/${jogadorId}/cartas`]: novasCartas,
      mesa: novaMesa,
      turnoDe: proximoTurnoDe
    };

    if (novaMesa.length === jogadoresIds.length) atualizacoes['status'] = 'processando_vaza';

    await update(ref(db, `salas/${salaId}`), atualizacoes);
  };

  const copiarLink = () => {
    const urlConvite = `${window.location.origin}/?codigo=${salaId}`;
    navigator.clipboard.writeText(urlConvite);
    alert('Link copiado!');
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim()) return;
    await push(ref(db, `salas/${salaId}/chat`), {
      autor: jogadorAtual?.nome || 'Espectador',
      texto: novaMensagem.trim(),
      timestamp: Date.now()
    });
    setNovaMensagem('');
  };

  const precisaFazerPromessa = sala.status === 'apostando' && (jogadorAtual?.promessa === undefined || jogadorAtual?.promessa === -1);
  const fezPromessa = typeof jogadorAtual?.promessa === 'number' && jogadorAtual.promessa >= 0;
  const isMeuTurno = sala.status === 'jogando' && sala.turnoDe === jogadorId;
  const mensagensChat = sala.chat ? Object.values(sala.chat).sort((a: any, b: any) => a.timestamp - b.timestamp) : [];

  return (
    <main className="h-screen w-screen bg-slate-900 flex flex-col overflow-hidden text-slate-100 font-sans relative">
      
      {/* CABEÇALHO */}
      <header className="w-full bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between z-20 shadow-md flex-shrink-0">
        <div className="flex flex-col flex-shrink-0 px-2 min-w-[150px]">
          <h1 className="text-xl md:text-2xl font-black italic text-emerald-400 leading-tight">A PROMESSA</h1>
          <span className="text-[11px] md:text-xs text-slate-400 font-mono -mt-1 select-all">ID: {salaId}</span>
        </div>

        {sala.status !== 'aguardando' && (
          <div className="flex items-center gap-4 bg-slate-900 px-5 py-2 rounded-2xl border border-slate-700 shadow-inner">
            <div className="text-center text-xs md:text-sm text-slate-400 font-medium">
              Rodada<br/><span className="text-white font-bold text-lg leading-tight">{sala.rodadaAtual}</span>
            </div>
            {sala.manilha && (
              <>
                <div className="w-px h-10 bg-slate-700" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] md:text-xs text-yellow-400/80 uppercase tracking-widest font-bold">Manilha</span>
                  <span className="text-3xl md:text-4xl font-extrabold text-yellow-400 leading-none">{sala.manilha}</span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-5 min-w-[150px] justify-end">
            <div className="flex items-center gap-3 select-none bg-slate-900/60 p-2 pl-4 rounded-full border border-slate-700">
                <div className="text-right flex flex-col items-end leading-tight pr-1">
                    <span className="font-extrabold text-base text-white whitespace-nowrap">{jogadorAtual?.nome}</span>
                    <span className="text-[11px] md:text-xs text-emerald-400 font-black tracking-wider -mt-0.5 flex items-center gap-1">
                      <span className="text-red-400 text-sm">❤</span> {jogadorAtual?.vidas} VIDAS
                    </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-700 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 font-black text-xl flex-shrink-0 shadow-lg">
                    {jogadorAtual?.nome[0].toUpperCase()}
                </div>
            </div>
          <button onClick={() => setChatAbertoMobile(!chatAbertoMobile)} className="lg:hidden bg-slate-700 p-3 rounded-xl active:scale-95">💬</button>
        </div>
      </header>

      {/* CONTAINER PRINCIPAL */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto p-2 md:p-4 flex gap-4 relative z-0 overflow-hidden h-full">
        
        {/* ÁREA DA MESA */}
        <div className="flex-1 h-full bg-emerald-800 rounded-[2rem] md:rounded-[3rem] border-[6px] md:border-8 border-slate-700 shadow-inner flex flex-col relative overflow-hidden transition-all">

          {/* MODAL DE APOSTA (FIXADO NO CANTO DIREITO) */}
          {precisaFazerPromessa && (
            <div className="absolute bottom-10 right-10 z-50 bg-slate-900 p-5 rounded-3xl shadow-2xl border-2 border-yellow-500 flex flex-col items-center gap-3 animate-bounce-in">
              <p className="text-yellow-400 font-black uppercase text-sm">Quantas você faz?</p>
              <div className="flex justify-center gap-2 flex-wrap max-w-[200px]">
                {Array.from({ length: sala.rodadaAtual + 1 }).map((_, i) => (
                  <button key={i} onClick={() => fazerPromessa(i)} className="w-12 h-12 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-xl rounded-xl shadow-[0_4px_0_rgb(161,98,7)] active:translate-y-1 active:shadow-none transition-all">
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sala.status === 'aguardando' ? (
            <div className="m-auto text-center bg-slate-900/70 p-10 rounded-3xl backdrop-blur-md z-10 border border-slate-700/50 shadow-2xl animate-bounce-in">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-white">Lobby da Partida</h3>
              <div className="flex flex-col gap-3 items-center">
                <button onClick={copiarLink} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-3 px-6 rounded-xl border border-emerald-500/30 w-full shadow-md active:scale-95 transition-all">📋 Copiar Link Convite</button>
                {ehHost ? (
                  <button onClick={iniciarPartida} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-4 px-8 rounded-xl text-lg shadow-[0_4px_0_rgb(4,120,87)] active:translate-y-1 active:shadow-none transition-all w-full">Distribuir e Começar</button>
                ) : (
                  <p className="text-yellow-400 font-bold animate-pulse py-2">Aguardando o host iniciar...</p>
                )}
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-2 overflow-y-auto max-h-[150px] p-2 bg-slate-950/30 rounded-2xl">
                {Object.values(sala.jogadores).map((jog) => (
                  <span key={jog.id} className="bg-slate-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-md border border-slate-700/50">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {jog.nome} {jog.id === jogadorId ? <span className="text-emerald-500 font-normal">(Você)</span> : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full h-full flex flex-col justify-between p-4 md:p-8 relative">
              
              {/* OPONENTES */}
              <div className="h-[30%] w-full flex justify-center items-start gap-4 md:gap-16 relative z-0 pt-2">
                {Object.values(sala.jogadores).filter(j => j.id !== jogadorId).map(oponente => (
                  <div key={oponente.id} className="flex flex-col items-center animate-fade-in-up">
                    <div className="flex justify-center h-20 md:h-28">
                      {oponente.cartas?.map((carta, index) => (
                        <div key={index} className={`transform origin-top scale-[0.55] md:scale-[0.7] transition-transform ${index > 0 ? '-ml-10 md:-ml-12' : ''}`}>
                          <Carta carta={carta} virada={sala.rodadaAtual !== 1} className="shadow-2xl" />
                        </div>
                      ))}
                    </div>
                    <div className={`px-3 py-1 rounded-lg border shadow-lg transition-colors ${sala.turnoDe === oponente.id ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-900/80 border-slate-600/50'}`}>
                      <p className="font-bold text-[10px] md:text-xs leading-tight truncate max-w-[80px] text-white">{oponente.nome}</p>
                      <p className="text-yellow-400 text-[9px] md:text-[10px] uppercase font-black">
                        {typeof oponente.promessa === 'number' && oponente.promessa >= 0 ? `Faz ${oponente.promessa}` : 'Pensando...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CENTRO DA MESA */}
              <div className="h-[40%] w-full flex items-center justify-center relative z-0">
                <div className="flex items-center gap-6 md:gap-12 bg-emerald-900/40 p-4 md:p-6 rounded-[2rem] border border-emerald-700/50 relative">
                  <div className="flex flex-col items-center flex-shrink-0 origin-bottom scale-[0.7] md:scale-90 select-none">
                    <span className="text-yellow-400 font-bold text-[10px] md:text-xs tracking-widest mb-1 uppercase">Vira</span>
                    <Carta carta={sala.vira!} shadow-xl />
                  </div>
                  <div className="flex flex-col items-center flex-1 min-w-[120px]">
                    <span className="text-emerald-200 font-bold text-[10px] md:text-xs tracking-widest mb-1 uppercase">Mesa</span>
                    <div className="flex justify-center items-center h-[90px] md:h-[120px] gap-2 md:gap-4 w-full">
                      {!sala.mesa || sala.mesa.length === 0 ? (
                        <div className="w-16 h-24 border-2 border-dashed border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-500/50 text-[10px] text-center p-2">As cartas<br/>caem aqui</div>
                      ) : (
                        sala.mesa.map((jogada, idx) => (
                          <div key={idx} className="flex flex-col items-center transform scale-[0.65] md:scale-90 origin-bottom animate-fade-in-up">
                            <Carta carta={jogada.carta} className="shadow-lg" />
                            <span className="bg-slate-900/90 text-emerald-400 text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 -mb-4 z-10 border border-slate-700 shadow-xl whitespace-nowrap">
                              {sala.jogadores[jogada.jogadorId]?.nome}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SUA MÃO */}
              <div className="h-[30%] w-full flex items-end justify-center relative z-10 mt-auto pb-2 gap-4 md:gap-6">
                {fezPromessa && (
                  <div className="hidden md:block bg-slate-900/80 px-3 py-1.5 rounded-lg text-center border border-slate-600/50 shadow-xl self-end mb-2 animate-fade-in-right">
                    <p className="font-bold text-[10px] md:text-xs text-white">Sua Promessa</p>
                    <p className="text-yellow-400 text-[9px] md:text-[10px] uppercase font-black">Você Faz: {jogadorAtual.promessa}</p>
                  </div>
                )}

                <div className="flex flex-col items-center justify-end h-full w-full max-w-[400px] relative">
                  {sala.status === 'jogando' && (
                    <div className={`absolute -top-10 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-black shadow-lg z-20 whitespace-nowrap transition-colors ${isMeuTurno ? 'bg-emerald-500 text-slate-900 animate-pulse border-2 border-emerald-300' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                      {isMeuTurno ? 'Sua vez de jogar!' : `Vez de ${sala.jogadores[sala.turnoDe]?.nome}...`}
                    </div>
                  )}
                  {sala.status === 'processando_vaza' && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-black shadow-lg z-20 bg-yellow-400 text-slate-900 border-2 border-yellow-200 animate-bounce">
                      Recolhendo cartas...
                    </div>
                  )}
                  <div className="flex justify-center items-end origin-bottom scale-[0.8] md:scale-100 relative mt-auto h-24 md:h-36">
                    {jogadorAtual?.cartas?.map((carta, index) => (
                      <div 
                        key={index} 
                        onClick={() => jogarCarta(index)}
                        className={`transform transition-all ${index > 0 ? '-ml-8 md:-ml-12' : ''} ${isMeuTurno ? 'cursor-pointer hover:-translate-y-6 hover:scale-105' : 'opacity-80'}`}
                      >
                        <Carta carta={carta} virada={sala.rodadaAtual === 1} className={isMeuTurno ? 'shadow-[0_-10px_20px_rgba(4,120,87,0.4)] border-emerald-400 border-2' : 'shadow-2xl'} />
                      </div>
                    ))}
                  </div>
                </div>

                {fezPromessa && (
                  <div className="md:hidden bg-slate-900/80 px-2 py-1 rounded-lg text-center border border-slate-600/50 self-end mb-1">
                    <p className="font-bold text-[9px] text-white">Promessa: {jogadorAtual.promessa}</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* CHAT */}
        <div className={`absolute lg:relative top-0 right-0 h-full w-[85%] sm:w-80 bg-slate-800 rounded-[1.5rem] lg:rounded-[2rem] border-[4px] lg:border-[6px] border-slate-700 flex flex-col shadow-2xl transition-transform z-40 overflow-hidden ${chatAbertoMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
          <div className="bg-slate-900/50 p-4 border-b border-slate-700 font-black text-emerald-400 italic">Chat da Mesa</div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth bg-slate-800">
            {mensagensChat.map((msg: any, i) => (
              <div key={i} className={`flex flex-col ${msg.autor === jogadorAtual?.nome ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                <span className="text-[10px] text-slate-400 mb-0.5 px-1">{msg.autor}</span>
                <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${msg.autor === jogadorAtual?.nome ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-slate-700 text-slate-100 rounded-tl-sm'}`}>{msg.texto}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={enviarMensagem} className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
            <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} placeholder="Digite aqui..." className="flex-1 bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none" />
            <button type="submit" className="bg-emerald-500 text-slate-900 font-black px-4 rounded-lg active:scale-95">➤</button>
          </form>
        </div>

      </div>
    </main>
  );
}