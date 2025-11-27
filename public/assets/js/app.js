const API_URL = 'http://localhost:3000/produtos';
const API_URL_USUARIOS = 'http://localhost:3000/usuarios';

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    verificarLogin(); // Verifica quem está logado e arruma o menu

    if (document.getElementById('secao-destaques')) {
        carregarDestaques();
        carregarTodosProdutos(); // Agora com suporte a pesquisa e favoritos
        
        // Listener para pesquisa em tempo real (opcional) ou no botão
        const btnPesquisa = document.querySelector('button[onclick="pesquisarProdutos()"]');
        if(btnPesquisa) btnPesquisa.addEventListener('click', pesquisarProdutos);
    } 
    else if (document.getElementById('detalhe-produto-container')) {
        carregarDetalhesProduto();
    } 
    else if (document.getElementById('favoritos-container')) {
        carregarPaginaFavoritos();
    }
    else if (document.getElementById('form-cadastro-produto')) {
        verificarPermissaoAdmin(); // Protege a página
        iniciarFormularioCadastro();
    } 
    else if (document.getElementById('graficoPrecos')) { 
        carregarDashboard();
    }
});

// --- AUTENTICAÇÃO E MENU ---
function verificarLogin() {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    
    if (usuarioLogado) {
        // Usuário está logado
        document.getElementById('menu-login').style.display = 'none';
        document.getElementById('menu-logout').style.display = 'block';
        document.getElementById('menu-favoritos').style.display = 'block';

        // Se for admin, mostra menu de cadastro
        if (usuarioLogado.admin) {
            const menuAdmin = document.getElementById('menu-admin');
            if(menuAdmin) menuAdmin.style.display = 'block';
        }
    } else {
        // Ninguém logado
        document.getElementById('menu-login').style.display = 'block';
        document.getElementById('menu-logout').style.display = 'none';
        document.getElementById('menu-favoritos').style.display = 'none';
        const menuAdmin = document.getElementById('menu-admin');
        if(menuAdmin) menuAdmin.style.display = 'none';
    }
}

function logout() {
    sessionStorage.removeItem('usuarioLogado');
    window.location.href = 'index.html';
}

function verificarPermissaoAdmin() {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado || !usuarioLogado.admin) {
        alert('Acesso negado! Apenas administradores.');
        window.location.href = 'index.html';
    }
}

// --- FAVORITOS ---
async function toggleFavorito(idProduto) {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) {
        alert('Faça login para favoritar produtos!');
        return;
    }

    // Verifica se já é favorito
    const index = usuarioLogado.favoritos.indexOf(idProduto);
    if (index === -1) {
        usuarioLogado.favoritos.push(idProduto); // Adiciona
        alert('Adicionado aos favoritos!');
    } else {
        usuarioLogado.favoritos.splice(index, 1); // Remove
        alert('Removido dos favoritos.');
    }

    // Atualiza no Servidor (Persistência)
    try {
        await fetch(`${API_URL_USUARIOS}/${usuarioLogado.id}`, {
            method: 'PATCH', // Atualiza apenas os campos mudados
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ favorites: usuarioLogado.favoritos }) 
            // Obs: Dependendo do db.json, campo pode ser 'favoritos'
            // Vou usar 'favoritos' conforme definimos no passo 1.
            body: JSON.stringify({ favoritos: usuarioLogado.favoritos })
        });
        
        // Atualiza na Sessão Local
        sessionStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
        
        // Atualiza a tela (recarrega os cards para mudar o ícone)
        if (document.getElementById('cards-container')) carregarTodosProdutos();
        if (document.getElementById('favoritos-container')) carregarPaginaFavoritos();
        
    } catch (error) {
        console.error('Erro ao salvar favorito', error);
    }
}

// --- HOME E PESQUISA ---
async function carregarTodosProdutos(termoPesquisa = '') {
    const container = document.getElementById('cards-container');
    if (!container) return;
    container.innerHTML = '';

    let produtos = await fetchProdutos();
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    // Filtro de Pesquisa
    if (termoPesquisa) {
        const termo = termoPesquisa.toLowerCase();
        produtos = produtos.filter(p => 
            p.nome.toLowerCase().includes(termo) || 
            p.descricao.toLowerCase().includes(termo)
        );
    }

    if (produtos.length === 0) {
        container.innerHTML = '<p class="text-center">Nenhum produto encontrado.</p>';
        return;
    }

    produtos.forEach(produto => {
        // Define ícone do coração (cheio ou vazio)
        let iconeFavorito = 'bi-heart'; // vazio
        if (usuarioLogado && usuarioLogado.favoritos.includes(produto.id)) {
            iconeFavorito = 'bi-heart-fill text-danger'; // cheio e vermelho
        }

        const imgPath = produto.imagem_principal ? produto.imagem_principal.replace('/public/', '') : '';
        const cardHtml = `
            <div class="col">
                <div class="card h-100 shadow-sm">
                    <img src="${imgPath}" class="card-img-top" alt="${produto.nome}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">${produto.nome}</h5>
                            <button class="btn btn-link p-0" onclick="toggleFavorito(${produto.id})">
                                <i class="bi ${iconeFavorito} fs-4"></i>
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

// --- PÁGINA DE FAVORITOS ---
async function carregarPaginaFavoritos() {
    const container = document.getElementById('favoritos-container');
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'login.html';
        return;
    }

    const todosProdutos = await fetchProdutos();
    // Filtra apenas os que estão na lista de IDs do usuário
    const favoritos = todosProdutos.filter(p => usuarioLogado.favoritos.includes(p.id));

    if (favoritos.length === 0) {
        container.innerHTML = '<p class="text-center">Você ainda não tem favoritos.</p>';
        return;
    }

    container.innerHTML = '';
    favoritos.forEach(produto => {
        // Aqui o coração é sempre preenchido pois é a pág de favoritos
        const imgPath = produto.imagem_principal ? produto.imagem_principal.replace('/public/', '') : '';
        const cardHtml = `
            <div class="col">
                <div class="card h-100 shadow-sm border-danger">
                    <img src="${imgPath}" class="card-img-top" alt="${produto.nome}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <h5 class="card-title">${produto.nome}</h5>
                            <button class="btn btn-link p-0" onclick="toggleFavorito(${produto.id})">
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

// --- FUNÇÕES DE SUPORTE E CRUD (Mantenha as que você já tinha) ---
// Mantenha fetchProdutos, fetchProdutoPorId, carregarDestaques, carregarDetalhesProduto...
// Mantenha iniciarFormularioCadastro, excluirProduto, iniciarFormularioEdicao, carregarDashboard...
// (Copie as funções que eu te passei na resposta anterior para baixo daqui, 
// apenas substitua a 'carregarTodosProdutos' e o 'DOMContentLoaded' pelas novas versões acima).