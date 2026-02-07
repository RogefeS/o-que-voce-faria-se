// 1. Imports usando UNPKG para compatibilidade com navegadores HTML puro
import { initializeApp } from "https://unpkg.com";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy } from "https://unpkg.com";

// 2. Sua configuração do Firebase
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

// 3. Variáveis de controle local e cores
let jogadores = [];
let corSelecionadaNome = null;
let coresDisponiveis = [
  {nome:"red", cor:"#ff0000"}, {nome:"blue", cor:"#0066ff"},
  {nome:"green", cor:"#00cc00"}, {nome:"yellow", cor:"#cccc00"},
  {nome:"purple", cor:"#800080"}, {nome:"orange", cor:"#ff6600"},
  {nome:"pink", cor:"#cc3399"}, {nome:"cyan", cor:"#00cccc"}
];

// --- FUNÇÕES DE INTERFACE E LÓGICA VISUAL ---

function renderCores() {
  let div = document.getElementById("cores");
  div.innerHTML = "";
  coresDisponiveis.forEach(c => {
    const isUsed = jogadores.some(j => j.corNome === c.nome);
    const selectedClass = isUsed ? 'indisponivel' : '';
    const onClickAttr = isUsed ? '' : `onclick="selecionarCor('${c.nome}')"`;
    div.innerHTML += `<div class="cor ${selectedClass}" style="background:${c.cor}" ${onClickAttr}></div>`;
  });
}

function selecionarCor(nomeCor) {
  corSelecionadaNome = nomeCor;
  document.querySelectorAll('.cor').forEach(d => d.style.border = '2px solid #333');
  const selectedDiv = document.querySelector(`.cor[onclick*="${nomeCor}"]`);
  if (selectedDiv) selectedDiv.style.border = '4px solid black';
}

function renderRoda() {
  let linha1 = document.getElementById("linha1");
  let linha2 = document.getElementById("linha2");
  linha1.innerHTML = "";
  linha2.innerHTML = "";

  let metade = Math.ceil(jogadores.length / 2);
  let cima = jogadores.slice(0, metade);
  let baixo = jogadores.slice(metade).reverse();

  const renderJogadorHTML = (j, index) => `
    <div class="jogador">
      ${j.avatarURL ? `<img src="${j.avatarURL}">` : `<img src="https://via.placeholder.com{j.nome.charAt(0)}">`}
      <div class="nome" style="color:${j.cor}">${j.nome}</div>
      <button class="remover" onclick="removerJogador('${j.id}')">×</button>
    </div>
  `;

  cima.forEach((j, i) => {
    linha1.innerHTML += `
      <div class="bloco">
        ${renderJogadorHTML(j, i)}
        ${i < cima.length - 1 ? '<div class="seta">➡️</div>' : (baixo.length > 0 ? '<div class="seta">⬇️</div>' : '')}
      </div>`;
  });

  baixo.forEach((j, i) => {
    linha2.innerHTML += `
      <div class="bloco">
        ${i === 0 && cima.length > 0 ? '<div class="seta">⬆️</div>' : (i > 0 ? '<div class="seta">⬅️</div>' : '')}
        ${renderJogadorHTML(j, jogadores.length - 1 - i)}
      </div>`;
  });
  
  renderCores(); // Atualiza a paleta de cores disponíveis
}

function adicionarPost(pergunta, resposta, autorCor, autorNome, respondenteCor, respondenteNome) {
  let feed = document.getElementById("feed");
  feed.innerHTML += `
    <div class="post">
      <b style="color:${autorCor}">${autorNome}</b> perguntou: "<span style="color:${autorCor}">${pergunta}</span>"<br>
      <b style="color:${respondenteCor}">${respondenteNome}</b> respondeu: "<span style="color:${respondenteCor}">${resposta}</span>"
    </div>`;
}


// --- FUNÇÕES FIREBASE (MULTIPLAYER) ---

async function addJogador() {
  let nome = document.getElementById("nome").value;
  if (!nome || !corSelecionadaNome) return alert("Preencha nome e escolha uma cor!");
  let corObj = coresDisponiveis.find(c => c.nome === corSelecionadaNome);

  await addDoc(collection(db, "jogadores"), {
    nome: nome,
    cor: corObj.cor,
    corNome: corObj.nome,
    avatarURL: '',
    timestamp: Date.now()
  });

  document.getElementById("nome").value = "";
  corSelecionadaNome = null;
  document.querySelectorAll('.cor').forEach(d => d.style.border = '2px solid #333');
}

async function removerJogador(idFirebase) {
  await deleteDoc(doc(db, "jogadores", idFirebase));
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

// --- OUVINTES EM TEMPO REAL (SINCRONIZA TUDO) ---

onSnapshot(query(collection(db, "jogadores"), orderBy("timestamp")), (snapshot) => {
  jogadores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderRoda(); // Redesenha a roda para todo mundo
});

onSnapshot(query(collection(db, "perguntas"), orderBy("timestamp", "asc")), (snapshot) => {
  let feed = document.getElementById("feed");
  feed.innerHTML = "<h2>Feed do Jogo</h2>";
  snapshot.forEach(doc => {
    const p = doc.data();
    // Placeholder para visualização
    adicionarPost(p.texto, "Resposta pendente...", '#333', 'Autor Temp', '#333', 'Respondente Temp');
  });
});

// 4. Ligar funções ao objeto global window para o HTML acessar (OBRIGATÓRIO para type="module")
window.addJogador = addJogador;
window.removerJogador = removerJogador;
window.selecionarCor = selecionarCor;
window.addPergunta = addPergunta;

// 5. Inicialização
renderCores();
//teste