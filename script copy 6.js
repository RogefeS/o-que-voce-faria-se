// --- CONFIGURAÇÃO DO FIREBASE ---
// SUBSTITUA COM SUAS CHAVES DO CONSOLE DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCGEfEaxYHldR3tQ7XBeiZhhRhFV-VfkL4",
  authDomain: "o-que-voce-faria-se-6d98b.firebaseapp.com",
  projectId: "o-que-voce-faria-se-6d98b",
  storageBucket: "o-que-voce-faria-se-6d98b.firebasestorage.app",
  messagingSenderId: "497536776657",
  appId: "1:497536776657:web:3419ea750910f0720a48f0"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Nome da coleção no banco de dados (será uma sala única para simplificar)
const ID_SALA = "sala_principal"; 

// Variáveis locais
let meuId = localStorage.getItem("meuId") || gerarId(); // Guarda ID no navegador para reconectar
localStorage.setItem("meuId", meuId);
let estadoAtual = null;
let corSelecionada = null;
let avatarBase64 = null;

// Paleta de cores
const coresDisponiveis = [
  {nome:"red", cor:"#ff4d4d"},
  {nome:"blue", cor:"#3385ff"},
  {nome:"green", cor:"#00cc44"},
  {nome:"yellow", cor:"#e6e600"},
  {nome:"purple", cor:"#9933ff"},
  {nome:"orange", cor:"#ff944d"},
  {nome:"pink", cor:"#ff66b2"},
  {nome:"cyan", cor:"#00cccc"},
  {nome:"black", cor:"#333333"},
  {nome:"teal", cor:"#008080"}
];

// --- INICIALIZAÇÃO ---
window.onload = () => {
    monitorarSala(); // Começa a escutar o banco de dados
};

// Gera um ID aleatório para o jogador
function gerarId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// --- LÓGICA DE CORES E AVATAR ---

// Converte imagem para Base64 (texto)
document.getElementById('avatar').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if(file.size > 500000) { // Limite de 500kb para não travar o Firestore
            alert("Imagem muito grande! Tente uma menor.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = function() {
            avatarBase64 = reader.result;
            document.querySelector('.file-label').innerText = "Foto Selecionada!";
            document.querySelector('.file-label').style.background = "#d4edda";
        }
        reader.readAsDataURL(file);
    }
});

function renderCores(jogadoresNaSala) {
  let div = document.getElementById("cores");
  div.innerHTML = "";
  
  // Cores usadas por outros jogadores
  const coresUsadas = jogadoresNaSala.map(j => j.corNome);

  coresDisponiveis.forEach(c => {
    let indisponivel = coresUsadas.includes(c.nome);
    let classeExtra = indisponivel ? "indisponivel" : "";
    
    // Se for a minha cor selecionada atualmente
    if(corSelecionada === c.nome) classeExtra += " selecionada";

    div.innerHTML += `
        <div class="cor ${classeExtra}" 
             style="background:${c.cor}" 
             onclick="${indisponivel ? '' : `selecionarCor('${c.nome}')`}">
        </div>`;
  });
}

function selecionarCor(nome) {
    corSelecionada = nome;
    // Re-renderiza para mostrar a seleção visualmente
    // Pegamos o estado atual dos jogadores para não quebrar a lógica de indisponibilidade
    if(estadoAtual) renderCores(estadoAtual.jogadores || []);
}

// --- FUNÇÕES DO JOGO (CONECTADAS AO FIREBASE) ---

// Escuta mudanças no banco de dados em tempo real
function monitorarSala() {
    db.collection("games").doc(ID_SALA).onSnapshot((doc) => {
        if (doc.exists) {
            estadoAtual = doc.data();
            
            // Verifica se eu já estou no jogo
            const estouNoJogo = estadoAtual.jogadores.find(j => j.id === meuId);
            
            if (estouNoJogo) {
                document.getElementById("area-login").style.display = "none";
                document.getElementById("area-jogo").style.display = "block";
            } else {
                // Atualiza as cores disponíveis para quem está no lobby
                renderCores(estadoAtual.jogadores);
            }

            renderRoda(estadoAtual.jogadores);
            renderFeed(estadoAtual.posts || []);
        } else {
            // Se a sala não existe, cria uma vazia
            db.collection("games").doc(ID_SALA).set({
                jogadores: [],
                posts: []
            });
        }
    });
}

