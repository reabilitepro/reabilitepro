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
                    body: JSON.stringify({ email, password, userType: 'patient' }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('accessToken', data.accessToken);
                    window.location.href = '/patient-dashboard.html'; // Redireciona para o painel do paciente
                } else {
                    errorMessage.textContent = data.message || 'Erro desconhecido no login.';
                }
            } catch (error) {
                errorMessage.textContent = 'Falha na comunicação com o servidor. Tente novamente.';
            }
        });
    }
});
