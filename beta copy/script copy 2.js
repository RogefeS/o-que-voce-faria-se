// --- CONFIGURAÇÃO DO FIREBASE (COLE SUAS CHAVES AQUI) ---
const firebaseConfig = {
  apiKey: "AIzaSyCGEfEaxYHldR3tQ7XBeiZhhRhFV-VfkL4",
  authDomain: "o-que-voce-faria-se-6d98b.firebaseapp.com",
  projectId: "o-que-voce-faria-se-6d98b",
  storageBucket: "o-que-voce-faria-se-6d98b.firebasestorage.app",
  messagingSenderId: "497536776657",
  appId: "1:497536776657:web:3419ea750910f0720a48f0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const ID_SALA = "sala_principal";

// --- VARIÁVEIS DE CONTROLE LOCAL ---
let meuId = localStorage.getItem("meuId") || '_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem("meuId", meuId);

let estado = null; // Armazena o snapshot do banco
let corSelecionada = null;
let avatarBase64 = null;

const coresDisponiveis = [
    { nome: "red", cor: "#ff4d4d" }, { nome: "blue", cor: "#3385ff" },
    { nome: "green", cor: "#00cc44" }, { nome: "yellow", cor: "#e6e600" },
    { nome: "purple", cor: "#9933ff" }, { nome: "orange", cor: "#ff944d" },
    { nome: "pink", cor: "#ff66b2" }, { nome: "cyan", cor: "#00cccc" }
];

// --- INICIALIZAÇÃO ---
window.onload = () => monitorarSala();

function monitorarSala() {
    db.collection("games").doc(ID_SALA).onSnapshot((doc) => {
        if (!doc.exists) {
            db.collection("games").doc(ID_SALA).set({
                fase: 'LOBBY',
                jogadores: [],
                posts: [],
                vezIndice: 0,
                subFase: 'PERGUNTA' // 'PERGUNTA' ou 'RESPOSTA'
            });
            return;
        }
        estado = doc.data();
        atualizarUI();
    });
}

// --- LÓGICA DE INTERFACE (A "INTELIGÊNCIA" DO JOGO) ---
function atualizarUI() {
    const eu = estado.jogadores.find(j => j.id === meuId);
    
    // 1. Alternar Telas (Login vs Jogo)
    document.getElementById("area-login").style.display = eu ? "none" : "block";
    document.getElementById("area-jogo").style.display = eu ? "block" : "none";

    if (!eu) {
        renderCores(estado.jogadores);
        return;
    }

    // 2. Renderizar Elementos Visuais
    renderRoda(estado.jogadores, estado.vezIndice, estado.fase, estado.subFase);
    renderFeed(estado.posts);

    // 3. Controlar Painel de Status
    const statusTit = document.getElementById("status-titulo");
    const instrucao = document.getElementById("instrucao-vez");
    
    // 4. Controlar Fases e Botões
    const fasePerg = document.getElementById("fase-pergunta");
    const faseResp = document.getElementById("fase-resposta");
    const faseRev = document.getElementById("fase-revelacao");
    const btnIni = document.getElementById("btn-iniciar");

    // Resetar visibilidade
    [fasePerg, faseResp, faseRev, btnIni].forEach(el => el.style.display = "none");

    if (estado.fase === 'LOBBY') {
        statusTit.innerText = "Aguardando Jogadores...";
        if (estado.jogadores.length >= 2) btnIni.style.display = "inline-block";
    } 
    
    else if (estado.fase === 'ESCREVENDO') {
        statusTit.innerText = "Escrevam suas perguntas!";
        if (!eu.pergunta) fasePerg.style.display = "block";
        else instrucao.innerText = "Aguardando outros jogadores escreverem...";
    } 
    
    else if (estado.fase === 'RESPONDENDO') {
        statusTit.innerText = "Responda à pergunta recebida!";
        if (!eu.resposta) {
            faseResp.style.display = "block";
            document.getElementById("texto-pergunta-recebida").innerText = `Pergunta: "${eu.perguntaRecebida}"`;
        } else {
            instrucao.innerText = "Aguardando outros responderem...";
        }
    } 
    
else if (estado.fase === 'REVELANDO') {
        faseRev.style.display = "block";
        const idxAtual = estado.vezIndice;
        const idxProx = (idxAtual + 1) % estado.jogadores.length;
        
        const jogadorAtual = estado.jogadores[idxAtual];
        const jogadorProx = estado.jogadores[idxProx];

        const btnP = document.getElementById("btn-ler-pergunta");
        const btnR = document.getElementById("btn-ler-resposta");

        // Limpa instruções anteriores
        instrucao.innerText = "";

        if (estado.subFase === 'PERGUNTA') {
            statusTit.innerText = `Vez de ${jogadorAtual.nome}`;
            if (meuId === jogadorAtual.id) {
                btnP.style.display = "inline-block";
                // Mostra a pergunta APENAS para quem tem o botão de ler ativo
                instrucao.innerHTML = `<span style="color:#e60000">SUA VEZ! LEIA EM VOZ ALTA:</span><br>"${jogadorAtual.perguntaRecebida}"`;
            } else {
                btnP.style.display = "none";
                instrucao.innerText = `Aguardando ${jogadorAtual.nome} ler a pergunta...`;
            }
            btnR.style.display = "none";
        } else {
            statusTit.innerText = `Vez de ${jogadorProx.nome}`;
            if (meuId === jogadorProx.id) {
                btnR.style.display = "inline-block";
                // Mostra a resposta APENAS para quem tem o botão de ler ativo
                instrucao.innerHTML = `<span style="color:#007bff">SUA VEZ! RESPONDA:</span><br>"${jogadorProx.resposta}"`;
            } else {
                btnR.style.display = "none";
                instrucao.innerText = `Aguardando ${jogadorProx.nome} dar a resposta...`;
            }
            btnP.style.display = "none";
        }
    }
    else if (estado.fase === 'FINALIZADO') {
        statusTit.innerText = "Fim da Rodada!";
        instrucao.innerText = "O anfitrião pode reiniciar o jogo.";
    }
}

// --- FUNÇÕES DE AÇÃO ---

function entrarNoJogo() {
    let nome = document.getElementById("nome").value;
    if (!nome || !corSelecionada) return alert("Preencha nome e cor!");
    
    const novoJ = {
        id: meuId, nome, cor: coresDisponiveis.find(c => c.nome === corSelecionada).cor,
        corNome: corSelecionada, avatar: avatarBase64,
        pergunta: "", perguntaRecebida: "", resposta: ""
    };

    db.collection("games").doc(ID_SALA).update({
        jogadores: firebase.firestore.FieldValue.arrayUnion(novoJ)
    });
}

function iniciarRodada() {
    db.collection("games").doc(ID_SALA).update({ fase: 'ESCREVENDO', posts: [] });
}

function enviarPergunta() {
    const txt = document.getElementById("input-pergunta").value;
    if (!txt) return;

    let novosJogadores = estado.jogadores.map(j => j.id === meuId ? { ...j, pergunta: txt } : j);
    
    if (novosJogadores.every(j => j.pergunta !== "")) {
        // SORTEIO ALEATÓRIO
        let perguntas = novosJogadores.map(j => j.pergunta);
        let sorteadas = sortearPerguntas(novosJogadores, perguntas);
        
        novosJogadores.forEach((j, i) => j.perguntaRecebida = sorteadas[i]);
        db.collection("games").doc(ID_SALA).update({ jogadores: novosJogadores, fase: 'RESPONDENDO' });
    } else {
        db.collection("games").doc(ID_SALA).update({ jogadores: novosJogadores });
    }
    document.getElementById("input-pergunta").value = "";
}

function enviarResposta() {
    const txt = document.getElementById("input-resposta").value;
    if (!txt) return;

    let novosJogadores = estado.jogadores.map(j => j.id === meuId ? { ...j, resposta: txt } : j);
    
    if (novosJogadores.every(j => j.resposta !== "")) {
        db.collection("games").doc(ID_SALA).update({ 
            jogadores: novosJogadores, fase: 'REVELANDO', vezIndice: 0, subFase: 'PERGUNTA' 
        });
    } else {
        db.collection("games").doc(ID_SALA).update({ jogadores: novosJogadores });
    }
}

function lerPergunta() {
    const j = estado.jogadores[estado.vezIndice];
    const post = { texto: `${j.nome} perguntou: "${j.perguntaRecebida}"`, cor: j.cor };
    db.collection("games").doc(ID_SALA).update({
        posts: firebase.firestore.FieldValue.arrayUnion(post),
        subFase: 'RESPOSTA'
    });
}

function lerResposta() {
    const idxProx = (estado.vezIndice + 1) % estado.jogadores.length;
    const j = estado.jogadores[idxProx];
    const post = { texto: `${j.nome} respondeu: "${j.resposta}"`, cor: j.cor };
    
    const fim = (estado.vezIndice === estado.jogadores.length - 1);
    
    db.collection("games").doc(ID_SALA).update({
        posts: firebase.firestore.FieldValue.arrayUnion(post),
        subFase: 'PERGUNTA',
        vezIndice: fim ? estado.vezIndice : estado.vezIndice + 1,
        fase: fim ? 'FINALIZADO' : 'REVELANDO'
    });
}

// --- LÓGICA DE SORTEIO (FISHER-YATES) ---
function sortearPerguntas(jogadores, listaPerguntas) {
    let original = [...listaPerguntas];
    let shuffle = [...listaPerguntas];
    let valido = false;

    while (!valido) {
        // Embaralha
        for (let i = shuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffle[i], shuffle[j]] = [shuffle[j], shuffle[i]];
        }
        // Checa se alguém pegou a própria (quem fez a pergunta na posição I é o jogador I)
        valido = jogadores.every((player, i) => player.pergunta !== shuffle[i]);
    }
    return shuffle;
}

