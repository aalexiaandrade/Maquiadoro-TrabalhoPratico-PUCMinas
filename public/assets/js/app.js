const API_URL = 'http://localhost:3000/produtos';
const API_URL_USUARIOS = 'http://localhost:3000/usuarios';

document.addEventListener('DOMContentLoaded', () => {
    verificarLogin();

    if (document.getElementById('secao-destaques')) {
        carregarDestaques();
        carregarTodosProdutos();
        const btnPesquisa = document.querySelector('button[onclick="pesquisarProdutos()"]');
        if(btnPesquisa) btnPesquisa.addEventListener('click', pesquisarProdutos);
    } 
    else if (document.getElementById('detalhe-produto-container')) {
        carregarDetalhesProduto();
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

// --- LOGIN E MENU ---

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

// --- FUNÇÕES DE LOGIN ---

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
            console.error(error);
            alert('Erro ao conectar com servidor.');
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
        } catch (error) {
            alert('Erro ao cadastrar.');
        }
    });
}

// --- PRODUTOS E FAVORITOS ---

async function fetchProdutos() {
    try {
        const response = await fetch(API_URL);
        return await response.json();
    } catch (error) {
        console.error("Erro API", error);
        return [];
    }
}

async function fetchProdutoPorId(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
}

async function toggleFavorito(idProduto) {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) {
        alert('Faça login para favoritar!');
        return;
    }

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
        
    } catch (error) {
        console.error(error);
        alert('Erro ao salvar favorito.');
    }
}

