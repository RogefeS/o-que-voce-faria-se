// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCGEfEaxYHldR3tQ7XBeiZhhRhFV-VfkL4",
  authDomain: "o-que-voce-faria-se-6d98b.firebaseapp.com",
  projectId: "o-que-voce-faria-se-6d98b",
  storageBucket: "o-que-voce-faria-se-6d98b.firebasestorage.app",
  messagingSenderId: "497536776657",
  appId: "1:497536776657:web:3419ea750910f0720a48f0"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const ID_SALA = "sala_principal";

// --- ESTADO LOCAL ---
let meuId = localStorage.getItem("meuId");
if (!meuId) {
    meuId = '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("meuId", meuId);
}
let estado = null;
let corSelecionada = null; // Agora guarda o objeto inteiro da cor ou null
let avatarBase64 = null;

// Lista de cores (incluindo a neutra para Espectador)
const coresDisponiveis = [
    { nome: "red", cor: "#ff4d4d" }, 
    { nome: "blue", cor: "#3385ff" },
    { nome: "green", cor: "#00cc44" }, 
    { nome: "yellow", cor: "#e6e600" },
    { nome: "purple", cor: "#9933ff" }, 
    { nome: "orange", cor: "#ff944d" },
    { nome: "pink", cor: "#ff66b2" }, 
    { nome: "cyan", cor: "#00cccc" },
    // COR ESPECIAL PARA ESPECTADOR
    { nome: "spec", cor: "#cccccc", especial: true } 
];

// --- MONITORAMENTO (Realtime) ---
window.onload = () => {
    db.collection("games").doc(ID_SALA).onSnapshot((doc) => {
        if (!doc.exists) {
            resetarSalaCompleto(true); // Cria a sala se não existir
            return;
        }
        
        estado = doc.data();
        
        // Proteção contra undefined
        estado.jogadores = estado.jogadores || [];
        estado.espectadores = estado.espectadores || [];
        estado.posts = estado.posts || [];

        // Auto-Kick: Se o reset aconteceu e eu não estou na lista, recarrega
        if (estado.fase === 'LOBBY' && estado.jogadores.length === 0 && 
            document.getElementById("area-jogo").style.display === "block") {
            window.location.reload();
            return;
        }

        atualizarUI();
    }, (error) => {
        console.error("Erro no Listener:", error);
    });
};

