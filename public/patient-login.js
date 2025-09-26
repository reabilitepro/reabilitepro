
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('patient-login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';

        const email = document.getElementById('email-user').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            errorMessage.textContent = 'Por favor, preencha todos os campos.';
            errorMessage.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/api/login', { // Corrigido para o endpoint unificado
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Falha no login. Verifique suas credenciais.');
            }

            if (data.accessToken && data.userType === 'patient') {
                localStorage.setItem('accessToken', data.accessToken);
                window.location.href = '/patient-dashboard.html';
            } else {
                throw new Error('Credenciais inválidas ou tipo de usuário incorreto.');
            }

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
});
