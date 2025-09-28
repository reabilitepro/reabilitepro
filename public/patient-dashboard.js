document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginForm = document.getElementById('patient-login-form');
    const logoutButton = document.getElementById('logout-button');

    // --- Funções de Gestão de Estado e Visibilidade ---

    async function showDashboard(pushState = false) {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';

        if (pushState) {
            history.pushState({ loggedIn: true }, 'Patient Dashboard', '/patient-dashboard.html');
        }

        const token = localStorage.getItem('patientToken');
        if (token) {
            await loadPatientData(token);
        } else {
            showLogin(true); // Força o ecrã de login se não houver token
        }
    }

    function showLogin(replaceState = false) {
        localStorage.removeItem('patientToken');
        loginContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';

        if (replaceState) {
            history.replaceState({ loggedIn: false }, 'Patient Login', '/patient-dashboard.html');
        }
    }

    // --- Lógica de Login ---

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('patient-email-login').value;
            const password = document.getElementById('patient-password-login').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, userType: 'patient' })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Credenciais inválidas.');

                if (data.userType === 'patient') {
                    localStorage.setItem('patientToken', data.accessToken);
                    await showDashboard(true);
                } else {
                    throw new Error('Acesso de paciente negado.');
                }
            } catch (error) {
                alert('Erro no login: ' + error.message);
            }
        });
    }

    // --- Eventos de Navegação e Logout ---

    if (logoutButton) {
        logoutButton.addEventListener('click', () => showLogin(true));
    }

    window.addEventListener('popstate', async (event) => {
        if (localStorage.getItem('patientToken')) {
            await showDashboard();
        } else {
            showLogin();
        }
    });

    // --- Carregamento de Dados do Painel ---

    async function loadPatientData(token) {
        const welcomeMessage = document.getElementById('welcome-message');
        const evolutionContainer = document.getElementById('evolution-notes-container');

        try {
            const response = await fetch('/api/patient/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                 showLogin(true); // Token inválido, força logout
                 return;
            }
            if (!response.ok) throw new Error('Não foi possível carregar os dados do painel.');

            const patient = await response.json();

            welcomeMessage.textContent = `Bem-vindo(a), ${patient.name.split(' ')[0]}!`;
            document.getElementById('patient-name').textContent = patient.name;
            document.getElementById('patient-email').textContent = patient.email || 'Não informado';
            document.getElementById('patient-phone').textContent = patient.phone;
            document.getElementById('patient-dob').textContent = new Date(patient.dob + 'T00:00:00').toLocaleDateString('pt-BR');
            document.getElementById('patient-address').textContent = patient.address || 'Não informado';
            document.getElementById('patient-notes').textContent = patient.notes || 'Nenhuma observação';

            renderEvolutions(patient.evolutions, evolutionContainer);

        } catch (error) {
            console.error('Error fetching dashboard:', error);
            alert(error.message);
            showLogin(true); // Em caso de erro, força logout
        }
    }

    function renderEvolutions(evolutions = [], container) {
        container.innerHTML = '';
        if (!evolutions || evolutions.length === 0) {
            container.innerHTML = '<p>Nenhuma nota de evolução ou plano de tratamento compartilhado ainda.</p>';
            return;
        }

        const evolutionList = document.createElement('ul');
        evolutionList.className = 'evolution-list';

        evolutions.slice().reverse().forEach(evo => {
            const listItem = document.createElement('li');
            listItem.className = 'evolution-item';
            listItem.innerHTML = `
                <p class="evolution-text">${evo.note}</p>
                <span class="evolution-date">${new Date(evo.date).toLocaleString('pt-BR')}</span>
            `;
            evolutionList.appendChild(listItem);
        });

        container.appendChild(evolutionList);
    }

    // --- Ponto de Entrada ---

    (async () => {
        if (localStorage.getItem('patientToken')) {
            await showDashboard(true);
        } else {
            showLogin();
        }
    })();
});
