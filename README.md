# 🃏 A Promessa - Jogo de Cartas Online

Um jogo de cartas multiplayer em tempo real. Blefe, estratégia e a regra de ouro: na primeira rodada, sua carta fica na testa!

## 🎮 Como Funciona o Jogo

O objetivo do jogo é prever exatamente quantas vazas (rodadas) você vai ganhar com a mão que recebeu. 
- Se você promete ganhar 1 vaza e ganha exatamente 1, você sobrevive. 
- Se você promete 1 e ganha 2, ou ganha 0, você perde uma Vida.
- O jogo termina quando sobrar apenas um jogador com Vidas na mesa.

**A Pegadinha:** Na primeira rodada de cada partida, os jogadores recebem apenas **uma carta** e ela fica virada para a testa (os oponentes veem sua carta, mas você só vê a deles!).

## 🚀 Tecnologias Utilizadas

Este projeto foi construído utilizando um stack moderno focado em reatividade e tempo real:

* **[Next.js](https://nextjs.org/) (React):** Framework frontend para renderização rápida e roteamento inteligente.
* **[Tailwind CSS](https://tailwindcss.com/):** Estilização utilitária para um design responsivo, com aparência de aplicativo móvel nativo e interface "premium" inspirada em feltros de cassino.
* **[Firebase Realtime Database](https://firebase.google.com/):** Sincronização de estado milissegundo a milissegundo. Garante que as cartas jogadas na mesa apareçam na tela de todos simultaneamente.
* **[TypeScript](https://www.typescriptlang.org/):** Tipagem forte para garantir a lógica complexa do motor do baralho sem bugs ocultos.

## ✨ Funcionalidades

- Criação e entrada de salas via código dinâmico.
- Motor de baralho completo (embaralhamento de Fisher-Yates, distribuição de mãos, seleção de Vira e cálculo de Manilha).
- Chat embutido em tempo real para comunicação com a mesa.
- Design responsivo: Jogue no monitor ultrawide ou no celular perfeitamente.
- Animações fluídas de cartas e modais flutuantes.

## 🛠️ Como rodar o projeto localmente

1. Clone o repositório:
```bash
git clone [https://github.com/SeuUsuario/apromessa.git](https://github.com/SeuUsuario/apromessa.git)
```

2. Instale as dependências:
```bash
cd jogo-da-promessa
npm install
```

3. Configure o Firebase:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY="sua_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="seu_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="seu_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="seu_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="seu_sender"
NEXT_PUBLIC_FIREBASE_APP_ID="seu_app_id"
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

5. Inicie o servidor de desenvolvimento:
- Abra http://localhost:3000 no seu navegador para ver o resultado.

## Feito com ☕ e muito código por Gabriel Martielo.
