const API_URL = 'http://localhost:3000/produtos';
const API_URL_USUARIOS = 'http://localhost:3000/usuarios';

document.addEventListener('DOMContentLoaded', () => {
    verificarLogin();

    // ROTEADOR
    if (document.getElementById('secao-destaques')) {
        // Estamos na Home
        carregarDestaques();
        carregarTodosProdutos();
        
        // Ativa pesquisa pelo Botão
        const btnPesquisa = document.querySelector('button[onclick="pesquisarProdutos()"]');
        if(btnPesquisa) {
            // Removemos o onclick do HTML via JS para evitar conflito e usamos listener
            btnPesquisa.removeAttribute('onclick'); 
            btnPesquisa.addEventListener('click', pesquisarProdutos);
        }

        // Ativa pesquisa pelo ENTER
        const inputPesquisa = document.getElementById('campo-pesquisa');
        if(inputPesquisa) {
            inputPesquisa.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    pesquisarProdutos();
                }
            });
        }
    } 
    else if (document.getElementById('detalhe-produto-container')) {
        carregarDetalhesProduto();
    } 
    else if (document.getElementById('lista-carrinho')) { 
        carregarPaginaCarrinho();
    }
    else if (document.getElementById('form-cadastro-produto')) {
        verificarPermissaoAdmin();
        iniciarFormularioCadastro();
    } 
    else if (document.getElementById('form-editar-produto')) {
        verificarPermissaoAdmin();
        iniciarFormularioEdicao();
    }
    else if (document.getElementById('graficoPrecos')) { 
        carregarDashboard();
    }
    else if (document.getElementById('form-login')) {
        iniciarLogin();
    }
    else if (document.getElementById('form-cadastro-usuario')) {
        iniciarCadastroUsuario();
    }
    else if (document.getElementById('favoritos-container')) {
        carregarPaginaFavoritos();
    }
});

// =================================================================
// 1. FUNÇÕES DE PESQUISA (CORRIGIDAS)
// =================================================================

function pesquisarProdutos() {
    const input = document.getElementById('campo-pesquisa');
    if(input) {
        const termo = input.value;
        console.log("Pesquisando por:", termo); // Para debug no F12
        carregarTodosProdutos(termo);
    }
}

