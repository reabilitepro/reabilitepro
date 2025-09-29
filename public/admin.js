document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('admin-login-form');

    // Verifica se já existe um token de admin válido e redireciona
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            const user = JSON.parse(atob(token.split('.')[1]));
            if (user.type === 'admin') {
                window.location.href = 'admin-dashboard.html';
                return; // Interrompe a execução para evitar anexar o listener do formulário
            }
        } catch (e) {
            // Token inválido, remove-o
            localStorage.removeItem('accessToken');
        }
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, userType: 'admin' })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Credenciais inválidas.');
            }

            if (data.userType === 'admin') {
                // Salva o token com o nome esperado pelo novo painel
                localStorage.setItem('accessToken', data.accessToken);
                // Redireciona para o painel de administração
                window.location.href = 'admin-dashboard.html';
            } else {
                throw new Error('Acesso de administrador negado.');
            }
        } catch (error) {
            alert('Erro no login: ' + error.message);
        }
    });
});
