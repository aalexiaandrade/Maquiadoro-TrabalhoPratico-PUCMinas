const API_URL_USUARIOS = 'http://localhost:3000/usuarios';

// Lógica de Login
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const login = document.getElementById('loginUsuario').value;
        const senha = document.getElementById('senhaUsuario').value;

        try {
            const response = await fetch(API_URL_USUARIOS);
            const usuarios = await response.json();
            
            const usuarioEncontrado = usuarios.find(u => u.login === login && u.senha === senha);

            if (usuarioEncontrado) {
                // Salva na sessão (sessionStorage)
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

// Lógica de Cadastro de Usuário
const formCadastro = document.getElementById('form-cadastro-usuario');
if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoUsuario = {
            nome: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            login: document.getElementById('login').value,
            senha: document.getElementById('senha').value,
            admin: false, // Padrão: usuário comum
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