// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
//const firebaseConfig = {
  //apiKey: "AIzaSyCGEfEaxYHldR3tQ7XBeiZhhRhFV-VfkL4",
  //authDomain: "o-que-voce-faria-se-6d98b.firebaseapp.com",
  //projectId: "o-que-voce-faria-se-6d98b",
  //storageBucket: "o-que-voce-faria-se-6d98b.firebasestorage.app",
  //messagingSenderId: "497536776657",
  //appId: "1:497536776657:web:3419ea750910f0720a48f0",
  //measurementId: "G-0VGYEWVPDF"
//};
//import { initializeApp } from "https://www.gstatic.com";
//import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com";

//const firebaseConfig = {
 //apiKey: "AIzaSyCGEfEaxYHldR3tQ7XBeiZhhRhFV-VfkL4",
 // authDomain: "o-que-voce-faria-se-6d98b.firebaseapp.com",
 // projectId: "o-que-voce-faria-se-6d98b",
  //storageBucket: "o-que-voce-faria-se-6d98b.firebasestorage.app",
  //messagingSenderId: "497536776657",
  //appId: "1:497536776657:web:3419ea750910f0720a48f0"
//};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

let jogadores = [];
let perguntas = [];
let coresDisponiveis = [
  {nome:"red", cor:"#ff0000"},
  {nome:"blue", cor:"#0066ff"},
  {nome:"green", cor:"#00cc00"},
  {nome:"yellow", cor:"#cccc00"}, // amarelo escurecido
  {nome:"purple", cor:"#800080"},
  {nome:"orange", cor:"#ff6600"},
  {nome:"pink", cor:"#cc3399"},   // rosa escurecido
  {nome:"cyan", cor:"#00cccc"}
];

// Renderiza paleta de cores
function renderCores() {
  let div = document.getElementById("cores");
  div.innerHTML = "";
  coresDisponiveis.forEach(c => {
    div.innerHTML += `<div class="cor" style="background:${c.cor}" onclick="selecionarCor('${c.nome}')"></div>`;
  });
}

let corSelecionada = null;
function selecionarCor(cor) {
  corSelecionada = cor;
  let divs = document.querySelectorAll(".cor");
  divs.forEach(d => {
    if (d.getAttribute("onclick") === "selecionarCor('"+cor+"')") {
      d.classList.add("indisponivel");
      d.onclick = null;
    }
  });
}
async function addJogador() {
  let nome = document.getElementById("nome").value;
  if (!corSelecionada) { alert("Escolha uma cor antes!"); return; }
  
  let corObj = coresDisponiveis.find(c => c.nome === corSelecionada);

  // SALVA NO FIREBASE (Multiplayer)
  await addDoc(collection(db, "jogadores"), {
    nome: nome,
    cor: corObj.cor,
    corNome: corObj.nome,
    timestamp: Date.now()
  });

  corSelecionada = null;
  document.getElementById("nome").value = "";
}


async function removerJogador(idFirebase) {
  await deleteDoc(doc(db, "jogadores", idFirebase));
}

function renderRoda() {
  let linha1 = document.getElementById("linha1");
  let linha2 = document.getElementById("linha2");
  linha1.innerHTML = "";
  linha2.innerHTML = "";

  let metade = Math.ceil(jogadores.length / 2);
  let cima = jogadores.slice(0, metade);
  let baixo = jogadores.slice(metade).reverse();

  // Linha de cima (esquerda → direita)
  cima.forEach((j, i) => {
    linha1.innerHTML += `
      <div class="bloco">
        <div class="jogador">
          ${j.avatar ? `<img src="${j.avatar}">` : ""}
          <div class="nome" style="color:${j.cor}">${j.nome}</div>
          <button class="remover" onclick="removerJogador(${i})">×</button>
        </div>
        ${i < cima.length - 1 ? '<div class="seta">➡️</div>' : '<div class="seta">⬇️</div>'}
      </div>
    `;
  });

  // Linha de baixo (direita → esquerda)
  baixo.forEach((j, i) => {
    let originalIndex = jogadores.length - 1 - i;
    linha2.innerHTML += `
      <div class="bloco">
        ${i === 0 ? '<div class="seta">⬆️</div>' : '<div class="seta">⬅️</div>'}
        <div class="jogador">
          ${j.avatar ? `<img src="${j.avatar}">` : ""}
          <div class="nome" style="color:${j.cor}">${j.nome}</div>
          <button class="remover" onclick="removerJogador(${originalIndex})">×</button>
        </div>
      </div>
    `;
  });
}

function addPergunta() {
  let p = document.getElementById("pergunta").value;
  if (p && jogadores.length > 1) {
    perguntas.push(p);
    let autor = jogadores[perguntas.length % jogadores.length];
    let respondente = jogadores[(perguntas.length) % jogadores.length];
    adicionarPost(p, "Resposta pendente...", autor, respondente);
    document.getElementById("pergunta").value = "";
  }
}

function adicionarPost(pergunta, resposta, autor, respondente) {
  let feed = document.getElementById("feed");
  feed.innerHTML += `
    <div class="post">
      <b style="color:${autor.cor}">${autor.nome}</b> perguntou: "<span style="color:${autor.cor}">${pergunta}</span>"<br>
      <b style="color:${respondente.cor}">${respondente.nome}</b> respondeu: "<span style="color:${respondente.cor}">${resposta}</span>"
    </div>`;
}

// Inicializa paleta de cores ao carregar
renderCores();

// Escuta mudanças nos jogadores
onSnapshot(query(collection(db, "jogadores"), orderBy("timestamp")), (snapshot) => {
  jogadores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderRoda(); // Redesenha a roda para todo mundo
});

// Escuta mudanças no feed de perguntas
onSnapshot(query(collection(db, "perguntas"), orderBy("timestamp", "asc")), (snapshot) => {
  let feed = document.getElementById("feed");
  feed.innerHTML = "<h2>Respostas</h2>"; // Limpa e refaz
  snapshot.forEach(doc => {
    const p = doc.data();
    adicionarPost(p.texto, p.resposta || "Aguardando...", p.autor, p.respondente);
  });
});


window.addJogador = addJogador;
window.removerJogador = removerJogador;
window.selecionarCor = selecionarCor;
window.addPergunta = addPergunta;
