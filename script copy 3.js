// 1. Imports corrigidos para funcionar no navegador
import { initializeApp } from "https://www.gstatic.com";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyCGEfEaxYHldR3tQ7XBeiZhhRhFV-VfkL4",
  authDomain: "o-que-voce-faria-se-6d98b.firebaseapp.com",
  projectId: "o-que-voce-faria-se-6d98b",
  storageBucket: "o-que-voce-faria-se-6d98b.firebasestorage.app",
  messagingSenderId: "497536776657",
  appId: "1:497536776657:web:3419ea750910f0720a48f0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variáveis de controle local
let jogadores = [];
let corSelecionada = null;
let coresDisponiveis = [
  {nome:"red", cor:"#ff0000"}, {nome:"blue", cor:"#0066ff"},
  {nome:"green", cor:"#00cc00"}, {nome:"yellow", cor:"#cccc00"},
  {nome:"purple", cor:"#800080"}, {nome:"orange", cor:"#ff6600"},
  {nome:"pink", cor:"#cc3399"}, {nome:"cyan", cor:"#00cccc"}
];

// --- FUNÇÕES DE INTERFACE ---

function renderCores() {
  let div = document.getElementById("cores");
  div.innerHTML = "";
  coresDisponiveis.forEach(c => {
    div.innerHTML += `<div class="cor" style="background:${c.cor}" onclick="selecionarCor('${c.nome}')"></div>`;
  });
}

function selecionarCor(cor) {
  corSelecionada = cor;
  alert("Cor " + cor + " selecionada!");
}

// --- FUNÇÕES FIREBASE (MULTIPLAYER) ---

async function addJogador() {
  let nome = document.getElementById("nome").value;
  if (!nome || !corSelecionada) return alert("Preencha nome e escolha uma cor!");

  let corObj = coresDisponiveis.find(c => c.nome === corSelecionada);

  await addDoc(collection(db, "jogadores"), {
    nome: nome,
    cor: corObj.cor,
    corNome: corObj.nome,
    timestamp: Date.now()
  });

  document.getElementById("nome").value = "";
  corSelecionada = null;
}

async function removerJogador(id) {
  await deleteDoc(doc(db, "jogadores", id));
}

async function addPergunta() {
  let p = document.getElementById("pergunta").value;
  if (p && jogadores.length > 1) {
    await addDoc(collection(db, "perguntas"), {
      texto: p,
      timestamp: Date.now()
    });
    document.getElementById("pergunta").value = "";
  }
}

// --- A FUNÇÃO RENDER RODA (ATUALIZADA) ---

function renderRoda() {
  let linha1 = document.getElementById("linha1");
  let linha2 = document.getElementById("linha2");
  linha1.innerHTML = "";
  linha2.innerHTML = "";

  let metade = Math.ceil(jogadores.length / 2);
  let cima = jogadores.slice(0, metade);
  let baixo = jogadores.slice(metade).reverse();

  cima.forEach((j, i) => {
    linha1.innerHTML += `
      <div class="bloco">
        <div class="jogador">
          <div class="nome" style="color:${j.cor}">${j.nome}</div>
          <button class="remover" onclick="removerJogador('${j.id}')">×</button>
        </div>
        ${i < cima.length - 1 ? '<div class="seta">➡️</div>' : '<div class="seta">⬇️</div>'}
      </div>`;
  });

  baixo.forEach((j, i) => {
    linha2.innerHTML += `
      <div class="bloco">
        ${i === 0 ? '<div class="seta">⬆️</div>' : '<div class="seta">⬅️</div>'}
        <div class="jogador">
          <div class="nome" style="color:${j.cor}">${j.nome}</div>
          <button class="remover" onclick="removerJogador('${j.id}')">×</button>
        </div>
      </div>`;
  });
}

// --- OUVINTES EM TEMPO REAL ---

onSnapshot(query(collection(db, "jogadores"), orderBy("timestamp")), (snapshot) => {
  jogadores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderRoda();
});

// Tornar funções acessíveis ao HTML (Importante para o module)
window.addJogador = addJogador;
window.removerJogador = removerJogador;
window.selecionarCor = selecionarCor;
window.addPergunta = addPergunta;

renderCores();
