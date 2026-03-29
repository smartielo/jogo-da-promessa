// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Substitua este objeto com as SUAS chaves geradas no Console do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC8kzPruzvQevzr47bWQIaSMx2gwdMIy1k",
  authDomain: "jogo-da-promessa.firebaseapp.com",
  databaseURL: "https://jogo-da-promessa-default-rtdb.firebaseio.com",
  projectId: "jogo-da-promessa",
  storageBucket: "jogo-da-promessa.firebasestorage.app",
  messagingSenderId: "196136893052",
  appId: "1:196136893052:web:b146692b1bf5508eb027f9",
  measurementId: "G-9X0CN9Q104"
};

// Inicializa o aplicativo do Firebase
const app = initializeApp(firebaseConfig);

// Exporta a referência do Realtime Database para usarmos em outras telas do jogo
export const db = getDatabase(app);