// Entrar na sala (Grava no Firestore)
function entrarNoJogo() {
    let nome = document.getElementById("nome").value;
    if (!nome) return alert("Digite um nome!");
    if (!corSelecionada) return alert("Escolha uma cor!");

    const corObj = coresDisponiveis.find(c => c.nome === corSelecionada);
    
    const novoJogador = {
        id: meuId,
        nome: nome,
        avatar: avatarBase64, // Salva a string da imagem
        cor: corObj.cor,
        corNome: corObj.nome
    };

    // Atualiza o array de jogadores no Firestore
    db.collection("games").doc(ID_SALA).update({
        jogadores: firebase.firestore.FieldValue.arrayUnion(novoJogador)
    }).catch(error => {
        console.error("Erro ao entrar:", error);
        alert("Erro ao conectar. Tente recarregar.");
    });
}

// Enviar pergunta (apenas salva no array de posts por enquanto, para teste)
function enviarPergunta() {
    let texto = document.getElementById("pergunta").value;
    if (!texto) return;

    // Encontra meus dados
    const eu = estadoAtual.jogadores.find(j => j.id === meuId);
    
    const novoPost = {
        autor: eu.nome,
        autorCor: eu.cor,
        texto: texto,
        timestamp: new Date().toISOString()
    };

    db.collection("games").doc(ID_SALA).update({
        posts: firebase.firestore.FieldValue.arrayUnion(novoPost)
    });

    document.getElementById("pergunta").value = "";
}

// Renderiza a Roda (Lógica visual adaptada)
function renderRoda(jogadores) {
  let linha1 = document.getElementById("linha1");
  let linha2 = document.getElementById("linha2");
  linha1.innerHTML = "";
  linha2.innerHTML = "";

  if (jogadores.length === 0) {
      linha1.innerHTML = "<p>Aguardando jogadores...</p>";
      return;
  }

  let metade = Math.ceil(jogadores.length / 2);
  let cima = jogadores.slice(0, metade);
  let baixo = jogadores.slice(metade).reverse(); // Inverte para fazer o círculo

  // Linha de Cima (Esquerda -> Direita)
  cima.forEach((j, i) => {
    let setaHTML = (i < cima.length - 1) ? '➡️' : '⬇️';
    // Se for o último de cima e não tiver linha de baixo, não põe seta pra baixo
    if (i === cima.length - 1 && baixo.length === 0) setaHTML = ''; 

    linha1.innerHTML += `
      <div class="bloco">
        <div class="jogador" style="border-top: 5px solid ${j.cor}">
          ${j.avatar ? `<img src="${j.avatar}">` : `<div style="width:70px;height:70px;border-radius:50%;background:#ccc;display:flex;align-items:center;justify-content:center;">?</div>`}
          <div class="nome" style="color:${j.cor}">${j.nome}</div>
        </div>
        ${setaHTML ? `<div class="seta">${setaHTML}</div>` : ''}
      </div>
    `;
  });

  // Linha de Baixo (Direita -> Esquerda)
  baixo.forEach((j, i) => {
    let setaHTML = (i === 0) ? '⬆️' : '⬅️';
    
    linha2.innerHTML += `
      <div class="bloco">
        ${i === 0 ? '' : '<div class="seta">⬅️</div>'}
        <div class="jogador" style="border-bottom: 5px solid ${j.cor}">
          ${j.avatar ? `<img src="${j.avatar}">` : `<div style="width:70px;height:70px;border-radius:50%;background:#ccc;"></div>`}
          <div class="nome" style="color:${j.cor}">${j.nome}</div>
        </div>
        ${i === 0 ? '<div class="seta">⬆️</div>' : ''}
      </div>
    `;
  });
}

function renderFeed(posts) {
    let div = document.getElementById("lista-posts");
    div.innerHTML = "";
    // Mostra os últimos primeiro
    posts.reverse().forEach(post => {
        div.innerHTML += `
            <div class="post">
                <b style="color:${post.autorCor}">${post.autor}</b> enviou:<br>
                "${post.texto}"
            </div>
        `;
    });
}

// Função de Limpeza (Resetar Sala)
function resetarSala() {
    if(confirm("Isso vai apagar todos os jogadores e resetar a sala. Tem certeza?")) {
        db.collection("games").doc(ID_SALA).set({
            jogadores: [],
            posts: []
        }).then(() => {
            window.location.reload();
        });
    }
}