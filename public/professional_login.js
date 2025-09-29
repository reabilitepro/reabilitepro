document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password, userType: 'professional' }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('accessToken', data.accessToken);
                    window.location.href = '/professional-dashboard.html'; // Redireciona para o painel do profissional
                } else {
                    errorMessage.textContent = data.message || 'Erro desconhecido no login.';
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = 'Falha na comunicação com o servidor. Tente novamente.';
                errorMessage.style.display = 'block';
            }
        });
    }
});