// --- FUNÇÕES DE UI ---
function atualizarUI() {
    const euPlayer = estado.jogadores.find(j => j.id === meuId);
    const euSpec = estado.espectadores.find(j => j.id === meuId);

    // 1. TELA DE LOGIN
    if (!euPlayer && !euSpec) {
        document.getElementById("area-login").style.display = "block";
        document.getElementById("area-jogo").style.display = "none";
        renderCores();
        return;
    }

    // 2. TELA DE JOGO
    document.getElementById("area-login").style.display = "none";
    document.getElementById("area-jogo").style.display = "block";

    renderRoda();
    renderEspectadores();
    renderFeed();

    const statusTit = document.getElementById("status-titulo");
    const instrucao = document.getElementById("instrucao-vez");
    
    // Esconde todos os painéis de ação inicialmente
    ['fase-pergunta', 'fase-resposta', 'fase-revelacao', 'btn-iniciar'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    instrucao.innerText = "";
    document.getElementById("aviso-espera").style.display = "none";

    // MODO ESPECTADOR
    if (euSpec) {
        statusTit.innerText = `Assistindo (${estado.fase})`;
        instrucao.innerText = "Você está na plateia. Aguarde a próxima rodada.";
        return; 
    }

    // MODO JOGADOR (Lógica de Fases)
    if (estado.fase === 'LOBBY') {
        statusTit.innerText = "Aguardando Jogadores...";
        instrucao.innerText = "Convide amigos para entrar na roda!";
        // Botão de iniciar aparece se tiver pelo menos 2 (ou 1 para teste se quiser)
        if (estado.jogadores.length >= 2) { 
            document.getElementById("btn-iniciar").style.display = "inline-block";
        }
    } 
    else if (estado.fase === 'ESCREVENDO') {
        statusTit.innerText = "Escreva sua Pergunta!";
        if (!euPlayer.pergunta) {
            document.getElementById("fase-pergunta").style.display = "block";
        } else {
            instrucao.innerText = "Aguardando os outros jogadores...";
        }
    }
    else if (estado.fase === 'RESPONDENDO') {
        statusTit.innerText = "Hora de Responder!";
        if (!euPlayer.resposta) {
            document.getElementById("fase-resposta").style.display = "block";
            document.getElementById("texto-pergunta-recebida").innerText = `❓ Pergunta: "${euPlayer.perguntaRecebida}"`;
        } else {
            instrucao.innerText = "Aguardando todos responderem...";
        }
    }
    else if (estado.fase === 'REVELANDO') {
        document.getElementById("fase-revelacao").style.display = "block";
        
        // Garante índices válidos
        const numJogadores = estado.jogadores.length;
        const idxAtual = estado.vezIndice % numJogadores;
        const idxProx = (estado.vezIndice + 1) % numJogadores;
        const idxProxProx = (estado.vezIndice + 2) % numJogadores;
        
        const jAtual = estado.jogadores[idxAtual];
        const jProx = estado.jogadores[idxProx];
        const jProxProx = estado.jogadores[idxProxProx];

        const btnP = document.getElementById("btn-ler-pergunta");
        const btnR = document.getElementById("btn-ler-resposta");
        const aviso = document.getElementById("aviso-espera");
        const previewBox = document.getElementById("preview-leitura");

        if (estado.subFase === 'PERGUNTA') {
            statusTit.innerText = `📖 Vez de ${jAtual.nome}`;
            document.getElementById("quem-vez").style.display = "block";
            document.getElementById("nome-vez").innerText = jAtual.nome;
            
            if (meuId === jAtual.id) {
                // SUA VEZ LER PERGUNTA
                previewBox.style.display = "block";
                previewBox.classList.add("liberar");
                document.getElementById("texto-para-ler").innerText = `"${jAtual.perguntaRecebida}"`;
                
                btnP.style.display = "inline-block";
                btnP.disabled = false;
                instrucao.innerHTML = `<span style="color:#ff6b6b; font-weight:bold;">🎤 SUA VEZ!</span><br>Leia a pergunta acima e clique no botão:`;
                btnR.style.display = "none";
                btnR.disabled = true;
            } else if (meuId === jProx.id) {
                // PRÓXIMO VAI LER A RESPOSTA - OFERECE PREVIEW ANTECIPADAMENTE
                previewBox.style.display = "block";
                previewBox.classList.add("liberar");
                document.getElementById("texto-para-ler").innerText = `"${jProx.resposta}"`;
                
                btnR.style.display = "inline-block";
                btnR.disabled = false;
                instrucao.innerHTML = `<span style="color:#4ecdc4; font-weight:bold;">⏭️ PRÓXIMO!</span><br>Você lê a resposta acima assim que ${jAtual.nome} terminar:`;
                btnP.style.display = "none";
                btnP.disabled = true;
            } else if (meuId === jProxProx.id) {
                // PRÓXIMO DO PRÓXIMO VAI LER A PERGUNTA - OFERECE PREVIEW ANTECIPADAMENTE
                previewBox.style.display = "block";
                previewBox.classList.add("liberar");
                document.getElementById("texto-para-ler").innerText = `"${jProxProx.perguntaRecebida}"`;
                
                btnP.style.display = "inline-block";
                btnP.disabled = true;
                instrucao.innerHTML = `<span style="color:#ff9800; font-weight:bold;">⏳ PREPARANDO...</span><br>Você lerá esta pergunta em breve:`;
                btnR.style.display = "none";
                btnR.disabled = true;
            } else {
                previewBox.style.display = "none";
                previewBox.classList.remove("liberar");
                btnP.style.display = "none";
                btnP.disabled = true;
                btnR.style.display = "none";
                btnR.disabled = true;
                aviso.style.display = "block";
                aviso.innerText = `${jAtual.nome} vai ler a pergunta...`;
            }
        } else { // SUBFASE RESPOSTA
            statusTit.innerText = `🗣️ Vez de ${jProx.nome}`;
            document.getElementById("quem-vez").style.display = "block";
            document.getElementById("nome-vez").innerText = jProx.nome;
            
            if (meuId === jProx.id) {
                // SUA VEZ LER RESPOSTA
                previewBox.style.display = "block";
                previewBox.classList.add("liberar");
                document.getElementById("texto-para-ler").innerText = `"${jProx.resposta}"`;
                
                btnR.style.display = "inline-block";
                btnR.disabled = false;
                instrucao.innerHTML = `<span style="color:#4ecdc4; font-weight:bold;">🎤 SUA VEZ!</span><br>Leia a resposta acima e clique no botão:`;
                btnP.style.display = "none";
                btnP.disabled = true;
            } else if (meuId === jProxProx.id) {
                // PRÓXIMO VAI LER A PERGUNTA - OFERECE PREVIEW ANTECIPADAMENTE
                previewBox.style.display = "block";
                previewBox.classList.add("liberar");
                document.getElementById("texto-para-ler").innerText = `"${jProxProx.perguntaRecebida}"`;
                
                btnP.style.display = "inline-block";
                btnP.disabled = false;
                instrucao.innerHTML = `<span style="color:#ff6b6b; font-weight:bold;">⏭️ PRÓXIMO!</span><br>Você lerá a pergunta acima assim que ${jProx.nome} terminar:`;
                btnR.style.display = "none";
                btnR.disabled = true;
            } else {
                previewBox.style.display = "none";
                previewBox.classList.remove("liberar");
                btnR.style.display = "none";
                btnR.disabled = true;
                btnP.style.display = "none";
                btnP.disabled = true;
                aviso.style.display = "block";
                aviso.innerText = `${jProx.nome} vai ler a resposta...`;
            }
        }
    }
}

// --- FUNÇÕES DE ENTRADA E CORES ---
function renderCores() {
    const divCores = document.getElementById("cores");
    if (!divCores) return;
    divCores.innerHTML = "";

    // Apenas jogadores ativos travam as cores (Specs não travam)
    const coresOcupadas = (estado && estado.jogadores) 
        ? estado.jogadores.map(j => j.corNome) 
        : [];

    coresDisponiveis.forEach(c => {
        const ocupada = coresOcupadas.includes(c.nome) && !c.especial;
        const selecionada = corSelecionada && corSelecionada.nome === c.nome;
        
        // Cria elemento
        const el = document.createElement("div");
        el.className = `cor ${ocupada ? 'indisponivel' : ''} ${selecionada ? 'selecionada' : ''}`;
        el.style.backgroundColor = c.cor;
        if(c.especial) el.setAttribute("data-spec", "true");

        if (!ocupada) {
            el.onclick = () => {
                corSelecionada = c;
                renderCores(); // Atualiza visual
                atualizarBotaoEntrada(); // Muda texto do botão
            };
        }
        divCores.appendChild(el);
    });
}

function atualizarBotaoEntrada() {
    const btn = document.getElementById("btn-entrar");
    if (!corSelecionada) {
        btn.innerText = "Escolha uma cor";
        btn.style.background = "#007bff";
    } else if (corSelecionada.especial) {
        btn.innerText = "Entrar como ESPECTADOR";
        btn.style.background = "#6c757d"; // Cinza
    } else {
        btn.innerText = "Entrar na Roda";
        btn.style.background = "#007bff";
    }
}

function processarEntrada() {
    const nome = document.getElementById("nome").value.trim();
    if (!nome) return alert("Por favor, digite seu nome.");
    if (!corSelecionada) return alert("Selecione uma cor ou a opção de espectador.");

    const usuario = {
        id: meuId,
        nome: nome,
        cor: corSelecionada.cor,
        corNome: corSelecionada.nome,
        avatar: avatarBase64 || null
    };

    if (corSelecionada.especial) {
        // Entrar como Espectador
        db.collection("games").doc(ID_SALA).update({
            espectadores: firebase.firestore.FieldValue.arrayUnion(usuario)
        });
    } else {
        // Entrar como Jogador
        // Inicializa campos vazios para evitar erros de undefined
        usuario.pergunta = ""; 
        usuario.perguntaRecebida = ""; 
        usuario.resposta = "";
        
        db.collection("games").doc(ID_SALA).update({
            jogadores: firebase.firestore.FieldValue.arrayUnion(usuario)
        });
    }
}

// --- COMANDOS DE JOGO ---

function enviarPergunta() {
    const input = document.getElementById("input-pergunta");
    const txt = input.value.trim();
    if(!txt) return;

    let novos = estado.jogadores.map(j => j.id === meuId ? {...j, pergunta: txt} : j);
    
    // Verifica se TODOS escreveram
    if (novos.every(j => j.pergunta)) {
        
        // --- LÓGICA DE SORTEIO CORRIGIDA ---
        let perguntas = novos.map(j => j.pergunta);
        let sorteadas = [...perguntas];
        
        // Só embaralha se tiver mais de 1 jogador
        if (novos.length > 1) {
            let valido = false;
            let tentativas = 0;
            // Tenta embaralhar até que ninguém pegue a própria (max 50 tentativas para não travar)
            while(!valido && tentativas < 50) {
                tentativas++;
                // Fisher-Yates
                for (let i = sorteadas.length - 1; i > 0; i--) {
                    const r = Math.floor(Math.random() * (i + 1));
                    [sorteadas[i], sorteadas[r]] = [sorteadas[r], sorteadas[i]];
                }
                // Validação: ninguém pode ter a pergunta igual à que escreveu
                valido = novos.every((j, i) => j.pergunta !== sorteadas[i]);
            }
            // Se falhar (muito raro com >2 players), rotaciona simples
            if (!valido) {
                const p = sorteadas.shift();
                sorteadas.push(p);
            }
        } 
        // Se for 1 jogador, ele recebe a própria pergunta (modo teste)

        novos.forEach((j, i) => j.perguntaRecebida = sorteadas[i]);
        
        db.collection("games").doc(ID_SALA).update({ 
            jogadores: novos, 
            fase: 'RESPONDENDO' 
        });
    } else {
        db.collection("games").doc(ID_SALA).update({ jogadores: novos });
    }
}

function enviarResposta() {
    const input = document.getElementById("input-resposta");
    const txt = input.value.trim();
    if(!txt) return;

    let novos = estado.jogadores.map(j => j.id === meuId ? {...j, resposta: txt} : j);
    
    if (novos.every(j => j.resposta)) {
        db.collection("games").doc(ID_SALA).update({ 
            jogadores: novos, 
            fase: 'REVELANDO', 
            vezIndice: 0, 
            subFase: 'PERGUNTA' 
        });
    } else {
        db.collection("games").doc(ID_SALA).update({ jogadores: novos });
    }
}

// --- CONTROLE DE TURNO SEGURO ---

function lerPergunta() {
    const jAtual = estado.jogadores[estado.vezIndice];
    
    // SEGURANÇA: Só o dono da vez pode disparar
    if (jAtual.id !== meuId) return alert("Não é sua vez!");

    const msg = `❓ ${jAtual.nome} leu: "${jAtual.perguntaRecebida}"`;
    
    db.collection("games").doc(ID_SALA).update({
        posts: firebase.firestore.FieldValue.arrayUnion({ texto: msg, cor: jAtual.cor }),
        subFase: 'RESPOSTA'
    });
}

function lerResposta() {
    const num = estado.jogadores.length;
    const idxProx = (estado.vezIndice + 1) % num;
    const jProx = estado.jogadores[idxProx];
    
    // SEGURANÇA
    if (jProx.id !== meuId) return alert("Não é sua vez!");

    const msg = `💡 ${jProx.nome} respondeu: "${jProx.resposta}"`;
    const fimDaRodada = (estado.vezIndice === num - 1);

    // Se acabou a rodada (último leu resposta), volta pro lobby ou finaliza
    if (fimDaRodada) {
         db.collection("games").doc(ID_SALA).update({
            posts: firebase.firestore.FieldValue.arrayUnion({ texto: msg, cor: jProx.cor }),
            fase: 'LOBBY', // Volta para o lobby para reiniciar
            jogadores: estado.jogadores.map(x => ({...x, pergunta:'', perguntaRecebida:'', resposta:''})) // Limpa dados
        });
    } else {
        // Passa a vez para o próximo par e LIBERA a próxima pergunta
        const proximoIndice = estado.vezIndice + 1;
        const proximoJogador = estado.jogadores[proximoIndice];
        
        // Atualiza no Firebase: posta a resposta, muda vez e libera pergunta do próximo
        db.collection("games").doc(ID_SALA).update({
            posts: firebase.firestore.FieldValue.arrayUnion({ texto: msg, cor: jProx.cor }),
            subFase: 'PERGUNTA',
            vezIndice: proximoIndice
            // O listener vai disparar e renderizar tudo automaticamente
        });
    }
}

function iniciarRodada() {
    db.collection("games").doc(ID_SALA).update({ fase: 'ESCREVENDO', posts: [] });
}

// --- UTILITÁRIOS (Reset, Sair, Upload) ---

function sairDoJogo() {
    if(!confirm("Sair da sala?")) return;
    removerDoBanco(meuId);
    window.location.reload();
}

function removerJogador(idAlvo) {
    if(!confirm("Expulsar este jogador?")) return;
    removerDoBanco(idAlvo);
}

function removerDoBanco(id) {
    // Filtro seguro com (|| [])
    const novosJogadores = (estado.jogadores || []).filter(j => j.id !== id);
    const novosSpecs = (estado.espectadores || []).filter(j => j.id !== id);
    
    db.collection("games").doc(ID_SALA).update({
        jogadores: novosJogadores,
        espectadores: novosSpecs
    });
}

// Função ROBUSTA de Reset
function resetarSalaCompleto(silencioso = false) {
    if (!silencioso && !confirm("⚠️ ATENÇÃO: Isso vai apagar tudo e reiniciar o servidor. Continuar?")) return;

    console.log("Resetando sala...");
    
    // Sobrescreve o documento inteiro (não é update, é set)
    db.collection("games").doc(ID_SALA).set({
        fase: 'LOBBY',
        subFase: 'PERGUNTA',
        vezIndice: 0,
        jogadores: [],
        espectadores: [],
        posts: [],
        resetadoEm: new Date().toISOString()
    }).then(() => {
        if(!silencioso) {
            alert("Sala resetada com sucesso!");
            window.location.reload();
        }
    }).catch(err => {
        console.error("Erro ao resetar:", err);
        alert("Erro ao resetar (ver console).");
    });
}

// Upload Avatar com Compressão
document.getElementById('avatar').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(file){
        // Validação de tipo
        if (!file.type.startsWith('image/')) {
            return alert("Por favor, selecione um arquivo de imagem válido.");
        }
        
        // Validação de tamanho original
        if (file.size > 5 * 1024 * 1024) {
            return alert("Imagem muito grande! Máximo 5MB. Tente comprimir.");
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            // Criar imagem para redimensiolomar
            const img = new Image();
            img.onload = () => {
                // Redimensionar para máximo 300x300
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > 300) {
                        height *= 300 / width;
                        width = 300;
                    }
                } else {
                    if (height > 300) {
                        width *= 300 / height;
                        height = 300;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter para base64 com qualidade reduzida
                avatarBase64 = canvas.toDataURL('image/jpeg', 0.7);
                document.getElementById("preview-avatar").innerText = "✅ Foto carregada: " + file.name;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// --- RENDERIZADORES VISUAIS ---
function renderRoda() {
    const l1 = document.getElementById("linha1");
    const l2 = document.getElementById("linha2");
    l1.innerHTML = ""; l2.innerHTML = "";

    const jogs = estado.jogadores || [];
    const metade = Math.ceil(jogs.length / 2);
    const cima = jogs.slice(0, metade);
    const baixo = jogs.slice(metade).reverse();
    
    // Determina indices reais para lógica de "ativo"
    const criarHTML = (j, idxReal) => {
        let classe = "";
        const num = jogs.length;
        
        // Lógica visual de "quem é a vez"
        if (estado.fase === 'REVELANDO') {
            const idxVez = estado.vezIndice % num;
            const idxProx = (estado.vezIndice + 1) % num;

            if (estado.subFase === 'PERGUNTA' && idxReal === idxVez) classe = "ativo";
            else if (estado.subFase === 'RESPOSTA' && idxReal === idxProx) classe = "ativo";
        }
        
        const pronto = (estado.fase === 'ESCREVENDO' && j.pergunta) || (estado.fase === 'RESPONDENDO' && j.resposta);
        
        return `
        <div class="bloco">
            <div class="jogador ${classe} ${pronto?'pronto':''}" style="border-color:${j.cor}">
                <button class="btn-remover-card" onclick="removerJogador('${j.id}')">×</button>
                ${j.avatar ? `<img src="${j.avatar}">` : `<div class="sem-foto">?</div>`}
                <div class="nome" style="color:${j.cor}">${j.nome}</div>
            </div>
        </div>`;
    };

    cima.forEach((j, i) => {
        let seta = (i < cima.length - 1) ? '➡️' : (baixo.length > 0 ? '⬇️' : '');
        l1.innerHTML += criarHTML(j, i) + (seta ? `<div class="seta">${seta}</div>` : '');
    });

    baixo.forEach((j, i) => {
        let idxReal = jogs.length - 1 - i;
        let setaAntes = (i === 0) ? '⬆️' : '⬅️';
        l2.innerHTML += `<div class="seta">${setaAntes}</div>` + criarHTML(j, idxReal);
    });
}

function renderEspectadores() {
    const div = document.getElementById("lista-espectadores");
    const container = document.getElementById("area-espectadores");
    const specs = estado.espectadores || [];

    if(!div || !container) return; // Segurança

    document.getElementById("count-specs").innerText = specs.length;
    container.style.display = specs.length > 0 ? "block" : "none";
    div.innerHTML = "";

    specs.forEach(s => {
        div.innerHTML += `
        <div class="spec-bubble">
            ${s.avatar ? `<img src="${s.avatar}">` : ''}
            <span>${s.nome}</span>
            ${(meuId === s.id || estado.jogadores.find(j=>j.id===meuId)) ? `<span onclick="removerDoBanco('${s.id}')" style="cursor:pointer;color:red;margin-left:5px;">×</span>` : ''}
        </div>`;
    });
}

function renderFeed() {
    const feed = document.getElementById("lista-posts");
    if(!feed) return;
    feed.innerHTML = (estado.posts || []).map(p => 
        `<div class="post" style="border-left: 5px solid ${p.cor || '#ccc'}">${p.texto}</div>`
    ).join('');
    
    // Scroll automático seguro
    const container = document.getElementById("feed");
    if(container) container.scrollTop = container.scrollHeight;
}