async function carregarTodosProdutos(termoPesquisa = '') {
    const container = document.getElementById('cards-container');
    if (!container) return;
    
    // Mostra loading enquanto busca
    container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"></div></div>';

    let produtos = await fetchProdutos();
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    // LÓGICA DE FILTRO MELHORADA (Nome E Descrição)
    if (termoPesquisa) {
        const termo = termoPesquisa.toLowerCase();
        produtos = produtos.filter(p => 
            p.nome.toLowerCase().includes(termo) || 
            (p.descricao && p.descricao.toLowerCase().includes(termo))
        );
    }

    container.innerHTML = ''; // Limpa o loading

    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <h4 class="text-muted">Nenhum produto encontrado 😢</h4>
                <p>Tente buscar por outro termo.</p>
                ${termoPesquisa ? '<button class="btn btn-outline-primary" onclick="limparPesquisa()">Ver Todos</button>' : ''}
            </div>`;
        return;
    }

    produtos.forEach(produto => {
        let icone = 'bi-heart';
        let cor = '';
        if (usuarioLogado && usuarioLogado.favoritos && usuarioLogado.favoritos.includes(String(produto.id))) {
            icone = 'bi-heart-fill';
            cor = 'text-danger';
        }

        const imgPath = produto.imagem_principal ? produto.imagem_principal.replace('/public/', '') : '';

        const cardHtml = `
            <div class="col">
                <div class="card h-100 shadow-sm">
                    <img src="${imgPath}" class="card-img-top" alt="${produto.nome}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0 text-truncate" style="max-width: 80%;">${produto.nome}</h5>
                            <button class="btn btn-link p-0 ${cor}" onclick="toggleFavorito('${produto.id}')">
                                <i class="bi ${icone} fs-4"></i>
                            </button>
                        </div>
                        <p class="card-text text-muted small">${produto.descricao}</p>
                        <h5 class="text-primary fw-bold">${produto.preco}</h5>
                    </div>
                    <div class="card-footer bg-white border-top-0 d-flex gap-2">
                        <a href="detalhe.html?id=${produto.id}" class="btn btn-outline-primary flex-grow-1">Ver</a>
                        <button class="btn btn-success" onclick="adicionarAoCarrinho('${produto.id}')" title="Adicionar ao Carrinho">
                            <i class="bi bi-cart-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

function limparPesquisa() {
    document.getElementById('campo-pesquisa').value = '';
    carregarTodosProdutos();
}

// =================================================================
// 2. SISTEMA DE CARRINHO
// =================================================================

function adicionarAoCarrinho(idProduto) {
    let carrinho = JSON.parse(localStorage.getItem('carrinhoMaquiadoro')) || [];
    const itemExistente = carrinho.find(item => item.id == idProduto);
    
    if (itemExistente) {
        itemExistente.qtd += 1;
    } else {
        carrinho.push({ id: idProduto, qtd: 1 });
    }

    localStorage.setItem('carrinhoMaquiadoro', JSON.stringify(carrinho));
    alert('Produto adicionado ao carrinho! 🛒');
}

async function carregarPaginaCarrinho() {
    const container = document.getElementById('lista-carrinho');
    const totalElement = document.getElementById('total-carrinho');
    const subtotalElement = document.getElementById('subtotal-carrinho');
    
    let carrinho = JSON.parse(localStorage.getItem('carrinhoMaquiadoro')) || [];

    if (carrinho.length === 0) {
        container.innerHTML = `
            <div class="alert alert-light text-center py-5 border">
                <h4>Seu carrinho está vazio 😢</h4>
                <p>Vá para a loja e adicione alguns produtos!</p>
                <a href="index.html" class="btn btn-primary mt-3">Ir para a Loja</a>
            </div>
        `;
        if(totalElement) totalElement.innerText = 'R$ 0,00';
        if(subtotalElement) subtotalElement.innerText = 'R$ 0,00';
        return;
    }

    const todosProdutos = await fetchProdutos();
    let total = 0;
    container.innerHTML = '';

    carrinho.forEach((item, index) => {
        const produtoReal = todosProdutos.find(p => String(p.id) === String(item.id));
        
        if (produtoReal) {
            const precoNumerico = parsePrice(produtoReal.preco);
            const subtotalItem = precoNumerico * item.qtd;
            total += subtotalItem;

            const imgPath = produtoReal.imagem_principal ? produtoReal.imagem_principal.replace('/public/', '') : '';

            container.innerHTML += `
                <div class="list-group-item p-3 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <img src="${imgPath}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 20px;">
                        <div>
                            <h5 class="mb-1">${produtoReal.nome}</h5>
                            <p class="text-muted mb-0 small">Unit: ${produtoReal.preco}</p>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-4">
                        <div class="text-end">
                            <span class="d-block text-muted small">Qtd: ${item.qtd}</span>
                            <strong class="text-primary">R$ ${subtotalItem.toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <button class="btn btn-outline-danger btn-sm" onclick="removerDoCarrinho(${index})" title="Remover">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    });

    const valorFormatado = 'R$ ' + total.toFixed(2).replace('.', ',');
    if(totalElement) totalElement.innerText = valorFormatado;
    if(subtotalElement) subtotalElement.innerText = valorFormatado;
}

function removerDoCarrinho(index) {
    let carrinho = JSON.parse(localStorage.getItem('carrinhoMaquiadoro')) || [];
    carrinho.splice(index, 1);
    localStorage.setItem('carrinhoMaquiadoro', JSON.stringify(carrinho));
    carregarPaginaCarrinho();
}

function limparCarrinho() {
    if(confirm("Tem certeza que deseja esvaziar o carrinho?")) {
        localStorage.removeItem('carrinhoMaquiadoro');
        carregarPaginaCarrinho();
    }
}

function finalizarCompra() {
    const carrinho = JSON.parse(localStorage.getItem('carrinhoMaquiadoro')) || [];
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }
    alert('🎉 Compra realizada com sucesso!\nObrigado pela preferência.');
    localStorage.removeItem('carrinhoMaquiadoro');
    window.location.href = 'index.html';
}

// =================================================================
// 3. LOGIN E PERMISSÕES
// =================================================================

function verificarLogin() {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    const menuLogin = document.getElementById('menu-login');
    const menuLogout = document.getElementById('menu-logout');
    const menuAdmin = document.getElementById('menu-admin');
    const menuFavoritos = document.getElementById('menu-favoritos');

    if (usuarioLogado) {
        if(menuLogin) menuLogin.style.display = 'none';
        if(menuLogout) menuLogout.style.display = 'block';
        if(menuFavoritos) menuFavoritos.style.display = 'block';

        if (usuarioLogado.admin && menuAdmin) {
            menuAdmin.style.display = 'block';
        }
    } else {
        if(menuLogin) menuLogin.style.display = 'block';
        if(menuLogout) menuLogout.style.display = 'none';
        if(menuFavoritos) menuFavoritos.style.display = 'none';
        if(menuAdmin) menuAdmin.style.display = 'none';
    }
}

function logout() {
    sessionStorage.removeItem('usuarioLogado');
    alert('Você saiu do sistema.');
    window.location.href = 'index.html';
}

function verificarPermissaoAdmin() {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado || !usuarioLogado.admin) {
        alert('Acesso negado!');
        window.location.href = 'index.html';
    }
}

function iniciarLogin() {
    const form = document.getElementById('form-login');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const login = document.getElementById('loginUsuario').value;
        const senha = document.getElementById('senhaUsuario').value;

        try {
            const response = await fetch(API_URL_USUARIOS);
            const usuarios = await response.json();
            const usuarioEncontrado = usuarios.find(u => u.login === login && u.senha === senha);

            if (usuarioEncontrado) {
                if (!usuarioEncontrado.favoritos) usuarioEncontrado.favoritos = [];
                sessionStorage.setItem('usuarioLogado', JSON.stringify(usuarioEncontrado));
                alert(`Bem-vindo(a), ${usuarioEncontrado.nome}!`);
                window.location.href = 'index.html';
            } else {
                alert('Usuário ou senha incorretos!');
            }
        } catch (error) {
            alert('Erro ao conectar.');
        }
    });
}

function iniciarCadastroUsuario() {
    const form = document.getElementById('form-cadastro-usuario');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoUsuario = {
            nome: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            login: document.getElementById('login').value,
            senha: document.getElementById('senha').value,
            admin: false, 
            favoritos: []
        };
        try {
            await fetch(API_URL_USUARIOS, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(novoUsuario)
            });
            alert('Conta criada com sucesso! Faça login.');
            window.location.href = 'login.html';
        } catch (error) { alert('Erro ao cadastrar.'); }
    });
}

// =================================================================
// 4. FAVORITOS E DETALHES
// =================================================================

async function toggleFavorito(idProduto) {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) { alert('Faça login para favoritar!'); return; }

    if (!usuarioLogado.favoritos) usuarioLogado.favoritos = [];
    const idString = String(idProduto);
    const index = usuarioLogado.favoritos.findIndex(fav => String(fav) === idString);

    if (index === -1) {
        usuarioLogado.favoritos.push(idString);
        alert('Adicionado aos favoritos!');
    } else {
        usuarioLogado.favoritos.splice(index, 1);
        alert('Removido dos favoritos.');
    }

    try {
        await fetch(`${API_URL_USUARIOS}/${usuarioLogado.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ favoritos: usuarioLogado.favoritos })
        });
        sessionStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
        
        if (document.getElementById('cards-container')) carregarTodosProdutos(); 
        if (document.getElementById('favoritos-container')) carregarPaginaFavoritos();
    } catch (error) { console.error(error); alert('Erro ao salvar favorito.'); }
}