async function carregarTodosProdutos(termoPesquisa = '') {
    const container = document.getElementById('cards-container');
    if (!container) return;
    container.innerHTML = '';

    let produtos = await fetchProdutos();
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (termoPesquisa) {
        const termo = termoPesquisa.toLowerCase();
        produtos = produtos.filter(p => p.nome.toLowerCase().includes(termo));
    }

    if (produtos.length === 0) {
        container.innerHTML = '<p class="text-center">Nenhum produto encontrado.</p>';
        return;
    }

    produtos.forEach(produto => {
        let icone = 'bi-heart';
        let cor = '';
        
        if (usuarioLogado && usuarioLogado.favoritos) {
            const ehFavorito = usuarioLogado.favoritos.some(fav => String(fav) === String(produto.id));
            if (ehFavorito) {
                icone = 'bi-heart-fill';
                cor = 'text-danger';
            }
        }

        const imgPath = produto.imagem_principal ? produto.imagem_principal.replace('/public/', '') : '';

        const cardHtml = `
            <div class="col">
                <div class="card h-100 shadow-sm">
                    <img src="${imgPath}" class="card-img-top" alt="${produto.nome}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">${produto.nome}</h5>
                            <button class="btn btn-link p-0 ${cor}" onclick="toggleFavorito('${produto.id}')">
                                <i class="bi ${icone} fs-4"></i>
                            </button>
                        </div>
                        <p class="card-text">${produto.descricao}</p>
                    </div>
                    <div class="card-footer">
                        <a href="detalhe.html?id=${produto.id}" class="btn btn-outline-primary w-100">Ver Produto</a>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

function pesquisarProdutos() {
    const termo = document.getElementById('campo-pesquisa').value;
    carregarTodosProdutos(termo);
}

async function carregarPaginaFavoritos() {
    const container = document.getElementById('favoritos-container');
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'login.html';
        return;
    }

    const todosProdutos = await fetchProdutos();
    
    const favoritos = todosProdutos.filter(p => 
        usuarioLogado.favoritos && usuarioLogado.favoritos.some(fav => String(fav) === String(p.id))
    );

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
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

// --- DESTAQUES E DASHBOARD ---

async function carregarDestaques() {
    const container = document.getElementById('carrossel-inner-container');
    if (!container) return;
    container.innerHTML = '';

    const produtos = await fetchProdutos();
    const produtosDestaque = produtos.filter(p => p.destaque === true);

    if (produtosDestaque.length === 0) {
        container.innerHTML = '<div class="carousel-item active"><div class="d-block w-100 bg-secondary text-white d-flex align-items-center justify-content-center" style="height: 400px;">Nenhum destaque.</div></div>';
        return;
    }

    produtosDestaque.forEach((produto, index) => {
        const activeClass = (index === 0) ? 'active' : '';
        const imgPath = produto.imagem_principal ? produto.imagem_principal.replace('/public/', '') : ''; 

        const itemHtml = `
            <div class="carousel-item ${activeClass}">
                <img src="${imgPath}" class="d-block w-100" alt="${produto.nome}">
                <div class="carousel-caption d-none d-md-block">
                    <h5>${produto.nome}</h5>
                    <p>${produto.descricao}</p>
                    <a href="detalhe.html?id=${produto.id}" class="btn btn-primary">Ver Detalhes</a>
                </div>
            </div>
        `;
        container.innerHTML += itemHtml;
    });
}

function parsePrice(priceString) {
    if (!priceString) return 0;
    return parseFloat(priceString.replace("R$", "").trim().replace(",", "."));
}

async function carregarDashboard() {
    const ctx = document.getElementById('graficoPrecos');
    if (!ctx) return;

    const produtos = await fetchProdutos();

    if (produtos.length === 0) {
        ctx.parentElement.innerHTML = "<p class='text-center'>Nenhum dado para exibir.</p>";
        return;
    }

    const labels = produtos.map(p => p.nome);
    const data = produtos.map(p => parsePrice(p.preco));

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Preço (R$)',
                data: data,
                backgroundColor: 'rgba(199, 83, 123, 0.5)',
                borderColor: 'rgba(199, 83, 123, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2).replace('.', ',');
                        }
                    }
                }
            }
        }
    });
}

// --- DETALHES (LÓGICA ALTERADA AQUI) ---

async function carregarDetalhesProduto() {
    const params = new URLSearchParams(window.location.search);
    const idProduto = params.get('id');
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!idProduto) {
        window.location.href = 'index.html';
        return;
    }

    const produto = await fetchProdutoPorId(idProduto);
    if (!produto) {
        alert('Produto não encontrado!');
        window.location.href = 'index.html';
        return;
    }

    document.title = produto.nome + " - Detalhes";
    const imgPath = produto.imagem_principal ? produto.imagem_principal.replace('/public/', '') : '';

    // --- AQUI ESTÁ A LÓGICA DE PERMISSÃO ---
    let botoesAcao = '';
    
    if (usuarioLogado && usuarioLogado.admin) {
        // Se for ADMIN: Botões de Editar e Excluir
        botoesAcao = `
            <div class="mt-4 p-3 bg-light rounded border">
                <h6 class="text-muted mb-2"><i class="bi bi-shield-lock"></i> Área Administrativa</h6>
                <a href="editar_produto.html?id=${produto.id}" class="btn btn-warning me-2">
                    <i class="bi bi-pencil-fill"></i> Editar
                </a>
                <button id="btn-excluir" class="btn btn-danger">
                    <i class="bi bi-trash-fill"></i> Excluir
                </button>
            </div>
        `;
    } else {
        // Se for CLIENTE (ou não logado): Botão de Comprar (sem lógica real por enquanto)
        botoesAcao = `
            <div class="mt-4 d-flex gap-2">
                <button class="btn btn-success btn-lg flex-grow-1" onclick="alert('Produto adicionado ao carrinho! (Simulação)')">
                    <i class="bi bi-cart-plus"></i> Adicionar ao Carrinho
                </button>
            </div>
        `;
    }

    const infoContainer = document.getElementById('info-gerais');
    infoContainer.innerHTML = `
        <div class="col-md-6">
            <img src="${imgPath}" class="img-fluid rounded shadow-lg" alt="${produto.nome}">
        </div>
        <div class="col-md-6">
            <h2>${produto.nome}</h2>
            <h4 class="text-muted">${produto.marca}</h4>
            <h3 class="text-primary my-3">${produto.preco}</h3>
            <p class="lead">${produto.descricao}</p>
            <hr>
            <h5>Sobre o produto:</h5>
            <p>${produto.conteudo}</p>
            
            ${botoesAcao} <!-- BOTOES DINAMICOS AQUI -->
        </div>
    `;

    // Só adiciona o evento de excluir se o botão existir (ou seja, se for admin)
    const btnExcluir = document.getElementById('btn-excluir');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', () => {
            excluirProduto(produto.id);
        });
    }

    const galeriaContainer = document.getElementById('galeria-container');
    if (produto.galeria && produto.galeria.length > 0) {
        galeriaContainer.innerHTML = '';
        produto.galeria.forEach(foto => {
            const imgGaleriaPath = foto.imagem ? foto.imagem.replace('/public/', '') : '';
            const fotoHtml = `
                <div class="col">
                    <div class="card">
                        <img src="${imgGaleriaPath}" class="card-img-top" alt="${foto.titulo}">
                        <div class="card-body">
                            <p class="card-text text-center">${foto.titulo}</p>
                        </div>
                    </div>
                </div>
            `;
            galeriaContainer.innerHTML += fotoHtml;
        });
    } else {
        const secaoGaleria = document.getElementById('fotos-vinculadas');
        if(secaoGaleria) secaoGaleria.innerHTML = "<p class='text-center'>Não há fotos extras.</p>";
    }
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
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoProduto)
            });

            if (!response.ok) throw new Error('Erro ao cadastrar');
            alert('Produto cadastrado com sucesso!');
            window.location.href = 'index.html'; 
        } catch (error) {
            alert('Falha no cadastro.');
        }
    });
}

async function iniciarFormularioEdicao() {
    const params = new URLSearchParams(window.location.search);
    const idProduto = params.get('id');

    if (!idProduto) {
        alert('ID não fornecido');
        window.location.href = 'index.html';
        return;
    }

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
            const response = await fetch(`${API_URL}/${idProduto}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produtoAtualizado)
            });

            if (!response.ok) throw new Error('Erro ao atualizar');
            alert('Produto atualizado com sucesso!');
            window.location.href = `detalhe.html?id=${idProduto}`;
        } catch (error) {
            alert('Falha na atualização.');
        }
    });
}

async function excluirProduto(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erro ao excluir');
        alert('Produto excluído com sucesso!');
        window.location.href = 'index.html';
    } catch (error) {
        alert('Falha ao excluir.');
    }
}