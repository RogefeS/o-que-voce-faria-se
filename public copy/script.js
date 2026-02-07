// --- CONFIGURAÇÃO DO FIREBASE ---
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
// (Mantenha seu firebase.initializeApp e const db aqui)

const ID_SALA = "sala_principal";
let meuId = localStorage.getItem("meuId") || '_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem("meuId", meuId);

let estado = null;
let corSelecionada = null;
let avatarBase64 = null;

const coresDisponiveis = [
    { nome: "red", cor: "#ff4d4d" }, { nome: "blue", cor: "#3385ff" },
    { nome: "green", cor: "#00cc44" }, { nome: "yellow", cor: "#e6e600" },
    { nome: "purple", cor: "#9933ff" }, { nome: "orange", cor: "#ff944d" },
    { nome: "pink", cor: "#ff66b2" }, { nome: "cyan", cor: "#00cccc" }
];

// Monitoramento em Tempo Real
window.onload = () => {
    db.collection("games").doc(ID_SALA).onSnapshot((doc) => {
        if (!doc.exists) return resetarSalaCompleto();
        
        estado = doc.data();

        // LOGICA DE AUTO-RESET: Se não houver jogadores e o jogo não estiver no LOBBY
        if (estado.jogadores.length === 0 && estado.fase !== 'LOBBY') {
            resetarSalaCompleto();
            return;
        }

        atualizarUI();
    });
};

function atualizarUI() {
    const euPlayer = estado.jogadores.find(j => j.id === meuId);
    const euSpec = estado.espectadores?.includes(meuId);

    // Se não está em nenhuma lista, mostra login
    if (!euPlayer && !euSpec) {
        document.getElementById("area-login").style.display = "block";
        document.getElementById("area-jogo").style.display = "none";
        
        // Se o jogo já começou, desativa botão de entrar como player
        const btnPlayer = document.getElementById("btn-entrar-player");
        if (estado.fase !== 'LOBBY') {
            btnPlayer.disabled = true;
            btnPlayer.innerText = "Jogo em Andamento (Apenas Espec)";
            btnPlayer.style.opacity = "0.5";
        } else {
            btnPlayer.disabled = false;
            btnPlayer.innerText = "Entrar na Roda";
            btnPlayer.style.opacity = "1";
        }
        renderCores();
        return;
    }

    document.getElementById("area-login").style.display = "none";
    document.getElementById("area-jogo").style.display = "block";

    renderRoda();
    renderFeed();

    const statusTit = document.getElementById("status-titulo");
    const instrucao = document.getElementById("instrucao-vez");
    const fasePerg = document.getElementById("fase-pergunta");
    const faseResp = document.getElementById("fase-resposta");
    const faseRev = document.getElementById("fase-revelacao");
    const btnIni = document.getElementById("btn-iniciar");

    // Esconde tudo por padrão
    [fasePerg, faseResp, faseRev, btnIni].forEach(el => el.style.display = "none");
    instrucao.innerText = "";

    // LÓGICA DE ESPECTADOR (Apenas vê, não age)
    if (euSpec) {
        statusTit.innerText = `Assistindo: ${estado.fase}`;
        instrucao.innerText = "Você está no modo espectador.";
        return;
    }

    // LÓGICA DE JOGADOR ATIVO
    if (estado.fase === 'LOBBY') {
        statusTit.innerText = "Aguardando Jogadores...";
        if (estado.jogadores.length >= 2) btnIni.style.display = "inline-block";
    } 
    else if (estado.fase === 'ESCREVENDO') {
        statusTit.innerText = "Escreva sua Pergunta!";
        if (!euPlayer.pergunta) fasePerg.style.display = "block";
        else instrucao.innerText = "Aguardando os outros...";
    }
    else if (estado.fase === 'RESPONDENDO') {
        statusTit.innerText = "Responda!";
        if (!euPlayer.resposta) {
            faseResp.style.display = "block";
            document.getElementById("texto-pergunta-recebida").innerText = `Para você: ${euPlayer.perguntaRecebida}`;
        } else {
            instrucao.innerText = "Aguardando respostas...";
        }
    }
    else if (estado.fase === 'REVELANDO') {
        faseRev.style.display = "block";
        const idxAtual = estado.vezIndice;
        const idxProx = (idxAtual + 1) % estado.jogadores.length;
        const jAtual = estado.jogadores[idxAtual];
        const jProx = estado.jogadores[idxProx];

        const btnP = document.getElementById("btn-ler-pergunta");
        const btnR = document.getElementById("btn-ler-resposta");

        if (estado.subFase === 'PERGUNTA') {
            statusTit.innerText = `Vez de ${jAtual.nome}`;
            if (meuId === jAtual.id) {
                btnP.style.display = "inline-block";
                instrucao.innerHTML = `<span style="color:red">LEIA:</span> "${jAtual.perguntaRecebida}"`;
            } else btnP.style.display = "none";
        } else {
            statusTit.innerText = `Vez de ${jProx.nome}`;
            if (meuId === jProx.id) {
                btnR.style.display = "inline-block";
                instrucao.innerHTML = `<span style="color:blue">RESPONDA:</span> "${jProx.resposta}"`;
            } else btnR.style.display = "none";
        }
    }
}

