document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginForm = document.getElementById('professional-login-form');
    const logoutButton = document.getElementById('logout-button');
    const generateLinkBtn = document.getElementById('generate-link-btn');
    const invitationLinkElement = document.getElementById('invitation-link');
    const welcomeMessage = document.getElementById('welcome-message');
    const patientsTableBody = document.getElementById('patients-table-body');

    // --- Funções de Gestão de Estado e Visibilidade ---

    async function showDashboard(pushState = false) {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        if (pushState) {
            history.pushState({ loggedIn: true }, 'Professional Dashboard', '/professional-dashboard.html');
        }
        const token = localStorage.getItem('professionalToken');
        if (token) {
            await loadProfessionalData(token);
        } else {
            showLogin(true);
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

    // --- Carregamento de Dados e Renderização ---

    async function loadProfessionalData(token) {
        try {
            const response = await fetch('/api/professional/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 || response.status === 403) {
                showLogin(true);
                return;
            }
            if (!response.ok) throw new Error('Não foi possível carregar os dados do painel.');
            
            const data = await response.json();
            welcomeMessage.textContent = `Bem-vindo(a), ${data.professional.name.split(' ')[0]}!`;
            renderPatients(data.patients, patientsTableBody);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            alert(error.message);
            showLogin(true);
        }
    }

    function renderPatients(patients = [], tableBody) {
        tableBody.innerHTML = '';
        if (!patients || patients.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum paciente cadastrado.</td></tr>';
            return;
        }
        patients.forEach(patient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.id}</td>
                <td>${patient.name}</td>
                <td>${patient.phone || 'Não informado'}</td>
                <td><button class="button-secondary view-patient-btn" data-patient-id="${patient.id}">Ver Detalhes</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- Listeners de Eventos ---

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
                    await showDashboard(true);
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

    if (generateLinkBtn) {
        generateLinkBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('professionalToken');
            if (!token) {
                showLogin(true);
                return;
            }
            try {
                const response = await fetch('/api/professionals/generate-link', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Falha ao gerar o link. Seu limite pode ter sido atingido.');
                }
                
                const invitationLink = data.invitationLink;
                if (invitationLinkElement) {
                    invitationLinkElement.value = invitationLink;
                }

                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(invitationLink);
                    alert('Link de convite gerado e COPIADO para a área de transferência!');
                } else {
                    invitationLinkElement.select();
                    alert('Link gerado! Copie o link do campo abaixo.');
                }
            } catch (error) {
                console.error('Erro ao gerar link:', error);
                alert(`Erro: ${error.message}`);
            }
        });
    }

    if (patientsTableBody) {
        patientsTableBody.addEventListener('click', (event) => {
            if (event.target && event.target.classList.contains('view-patient-btn')) {
                const patientId = event.target.getAttribute('data-patient-id');
                alert(`A funcionalidade detalhada para visualização do paciente (ID: ${patientId}) será implementada em breve. Por enquanto, a gestão é feita via contato direto.`);
            }
        });
    }

    // --- Navegação e Estado Inicial ---

    window.addEventListener('popstate', async (event) => {
        if (localStorage.getItem('professionalToken')) {
            await showDashboard();
        } else {
            showLogin();
        }
    });

    (async () => {
        if (localStorage.getItem('professionalToken')) {
            await showDashboard(true);
        } else {
            showLogin();
        }
    })();
});