async function carregarPaginaFavoritos() {
    const container = document.getElementById('favoritos-container');
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) { window.location.href = 'login.html'; return; }

    const todosProdutos = await fetchProdutos();
    const favoritos = todosProdutos.filter(p => usuarioLogado.favoritos && usuarioLogado.favoritos.some(fav => String(fav) === String(p.id)));

    if (favoritos.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-center text-muted">Você ainda não tem produtos favoritos.</p></div>';
        return;
    }

    container.innerHTML = '';
    favoritos.forEach(produto => {
        const imgPath = produto.imagem_principal ? produto.imagem_principal.replace('/public/', '') : '';
        const cardHtml = `
            <div class="col">
                <div class="card h-100 shadow-sm" style="border: 2px solid var(--cor-primaria);">
                    <img src="${imgPath}" class="card-img-top" alt="${produto.nome}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <h5 class="card-title">${produto.nome}</h5>
                            <button class="btn btn-link p-0" onclick="toggleFavorito('${produto.id}')">
                                <i class="bi bi-heart-fill text-danger fs-4"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-footer">
                        <a href="detalhe.html?id=${produto.id}" class="btn btn-primary w-100">Ver</a>
                    </div>
                </div>
            </div>`;
        container.innerHTML += cardHtml;
    });
}