// --- FUNÇÕES DE LOGIN E CORE ---

function renderCores() {
    const divCores = document.getElementById("cores");
    if (!divCores) return;

    // 1. Pegar cores que já estão em uso por outros jogadores na sala
    const coresUsadas = estado && estado.jogadores 
        ? estado.jogadores.map(j => j.corNome) 
        : [];

    divCores.innerHTML = ""; // Limpa para redesenhar

    coresDisponiveis.forEach(c => {
        const estaOcupada = coresUsadas.includes(c.nome);
        const estaSelecionada = corSelecionada === c.nome;
        
        const bolinha = document.createElement("div");
        bolinha.style.backgroundColor = c.cor;
        
        // Aplica as classes baseadas no estado atual
        bolinha.className = "cor";
        if (estaOcupada) bolinha.classList.add("indisponivel");
        if (estaSelecionada) bolinha.classList.add("selecionada");

        // Lógica de clique
        if (!estaOcupada) {
            bolinha.onclick = () => {
                corSelecionada = c.nome; // Define a cor localmente
                renderCores();           // Redesenha as bolinhas para mostrar o destaque
            };
        }

        divCores.appendChild(bolinha);
    });
}

function entrarNoJogo(tipo) {
    const nome = document.getElementById("nome").value;
    if (!nome) return alert("Digite seu nome!");

    if (tipo === 'spec') {
        db.collection("games").doc(ID_SALA).update({
            espectadores: firebase.firestore.FieldValue.arrayUnion(meuId)
        });
    } else {
        if (!corSelecionada) return alert("Escolha uma cor!");
        const novoJ = {
            id: meuId, nome, cor: coresDisponiveis.find(c => c.nome === corSelecionada).cor,
            corNome: corSelecionada, avatar: avatarBase64,
            pergunta: "", perguntaRecebida: "", resposta: ""
        };
        db.collection("games").doc(ID_SALA).update({
            jogadores: firebase.firestore.FieldValue.arrayUnion(novoJ)
        });
    }
}

function sairDoJogo() {
    const novosJogadores = estado.jogadores.filter(j => j.id !== meuId);
    const novosSpecs = (estado.espectadores || []).filter(id => id !== meuId);
    db.collection("games").doc(ID_SALA).update({
        jogadores: novosJogadores,
        espectadores: novosSpecs
    });
}

function removerJogador(idRemover) {
    const novos = estado.jogadores.filter(j => j.id !== idRemover);
    db.collection("games").doc(ID_SALA).update({ jogadores: novos });
}

function resetarSalaCompleto() {
    db.collection("games").doc(ID_SALA).set({
        fase: 'LOBBY',
        jogadores: [],
        espectadores: [],
        posts: [],
        vezIndice: 0,
        subFase: 'PERGUNTA'
    });
}

// --- LÓGICA DO GAMEPLAY ---

function enviarPergunta() {
    const txt = document.getElementById("input-pergunta").value;
    if (!txt) return;
    let jogadores = estado.jogadores.map(j => j.id === meuId ? { ...j, pergunta: txt } : j);
    
    if (jogadores.every(j => j.pergunta)) {
        // Sorteio Aleatório Fisher-Yates
        let pergs = jogadores.map(j => j.pergunta);
        let sorteio = [...pergs];
        let valido = false;
        while(!valido) {
            for (let i = sorteio.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sorteio[i], sorteio[j]] = [sorteio[j], sorteio[i]];
            }
            valido = jogadores.every((p, i) => p.pergunta !== sorteio[i]);
        }
        jogadores.forEach((j, i) => j.perguntaRecebida = sorteio[i]);
        db.collection("games").doc(ID_SALA).update({ jogadores, fase: 'RESPONDENDO' });
    } else {
        db.collection("games").doc(ID_SALA).update({ jogadores });
    }
}

