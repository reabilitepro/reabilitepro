document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginForm = document.getElementById('professional-login-form');
    const logoutButton = document.getElementById('logout-button');

    function showDashboard(pushState = false) {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        if (pushState) {
            history.pushState({ loggedIn: true }, 'Professional Dashboard', '/professional-dashboard.html');
        }
    }

    function showLogin(replaceState = false) {
        localStorage.removeItem('professionalToken');
        loginContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
        if (replaceState) {
            history.replaceState({ loggedIn: false }, 'Professional Login', '/professional-dashboard.html');
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('professional-email').value;
            const password = document.getElementById('professional-password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, userType: 'professional' })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Credenciais inválidas.');

                if (data.userType === 'professional') {
                    localStorage.setItem('professionalToken', data.accessToken);
                    showDashboard(true);
                } else {
                    throw new Error('Acesso negado.');
                }
            } catch (error) {
                alert('Erro no login: ' + error.message);
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => showLogin(true));
    }

    window.addEventListener('popstate', (event) => {
        if (localStorage.getItem('professionalToken')) {
            showDashboard();
        } else {
            showLogin();
        }
    });

    if (localStorage.getItem('professionalToken')) {
        showDashboard(true);
    } else {
        showLogin();
    }

    // Existing dashboard logic
    const generateLinkBtn = document.getElementById('generate-link-btn');
    const invitationLinkElement = document.getElementById('invitation-link');

    if(generateLinkBtn) {
        generateLinkBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('professionalToken');
            try {
                const response = await fetch('/api/professionals/generate-link', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    if(invitationLinkElement) {
                       invitationLinkElement.value = data.invitationLink;
                    }
                    alert('Link de convite gerado com sucesso!');
                } else {
                    throw new Error(data.message || 'Falha ao gerar o link.');
                }
            } catch (error) {
                console.error('Erro ao gerar link:', error);
                alert(`Erro: ${error.message}`);
            }
        });
    }
});
