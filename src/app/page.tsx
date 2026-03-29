// src/app/page.tsx
'use client'; // Necessário pois vamos usar estados (useState) e navegação no lado do cliente

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

  // Função para criar uma nova sala
  const criarSala = async () => {
    if (!nome.trim()) return alert('Digite seu nome!');
    setCarregando(true);

    try {
      // Cria uma referência vazia na lista de "salas" (isso gera um ID único automático)
      const novaSalaRef = push(ref(db, 'salas'));
      const salaId = novaSalaRef.key;

      if (!salaId) throw new Error('Erro ao gerar ID da sala');

      // Cria o objeto do jogador criador (o "host")
      const novoJogador: Jogador = {
        id: 'host', // Para simplificar agora, o criador é o host
        nome: nome,
        vidas: 5,
        promessa: null,
        vazasGanhas: 0,
        cartas: []
      };

      // Monta o estado inicial da sala baseado na nossa interface
      const estadoInicialSala: Sala = {
        status: 'aguardando',
        rodadaAtual: 1,
        vira: null,
        turnoDe: 'host',
        jogadores: {
          host: novoJogador
        },
        mesa: []
      };

      // Salva a sala no Firebase
      await set(novaSalaRef, estadoInicialSala);

      // Redireciona o usuário para a página da sala
      router.push(`/sala/${salaId}?jogadorId=host`);
    } catch (error) {
      console.error(error);
      alert('Erro ao criar sala.');
      setCarregando(false);
    }
  };

  // Função para entrar em uma sala existente
  const entrarSala = async () => {
    if (!nome.trim() || !codigoSala.trim()) return alert('Digite seu nome e o código da sala!');
    setCarregando(true);

    try {
      const dbRef = ref(db);
      // Busca a sala no banco de dados para ver se ela existe
      const snapshot = await get(child(dbRef, `salas/${codigoSala}`));

      if (snapshot.exists()) {
        const salaAtual = snapshot.val() as Sala;
        
        if (salaAtual.status !== 'aguardando') {
          alert('O jogo já começou nesta sala!');
          setCarregando(false);
          return;
        }

        // Gera um ID simples para o novo jogador
        const novoJogadorId = `jogador_${Date.now()}`;
        
        const novoJogador: Jogador = {
          id: novoJogadorId,
          nome: nome,
          vidas: 5,
          promessa: null,
          vazasGanhas: 0,
          cartas: []
        };

        // Adiciona o jogador na sala lá no Firebase
        await set(ref(db, `salas/${codigoSala}/jogadores/${novoJogadorId}`), novoJogador);

        // Redireciona para a sala
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
    <main className="min-h-screen bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-6">
        
        <div className="text-center">
          <h1 className="text-4xl font-black text-red-600 tracking-tighter transform -skew-x-6">
            A PROMESSA
          </h1>
          <p className="text-gray-500 font-medium mt-1">O jogo de cartas e blefe</p>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <label className="font-bold text-gray-700">Seu Nome / Apelido</label>
          <input 
            type="text" 
            className="border-2 border-gray-300 rounded-lg p-3 text-lg font-bold text-gray-800 focus:border-red-500 focus:outline-none transition-colors"
            placeholder="Ex: Gabriel"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <hr className="my-2 border-gray-200" />

        <div className="flex flex-col gap-4">
          <button 
            onClick={criarSala}
            disabled={carregando}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-xl shadow-[0_4px_0_rgb(185,28,28)] active:shadow-[0_0px_0_rgb(185,28,28)] active:translate-y-1 transition-all disabled:opacity-50"
          >
            {carregando ? 'Criando...' : 'Criar Nova Sala'}
          </button>

          <div className="flex items-center gap-2 mt-2">
            <input 
              type="text" 
              className="border-2 border-gray-300 rounded-lg p-3 font-bold text-gray-800 flex-1 focus:border-orange-500 focus:outline-none uppercase"
              placeholder="CÓDIGO DA SALA"
              value={codigoSala}
              onChange={(e) => setCodigoSala(e.target.value.trim())}
            />
            <button 
              onClick={entrarSala}
              disabled={carregando}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-[0_4px_0_rgb(194,65,12)] active:shadow-[0_0px_0_rgb(194,65,12)] active:translate-y-1 transition-all disabled:opacity-50"
            >
              Entrar
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}