// --- RENDERIZAÇÃO DA RODA ---
function renderRoda(jogadores, vezIndice, fase, subFase) {
    const l1 = document.getElementById("linha1");
    const l2 = document.getElementById("linha2");
    l1.innerHTML = ""; l2.innerHTML = "";

    const metade = Math.ceil(jogadores.length / 2);
    const cima = jogadores.slice(0, metade);
    const baixo = jogadores.slice(metade).reverse();

    const idxProx = (vezIndice + 1) % jogadores.length;

    // Função interna para gerar o HTML do jogador
    const criarJogadorHTML = (j, indexGlobal, linhaCima) => {
        let classeExtra = "";
        if (fase === 'REVELANDO') {
            if (indexGlobal === vezIndice) classeExtra = "ativo";
            else if (indexGlobal === idxProx) classeExtra = "proximo";
        }
        
        const pronto = (fase === 'ESCREVENDO' && j.pergunta) || (fase === 'RESPONDENDO' && j.resposta);

        return `
            <div class="jogador ${classeExtra} ${pronto ? 'pronto' : ''}" style="border-color: ${j.cor}">
            <button class="btn-remover-card" onclick="removerJogador('${j.id}')">×</button>
            ${j.avatar ? `<img src="${j.avatar}">` : `<div class="sem-foto">?</div>`}
            <div class="nome" style="color:${j.cor}">${j.nome}</div>
        </div>`;
    }
    // Linha de Cima
    cima.forEach((j, i) => {
        let seta = (i < cima.length - 1) ? '➡️' : (baixo.length > 0 ? '⬇️' : '');
        l1.innerHTML += `<div class="bloco">${criarJogadorHTML(j, i, true)}${seta ? `<div class="seta">${seta}</div>` : ''}</div>`;
    });

    // Linha de Baixo
    baixo.forEach((j, i) => {
        const idxReal = jogadores.length - 1 - i;
        let setaAntes = (i === baixo.length - 1) ? '⬆️' : '⬅️';
        l2.innerHTML += `<div class="bloco"><div class="seta">${setaAntes}</div>${criarJogadorHTML(j, idxReal, false)}</div>`;
    });
}