async function carregarDetalhesProduto() {
    const params = new URLSearchParams(window.location.search);
    const idProduto = params.get('id');
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!idProduto) { window.location.href = 'index.html'; return; }

    const produto = await fetchProdutoPorId(idProduto);
    if (!produto) { alert('Produto não encontrado!'); window.location.href = 'index.html'; return; }

    document.title = produto.nome + " - Detalhes";
    const imgPath = produto.imagem_principal ? produto.imagem_principal.replace('/public/', '') : '';

    let botoesAcao = '';
    if (usuarioLogado && usuarioLogado.admin) {
        botoesAcao = `
            <div class="mt-4 p-3 bg-light rounded border">
                <h6 class="text-muted mb-2"><i class="bi bi-shield-lock"></i> Admin</h6>
                <a href="editar_produto.html?id=${produto.id}" class="btn btn-warning me-2">Editar</a>
                <button id="btn-excluir" class="btn btn-danger">Excluir</button>
            </div>`;
    } else {
        botoesAcao = `
            <div class="mt-4 d-flex gap-2">
                <button class="btn btn-success btn-lg flex-grow-1" onclick="adicionarAoCarrinho('${produto.id}')">
                    <i class="bi bi-cart-plus"></i> Adicionar ao Carrinho
                </button>
            </div>`;
    }

    const infoContainer = document.getElementById('info-gerais');
    infoContainer.innerHTML = `
        <div class="col-md-6"><img src="${imgPath}" class="img-fluid rounded shadow-lg"></div>
        <div class="col-md-6"><h2>${produto.nome}</h2><h4 class="text-muted">${produto.marca}</h4><h3 class="text-primary my-3">${produto.preco}</h3><p class="lead">${produto.descricao}</p><hr><h5>Sobre:</h5><p>${produto.conteudo}</p>${botoesAcao}</div>`;

    const btnExcluir = document.getElementById('btn-excluir');
    if (btnExcluir) btnExcluir.addEventListener('click', () => { excluirProduto(produto.id); });

    const galeriaContainer = document.getElementById('galeria-container');
    if (produto.galeria && produto.galeria.length > 0) {
        galeriaContainer.innerHTML = '';
        produto.galeria.forEach(foto => {
            const imgG = foto.imagem ? foto.imagem.replace('/public/', '') : '';
            galeriaContainer.innerHTML += `<div class="col"><div class="card"><img src="${imgG}" class="card-img-top"></div></div>`;
        });
    }
}

// =================================================================
// 5. FUNÇÕES AUXILIARES, API E DASHBOARD
// =================================================================

async function fetchProdutos() {
    try {
        const response = await fetch(API_URL);
        return await response.json();
    } catch (error) { console.error("Erro API", error); return []; }
}

async function fetchProdutoPorId(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) { return null; }
}

