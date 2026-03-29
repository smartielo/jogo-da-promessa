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

  useEffect(() => {
    if (!salaId) return;
    const salaRef = ref(db, `salas/${salaId}`);
    const unsubscribe = onValue(salaRef, (snapshot) => {
      if (snapshot.exists()) setSala(snapshot.val() as Sala);
      else alert('Sala não encontrada ou foi encerrada.');
    });
    return () => { off(salaRef); unsubscribe(); };
  }, [salaId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sala?.chat]);

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

  const copiarLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado! Mande para seus amigos no WhatsApp.');
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !salaId) return;
    
    try {
      await push(ref(db, `salas/${salaId}/chat`), {
        autor: jogadorAtual?.nome || 'Espectador',
        texto: novaMensagem.trim(),
        timestamp: Date.now()
      });
      setNovaMensagem('');
    } catch (error) {
      console.error("Erro ao enviar mensagem", error);
    }
  };

  const precisaFazerPromessa = sala.status === 'apostando' && (jogadorAtual?.promessa === undefined || jogadorAtual?.promessa === -1);
  const fezPromessa = typeof jogadorAtual?.promessa === 'number' && jogadorAtual.promessa >= 0;

  const mensagensChat = sala.chat ? Object.values(sala.chat).sort((a: any, b: any) => a.timestamp - b.timestamp) : [];

  return (
    <main className="h-screen w-screen bg-slate-900 flex flex-col overflow-hidden text-slate-100 font-sans relative">
      
      {/* CABEÇALHO */}
      <header className="w-full bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between z-20 shadow-md flex-shrink-0">
        
        <div className="flex flex-col flex-shrink-0 px-2">
          <h1 className="text-xl font-black italic text-emerald-400 leading-tight select-none">A PROMESSA</h1>
          <span className="text-[11px] text-slate-400 font-mono -mt-1 select-all">ID: {salaId}</span>
        </div>

        <div className="flex items-center gap-4">
          {sala.status !== 'aguardando' && sala.manilha && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-md border border-slate-700 select-none">
              <span className="text-[11px] text-slate-400 uppercase tracking-widest">Manilha</span>
              <span className="text-xl font-extrabold text-yellow-400 leading-none">{sala.manilha}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-1 select-none bg-slate-900/60 p-1 rounded-full border border-slate-700">
              <div className="text-right flex flex-col items-end leading-tight pr-1">
                  <span className="font-extrabold text-sm text-white whitespace-nowrap">{jogadorAtual?.nome}</span>
                  <span className="text-[11px] text-emerald-400 font-bold -mt-0.5">Vidas: {jogadorAtual?.vidas}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-emerald-400 flex items-center justify-center text-emerald-400 font-bold flex-shrink-0 shadow">
                  {jogadorAtual?.nome[0].toUpperCase()}
              </div>
          </div>

          <button onClick={() => setChatAbertoMobile(!chatAbertoMobile)} className="lg:hidden bg-slate-700 p-2 rounded-lg text-xl border border-slate-600">
            💬
          </button>
        </div>
      </header>

      {/* CONTAINER PRINCIPAL (Mesa Esquerda + Chat Direita) */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto p-2 md:p-4 flex gap-4 relative z-0 overflow-hidden h-full">
        
        {/* === ÁREA DA MESA (Feltro Verde) === */}
        <div className="flex-1 h-full bg-emerald-800 rounded-[2rem] md:rounded-[3rem] border-[6px] md:border-8 border-slate-700 shadow-inner flex flex-col relative overflow-hidden transition-all">

          {sala.status === 'aguardando' ? (
            <div className="m-auto text-center bg-slate-900/70 p-6 md:p-10 rounded-3xl backdrop-blur-md z-10 border border-slate-700/50 shadow-2xl">
              <h3 className="text-2xl md:text-3xl font-bold mb-2">Lobby da Partida</h3>
              <p className="text-slate-300 mb-6 text-sm md:text-base">Aguardando a galera entrar...</p>
              
              <div className="flex flex-col gap-3 items-center">
                <button onClick={copiarLink} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-3 px-6 rounded-xl text-sm md:text-base border border-emerald-500/30 shadow-md active:scale-95 transition-all flex items-center gap-2 w-full justify-center">
                  <span>📋</span> Copiar Link Convite
                </button>

                {ehHost ? (
                  <button onClick={iniciarPartida} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-4 px-8 rounded-xl text-lg shadow-[0_4px_0_rgb(4,120,87)] active:translate-y-1 active:shadow-none transition-all w-full">
                    Distribuir e Começar
                  </button>
                ) : (
                  <p className="text-yellow-400 font-bold animate-pulse py-2">Aguardando o host iniciar...</p>
                )}
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-2 overflow-y-auto max-h-[150px] p-2 bg-slate-950/30 rounded-2xl">
                {Object.values(sala.jogadores).map((jog) => (
                  <span key={jog.id} className="bg-slate-800 px-3 py-1.5 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 shadow-md border border-slate-700/50">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="truncate max-w-[120px]">{jog.nome}</span> {jog.id === jogadorId ? <span className="text-emerald-500 font-normal">(Você)</span> : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* O JOGO EM SI */
            <div className="flex-1 w-full h-full flex flex-col justify-between p-4 relative">
              
              {/* LINHA 1: OPONENTES (TOPO) */}
              <div className="h-[30%] w-full flex justify-center items-start gap-4 md:gap-16 relative z-0 pt-2">
                {Object.values(sala.jogadores).filter(j => j.id !== jogadorId).map(oponente => (
                  <div key={oponente.id} className="flex flex-col items-center">
                    <div className="flex justify-center h-20 md:h-28">
                      {oponente.cartas?.map((carta, index) => (
                        <div key={index} className={`transform origin-top scale-[0.55] md:scale-[0.7] ${index > 0 ? '-ml-10 md:-ml-12' : ''}`}>
                          <Carta carta={carta} virada={sala.rodadaAtual !== 1} className="shadow-2xl" />
                        </div>
                      ))}
                    </div>
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
                <div className="flex items-center gap-4 bg-emerald-900/40 p-4 md:p-6 rounded-[2rem] border border-emerald-700/50 relative">
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-400 font-bold text-[10px] md:text-xs tracking-widest mb-1 select-none">VIRA</span>
                    <div className="transform scale-[0.65] md:scale-90"><Carta carta={sala.vira!} shadow-xl /></div>
                  </div>
                  <div className="flex flex-col items-center opacity-80">
                    <span className="text-emerald-200 font-bold text-[10px] md:text-xs tracking-widest mb-1 select-none">MESA</span>
                    <div className="transform scale-[0.65] md:scale-90 relative">
                      <Carta virada={true} className="absolute top-1 left-1 opacity-50" />
                      <Carta virada={true} className="relative z-10 shadow-lg" />
                    </div>
                  </div>
                </div>
              </div>

              {/* LINHA 3: SUA MÃO (BASE) */}
              <div className="h-[30%] w-full flex items-end justify-center relative z-10 mt-auto pb-2 gap-4">
                
                {/* Badge da promessa - LADO ESQUERDO */}
                {fezPromessa && (
                  <div className="hidden md:block bg-slate-900/80 px-3 py-1.5 rounded-lg text-center border border-slate-600/50 shadow-xl self-end mb-2">
                    <p className="font-bold text-[10px] md:text-xs text-white">Sua Promessa</p>
                    <p className="text-yellow-400 text-[9px] md:text-[10px] uppercase font-black">Você Faz: {jogadorAtual.promessa}</p>
                  </div>
                )}

                {/* Contêiner das cartas */}
                <div className="flex justify-center h-24 md:h-36 items-end origin-bottom scale-[0.8] md:scale-100 relative">
                  
                  {precisaFazerPromessa && (
                    <div className="absolute bottom-[110%] md:bottom-1/2 md:translate-y-[-20%] left-[80%] md:left-[110%] z-50 bg-slate-900 p-4 rounded-2xl shadow-2xl border-2 border-yellow-500 flex flex-col items-center gap-2 animate-bounce-in w-max">
                      <p className="text-yellow-400 font-black uppercase text-xs text-center leading-tight">Quantas você faz?</p>
                      <div className="flex justify-center gap-1.5 flex-wrap max-w-[150px]">
                        {Array.from({ length: sala.rodadaAtual + 1 }).map((_, i) => (
                          <button key={i} onClick={() => fazerPromessa(i)} className="w-10 h-10 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-lg rounded-xl shadow-[0_4px_0_rgb(161,98,7)] active:translate-y-1 active:shadow-none transition-all">
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {jogadorAtual?.cartas?.map((carta, index) => (
                    <div key={index} className={`transform transition-transform hover:-translate-y-4 cursor-pointer ${index > 0 ? '-ml-8 md:-ml-12' : ''}`}>
                      <Carta carta={carta} virada={sala.rodadaAtual === 1} className="shadow-[0_-10px_20px_rgba(0,0,0,0.3)]" />
                    </div>
                  ))}
                </div>

                {fezPromessa && (
                  <div className="md:hidden bg-slate-900/80 px-2 py-1 rounded-lg text-center border border-slate-600/50 shadow-xl self-end mb-1">
                    <p className="font-bold text-[9px] text-white">Promessa</p>
                    <p className="text-yellow-400 text-[10px] uppercase font-black">Faz: {jogadorAtual.promessa}</p>
                  </div>
                )}

              </div>

            </div>
          )}
        </div>

        {/* === PAINEL DE CHAT (Lateral) - AGORA COM OVERFLOW HIDDEN === */}
        <div className={`
          absolute lg:relative top-0 right-0 h-full w-[85%] sm:w-80 bg-slate-800 rounded-[1.5rem] lg:rounded-[2rem] border-[4px] lg:border-[6px] border-slate-700 flex flex-col shadow-2xl transition-transform z-40 overflow-hidden
          ${chatAbertoMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          {/* Header do Chat */}
          <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-black text-emerald-400 italic">Chat da Mesa</h3>
            <button onClick={() => setChatAbertoMobile(false)} className="lg:hidden text-slate-400 hover:text-white font-bold text-xl">✕</button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth bg-slate-800">
            {mensagensChat.length === 0 ? (
              <p className="text-center text-slate-500 text-sm italic mt-4">Nenhuma mensagem ainda. Mande um salve!</p>
            ) : (
              mensagensChat.map((msg: any, i: number) => {
                const souEu = msg.autor === jogadorAtual?.nome;
                return (
                  <div key={i} className={`flex flex-col ${souEu ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1">{msg.autor}</span>
                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${souEu ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-slate-700 text-slate-100 rounded-tl-sm'}`}>
                      {msg.texto}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input de Mensagem */}
          <form onSubmit={enviarMensagem} className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
            <input 
              type="text" 
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              placeholder="Digite aqui..."
              className="flex-1 bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-emerald-500 focus:outline-none"
            />
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black px-4 rounded-lg active:scale-95 transition-all">
              ➤
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}