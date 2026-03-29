// src/app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, push, set, get, child } from 'firebase/database';
import { db } from '../lib/firebase';
import { Jogador, Sala } from '../types/game';

export default function Home() {
  const [nome, setNome] = useState('');
  const [codigoSala, setCodigoSala] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  const criarSala = async () => {
    if (!nome.trim()) return alert('Digite seu nome!');
    setCarregando(true);

    try {
      const novaSalaRef = push(ref(db, 'salas'));
      const salaId = novaSalaRef.key;

      if (!salaId) throw new Error('Erro ao gerar ID da sala');

      const novoJogador: Jogador = {
        id: 'host', 
        nome: nome,
        vidas: 5,
        promessa: null,
        vazasGanhas: 0,
        cartas: []
      };

      const estadoInicialSala: Sala = {
        status: 'aguardando',
        rodadaAtual: 1,
        vira: null,
        manilha: null,
        turnoDe: 'host',
        jogadores: {
          host: novoJogador
        },
        mesa: []
      };

      await set(novaSalaRef, estadoInicialSala);
      router.push(`/sala/${salaId}?jogadorId=host`);
    } catch (error) {
      console.error(error);
      alert('Erro ao criar sala.');
      setCarregando(false);
    }
  };

  const entrarSala = async () => {
    if (!nome.trim() || !codigoSala.trim()) return alert('Digite seu nome e o código da sala!');
    setCarregando(true);

    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `salas/${codigoSala}`));

      if (snapshot.exists()) {
        const salaAtual = snapshot.val() as Sala;
        
        if (salaAtual.status !== 'aguardando') {
          alert('O jogo já começou nesta sala!');
          setCarregando(false);
          return;
        }

        const novoJogadorId = `jogador_${Date.now()}`;
        
        const novoJogador: Jogador = {
          id: novoJogadorId,
          nome: nome,
          vidas: 5,
          promessa: null,
          vazasGanhas: 0,
          cartas: []
        };

        await set(ref(db, `salas/${codigoSala}/jogadores/${novoJogadorId}`), novoJogador);
        router.push(`/sala/${codigoSala}?jogadorId=${novoJogadorId}`);
      } else {
        alert('Sala não encontrada!');
        setCarregando(false);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao entrar na sala.');
      setCarregando(false);
    }
  };

  return (
    <main className="h-screen w-screen bg-slate-900 flex flex-col items-center overflow-hidden text-slate-100 font-sans">
      
      {/* CABEÇALHO ELEGANTE */}
      <header className="w-full bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-center z-20 shadow-md flex-shrink-0">
        <div className="flex flex-col flex-shrink-0 text-center">
          <h1 className="text-xl font-black italic text-emerald-400 leading-tight">A PROMESSA</h1>
          <span className="text-xs text-slate-400 -mt-1 select-none">Lobby Oficial</span>
        </div>
      </header>

      {/* ÁREA CENTRAL COM O FELTRO VERDE */}
      <div className="flex-1 w-full p-4 md:p-8 flex flex-col items-center justify-center relative overflow-y-auto">
        {/* Aumentei o padding interno aqui (p-8 md:p-16) e reduzi o max-w para dar respiro nas bordas */}
        <div className="w-full max-w-5xl min-h-[500px] md:min-h-[600px] bg-emerald-800 rounded-[3rem] md:rounded-[4rem] border-[8px] md:border-[12px] border-slate-700 shadow-inner flex flex-col relative overflow-hidden p-8 md:p-16 justify-center gap-8 md:gap-12">
          
          {/* TOPO DA MESA: Título Centralizado */}
          <div className="text-center bg-slate-900/60 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] backdrop-blur-md w-fit mx-auto shadow-2xl border border-slate-600/50">
            <h2 className="text-3xl md:text-5xl font-black italic text-white leading-tight select-none">A PROMESSA</h2>
            <p className="text-emerald-400 font-bold mt-2 text-sm md:text-lg">Cartas, Blefe e Pura Estratégia</p>
          </div>

          {/* BASE DA MESA: Painéis de Ação */}
          <div className="w-full flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-10 relative z-10 px-2 md:px-4">

            {/* PAINEL: CRIAR SALA */}
            {/* Diminuí o max-w de max-w-md para max-w-[360px] */}
            <div className="bg-slate-900/80 p-6 md:p-8 rounded-[2rem] border border-slate-600/50 shadow-2xl flex-1 max-w-[360px] w-full mx-auto flex flex-col gap-4">
              <div className="text-center mb-1">
                <p className="font-black text-xl text-white">Criar Sala</p>
                <p className="text-slate-400 text-xs mt-1">Seja o host e convide amigos</p>
              </div>

              <input
                type="text"
                className="w-full border-2 border-slate-600 rounded-xl p-3 text-base font-bold text-white bg-slate-800 focus:border-emerald-500 focus:outline-none transition-colors shadow-inner text-center"
                placeholder="Seu Nome / Apelido"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />

              <button
                onClick={criarSala}
                disabled={carregando}
                className="w-full mt-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-3 rounded-xl text-lg shadow-[0_5px_0_rgb(4,120,87)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
              >
                {carregando ? 'Criando...' : 'Nova Partida'}
              </button>
            </div>

            {/* PAINEL: ENTRAR EM SALA */}
            <div className="bg-slate-900/80 p-6 md:p-8 rounded-[2rem] border border-slate-600/50 shadow-2xl flex-1 max-w-[360px] w-full mx-auto flex flex-col gap-4">
              <div className="text-center mb-1">
                <p className="font-black text-xl text-white">Entrar na Sala</p>
                <p className="text-slate-400 text-xs mt-1">Junte-se a uma partida existente</p>
              </div>

              <input
                type="text"
                className="w-full border-2 border-slate-600 rounded-xl p-3 text-base font-bold text-white bg-slate-800 focus:border-orange-500 focus:outline-none transition-colors shadow-inner text-center"
                placeholder="Seu Nome / Apelido"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />

              <input
                type="text"
                className="w-full border-2 border-slate-600 rounded-xl p-3 text-base font-black text-orange-400 bg-slate-800 focus:border-orange-500 focus:outline-none transition-colors shadow-inner text-center uppercase tracking-widest"
                placeholder="CÓDIGO"
                value={codigoSala}
                onChange={(e) => setCodigoSala(e.target.value.trim().toUpperCase())}
              />

              <button
                onClick={entrarSala}
                disabled={carregando}
                className="w-full mt-auto bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl text-lg shadow-[0_5px_0_rgb(194,65,12)] active:shadow-[0_0px_0_rgb(194,65,12)] active:translate-y-1 transition-all disabled:opacity-50"
              >
                {carregando ? 'Entrando...' : 'Entrar Agora'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}