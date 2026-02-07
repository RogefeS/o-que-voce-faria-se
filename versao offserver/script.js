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

function addJogador() {
  let nome = document.getElementById("nome").value;
  let avatarInput = document.getElementById("avatar");
  let avatarURL = avatarInput.files[0] ? URL.createObjectURL(avatarInput.files[0]) : null;
  if (!corSelecionada) { alert("Escolha uma cor antes!"); return; }
  let corObj = coresDisponiveis.find(c => c.nome === corSelecionada);
  jogadores.push({nome, avatar: avatarURL, cor: corObj.cor, corNome: corObj.nome});
  corSelecionada = null;
  renderRoda();
  document.getElementById("nome").value = "";
  avatarInput.value = "";
}

function removerJogador(index) {
  let corNome = jogadores[index].corNome;
  let corObj = coresDisponiveis.find(c => c.nome === corNome);
  // liberar cor novamente
  let divs = document.querySelectorAll(".cor");
  divs.forEach(d => {
    if (d.style.background === corObj.cor) {
      d.classList.remove("indisponivel");
      d.onclick = function(){selecionarCor(corNome)};
    }
  });
  jogadores.splice(index, 1);
  renderRoda();
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