function enviarResposta() {
    const txt = document.getElementById("input-resposta").value;
    if (!txt) return;
    let jogadores = estado.jogadores.map(j => j.id === meuId ? { ...j, resposta: txt } : j);
    if (jogadores.every(j => j.resposta)) {
        db.collection("games").doc(ID_SALA).update({ jogadores, fase: 'REVELANDO', vezIndice: 0, subFase: 'PERGUNTA' });
    } else {
        db.collection("games").doc(ID_SALA).update({ jogadores });
    }
}

function lerPergunta() {
    const j = estado.jogadores[estado.vezIndice];
    const post = { texto: `❓ ${j.nome} perguntou: "${j.perguntaRecebida}"`, cor: j.cor };
    db.collection("games").doc(ID_SALA).update({
        posts: firebase.firestore.FieldValue.arrayUnion(post),
        subFase: 'RESPOSTA'
    });
}

function lerResposta() {
    const proxIdx = (estado.vezIndice + 1) % estado.jogadores.length;
    const j = estado.jogadores[proxIdx];
    const post = { texto: `💡 ${j.nome} respondeu: "${j.resposta}"`, cor: j.cor };
    const fim = (estado.vezIndice === estado.jogadores.length - 1);
    db.collection("games").doc(ID_SALA).update({
        posts: firebase.firestore.FieldValue.arrayUnion(post),
        subFase: 'PERGUNTA',
        vezIndice: fim ? estado.vezIndice : estado.vezIndice + 1,
        fase: fim ? 'FINALIZADO' : 'REVELANDO'
    });
}

function iniciarRodada() {
    db.collection("games").doc(ID_SALA).update({ fase: 'ESCREVENDO', posts: [] });
}

// --- RENDERIZADORES ---

function renderRoda() {
    const l1 = document.getElementById("linha1");
    const l2 = document.getElementById("linha2");
    l1.innerHTML = ""; l2.innerHTML = "";
    
    const jogadores = estado.jogadores;
    const metade = Math.ceil(jogadores.length / 2);
    const cima = jogadores.slice(0, metade);
    const baixo = [...jogadores.slice(metade)].reverse();

    const criarHTML = (j, idx) => {
        let classe = "";
        if (estado.fase === 'REVELANDO') {
            if (idx === estado.vezIndice) classe = "ativo";
            else if (idx === (estado.vezIndice + 1) % jogadores.length) classe = "proximo";
        }
        const pronto = (estado.fase === 'ESCREVENDO' && j.pergunta) || (estado.fase === 'RESPONDENDO' && j.resposta);
        return `
            <div class="jogador ${classe} ${pronto ? 'pronto' : ''}" style="border-color:${j.cor}">
                <button class="btn-remover-card" onclick="removerJogador('${j.id}')">×</button>
                ${j.avatar ? `<img src="${j.avatar}">` : `<div class="sem-foto">?</div>`}
                <div class="nome" style="color:${j.cor}">${j.nome}</div>
            </div>`;
    };

    cima.forEach((j, i) => {
        let seta = (i < cima.length - 1) ? '➡️' : (baixo.length > 0 ? '⬇️' : '');
        l1.innerHTML += `<div class="bloco">${criarHTML(j, i)}${seta ? `<div class="seta">${seta}</div>` : ''}</div>`;
    });

    baixo.forEach((j, i) => {
        const idxReal = jogadores.length - 1 - i;
        let setaAntes = (i === baixo.length - 1) ? '⬆️' : '⬅️';
        l2.innerHTML += `<div class="bloco"><div class="seta">${setaAntes}</div>${criarHTML(j, idxReal)}</div>`;
    });
}

function renderFeed() {
    const lista = document.getElementById("lista-posts");
    lista.innerHTML = estado.posts.map(p => `<div class="post" style="border-left:5px solid ${p.cor}">${p.texto}</div>`).join('');
    const feed = document.getElementById("feed");
    feed.scrollTop = feed.scrollHeight;
}

// Upload Foto
document.getElementById('avatar').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = () => avatarBase64 = reader.result;
    reader.readAsDataURL(e.target.files[0]);
});