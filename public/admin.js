
document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    const logoutButton = document.getElementById('logout-button');
    const professionalsTbody = document.querySelector('#professionals-table tbody');
    const patientsTbody = document.querySelector('#patients-table tbody');

    // --- Funções de Gestão de Estado e Visibilidade ---

    function showDashboard(pushState = false) {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';

        if (pushState) {
            history.pushState({ loggedIn: true }, 'Admin Dashboard', '/admin');
        }

        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
            loadAdminData(adminToken);
        } else {
            showLogin(true); // Se não houver token, força o ecrã de login e atualiza o histórico
        }
    }

    function showLogin(replaceState = false) {
        localStorage.removeItem('adminToken');
        loginContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
        if (professionalsTbody) professionalsTbody.innerHTML = '';
        if (patientsTbody) patientsTbody.innerHTML = '';

        if (replaceState) {
            history.replaceState({ loggedIn: false }, 'Admin Login', '/admin');
        }
    }

    // --- Lógica Principal e Eventos ---

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
            if (!response.ok) throw new Error(data.message || 'Credenciais inválidas.');

            if (data.userType === 'admin') {
                localStorage.setItem('adminToken', data.accessToken);
                showDashboard(true); // Mostra o painel e adiciona um estado ao histórico
            } else {
                throw new Error('Acesso de administrador negado.');
            }
        } catch (error) {
            alert('Erro no login: ' + error.message);
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', () => showLogin(true));
    }

    window.addEventListener('popstate', () => {
        if (localStorage.getItem('adminToken')) {
            showDashboard();
        } else {
            showLogin();
        }
    });

    // ... (O restante do código, como as funções de API, permanece o mesmo)
    if (professionalsTbody) {
        professionalsTbody.addEventListener('click', (event) => {
            if (event.target.classList.contains('save-status-btn')) {
                const adminToken = localStorage.getItem('adminToken');
                const row = event.target.closest('tr');
                const id = row.dataset.id;
                const newStatus = row.querySelector('.status-select').value;
                updateProfessionalStatus(id, newStatus, adminToken, () => loadAdminData(adminToken));
            }
        });
    }

    async function loadAdminData(token) {
        try {
            const response = await fetch('/api/admin/data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Sessão inválida ou expirada. Por favor, faça login novamente.');
                }
                throw new Error('Não foi possível carregar os dados do painel.');
            }
            const { professionals, patients } = await response.json();
            populateTable(professionalsTbody, professionals, createProfessionalRow);
            populateTable(patientsTbody, patients, createPatientRow);
        } catch (error) {
            alert(error.message);
            showLogin(true);
        }
    }
    
    async function updateProfessionalStatus(id, newStatus, token, callback) {
        try {
            const response = await fetch(`/api/admin/professionals/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ registrationStatus: newStatus })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao atualizar.');
            }
            alert('Status atualizado com sucesso!');
            if (callback) callback();
        } catch (error) {
            alert('Erro ao atualizar status: ' + error.message);
        }
    }

    function populateTable(tbody, data, createRowFunction) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            const colSpan = tbody.closest('table').querySelector('thead th').length;
            tbody.innerHTML = `<tr><td colspan="${colSpan}">Nenhum dado encontrado.</td></tr>`;
            return;
        }
        data.forEach(item => {
            if (item) tbody.appendChild(createRowFunction(item));
        });
    }

    function createProfessionalRow(prof) {
        const row = document.createElement('tr');
        row.dataset.id = prof.id;
        const status = prof.registrationstatus || 'Pendente';
        row.innerHTML = `
            <td>${prof.fullname || 'N/A'}</td>
            <td>${prof.email || 'N/A'}</td>
            <td><span class="status status-${status.toLowerCase()}">${status}</span></td>
            <td>${prof.patientlimit ?? 'N/A'}</td>
            <td class="actions">
                <select class="status-select">
                    <option value="Pendente" ${status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Aprovado" ${status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                    <option value="Rejeitado" ${status === 'Rejeitado' ? 'selected' : ''}>Rejeitado</option>
                </select>
                <button class="save-status-btn">Salvar</button>
            </td>
        `;
        return row;
    }

    function createPatientRow(patient) {
        const row = document.createElement('tr');
        row.dataset.id = patient.id;
        row.innerHTML = `
            <td>${patient.id}</td>
            <td>${patient.name || 'N/A'}</td>
            <td>${patient.phone || 'N/A'}</td>
            <td>${patient.professional_name || 'Nenhum'}</td>
        `;
        return row;
    }

    // --- Ponto de Entrada ---
    if (localStorage.getItem('adminToken')) {
        showDashboard(true);
    } else {
        showLogin();
    }
});