// --- AUXILIARES GERAIS ---
function renderCores(jogadoresNaSala) {
    const divCores = document.getElementById("cores");
    if (!divCores) return;

    divCores.innerHTML = "";
    
    // Pegamos os nomes das cores que já estão sendo usadas
    const coresUsadas = jogadoresNaSala.map(j => j.corNome);

    coresDisponiveis.forEach(c => {
        const estaOcupada = coresUsadas.includes(c.nome);
        
        // Criamos o elemento da cor
        const elementoCor = document.createElement("div");
        elementoCor.className = `cor ${estaOcupada ? 'indisponivel' : ''} ${corSelecionada === c.nome ? 'selecionada' : ''}`;
        elementoCor.style.backgroundColor = c.cor;
        
        // Só adiciona o clique se a cor não estiver ocupada
        if (!estaOcupada) {
            elementoCor.onclick = () => {
                corSelecionada = c.nome;
                renderCores(estado.jogadores); // Atualiza o visual das bolinhas
            };
        }

        divCores.appendChild(elementoCor);
    });
}
function selecionarCor(n) { corSelecionada = n; atualizarUI(); }

function renderFeed(posts) {
    const lista = document.getElementById("lista-posts");
    lista.innerHTML = posts.map(p => `<div class="post" style="border-left: 4px solid ${p.cor}">${p.texto}</div>`).join('');
    document.getElementById("feed").scrollTop = document.getElementById("feed").scrollHeight;
}

function resetarSala() {
    if (confirm("Resetar o jogo?")) {
        db.collection("games").doc(ID_SALA).set({ fase: 'LOBBY', jogadores: [], posts: [], vezIndice: 0, subFase: 'PERGUNTA' });
        window.location.reload();
    }
}
function removerJogador(idParaRemover) {
    if (!confirm("Deseja remover este jogador da sala?")) return;

    // Filtra a lista atual removendo o ID selecionado
    const novosJogadores = estado.jogadores.filter(j => j.id !== idParaRemover);

    db.collection("games").doc(ID_SALA).update({
        jogadores: novosJogadores
    }).then(() => {
        // Se eu me removi (ou fui removido), limpo meu ID local e recarrego
        if (idParaRemover === meuId) {
            localStorage.removeItem("meuId");
            window.location.reload();
        }
    });
}
// Upload de Avatar
document.getElementById('avatar').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = () => { avatarBase64 = reader.result; document.querySelector('.file-label').innerText = "✅ Foto Ok"; };
    reader.readAsDataURL(e.target.files[0]);
});