function parsePrice(priceString) {
    if (!priceString) return 0;
    return parseFloat(priceString.replace("R$", "").trim().replace(",", "."));
}

async function carregarDestaques() {
    const container = document.getElementById('carrossel-inner-container');
    if (!container) return;
    container.innerHTML = '';
    const produtos = await fetchProdutos();
    const produtosDestaque = produtos.filter(p => p.destaque === true);
    if (produtosDestaque.length === 0) { container.innerHTML = '<div class="carousel-item active"><p class="text-center p-5 text-white">Sem destaques.</p></div>'; return; }
    produtosDestaque.forEach((produto, index) => {
        const activeClass = (index === 0) ? 'active' : '';
        const imgPath = produto.imagem_principal ? produto.imagem_principal.replace('/public/', '') : ''; 
        const itemHtml = `<div class="carousel-item ${activeClass}"><img src="${imgPath}" class="d-block w-100" alt="${produto.nome}"><div class="carousel-caption d-none d-md-block"><h5>${produto.nome}</h5><a href="detalhe.html?id=${produto.id}" class="btn btn-primary">Ver Detalhes</a></div></div>`;
        container.innerHTML += itemHtml;
    });
}

async function carregarDashboard() {
    const ctx = document.getElementById('graficoPrecos');
    if (!ctx) return;
    const produtos = await fetchProdutos();
    if (produtos.length === 0) return;
    const labels = produtos.map(p => p.nome);
    const data = produtos.map(p => parsePrice(p.preco));
    new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Preço (R$)', data: data, backgroundColor: 'rgba(199, 83, 123, 0.5)' }] },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

function iniciarFormularioCadastro() {
    const form = document.getElementById('form-cadastro-produto');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const novoProduto = {
            nome: document.getElementById('nome').value,
            marca: document.getElementById('marca').value,
            preco: document.getElementById('preco').value,
            imagem_principal: document.getElementById('imagem_principal').value,
            descricao: document.getElementById('descricao').value,
            conteudo: document.getElementById('conteudo').value,
            destaque: document.getElementById('destaque').checked,
            galeria: [] 
        };
        try {
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoProduto) });
            if (!response.ok) throw new Error();
            alert('Produto cadastrado!'); window.location.href = 'index.html'; 
        } catch (error) { alert('Falha no cadastro.'); }
    });
}

async function iniciarFormularioEdicao() {
    const params = new URLSearchParams(window.location.search);
    const idProduto = params.get('id');
    if (!idProduto) { alert('ID não fornecido'); window.location.href = 'index.html'; return; }
    const produto = await fetchProdutoPorId(idProduto);
    if (!produto) return;
    document.getElementById('nome').value = produto.nome;
    document.getElementById('marca').value = produto.marca;
    document.getElementById('preco').value = produto.preco;
    document.getElementById('imagem_principal').value = produto.imagem_principal;
    document.getElementById('descricao').value = produto.descricao;
    document.getElementById('conteudo').value = produto.conteudo;
    document.getElementById('destaque').checked = produto.destaque;
    const form = document.getElementById('form-editar-produto');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const produtoAtualizado = {
            nome: document.getElementById('nome').value,
            marca: document.getElementById('marca').value,
            preco: document.getElementById('preco').value,
            imagem_principal: document.getElementById('imagem_principal').value,
            descricao: document.getElementById('descricao').value,
            conteudo: document.getElementById('conteudo').value,
            destaque: document.getElementById('destaque').checked,
            galeria: produto.galeria 
        };
        try {
            const response = await fetch(`${API_URL}/${idProduto}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(produtoAtualizado) });
            if (!response.ok) throw new Error();
            alert('Produto atualizado!'); window.location.href = `detalhe.html?id=${idProduto}`;
        } catch (error) { alert('Falha na atualização.'); }
    });
}

async function excluirProduto(id) {
    if (!confirm('Tem certeza?')) return;
    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error();
        alert('Produto excluído!'); window.location.href = 'index.html';
    } catch (error) { alert('Falha ao excluir.'); }
}