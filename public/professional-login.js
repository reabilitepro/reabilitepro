document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';

        const userInput = document.getElementById('email-user').value;
        const password = loginForm.password.value;
        let email;

        // Verifica se o usuário digitou um email completo ou apenas o nome de usuário
        if (userInput.includes('@')) {
            email = userInput;
        } else {
            email = `${userInput}@reabilite.pro`;
        }

        if (!userInput) {
            errorMessage.textContent = 'Por favor, digite seu usuário ou email.';
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Falha no login');
            }

            localStorage.setItem('accessToken', data.accessToken);

            // Redirecionamento correto baseado no tipo de usuário
            if (data.userType === 'admin') {
                window.location.href = '/admin-dashboard.html';
            } else {
                window.location.href = '/professional-dashboard.html';
            }

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });
});