document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento dos elementos da página
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    const logoutButton = document.getElementById('logout-button');
    const professionalsTbody = document.querySelector('#professionals-table tbody');
    const patientsTbody = document.querySelector('#patients-table tbody');

    // --- Funções de Controlo de Visibilidade ---

    // Mostra o painel de administração e carrega os dados
    function showDashboard() {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
            loadAdminData(adminToken);
        } else {
            // Se, por algum motivo, não houver token, volta para o login
            showLogin();
        }
    }

    // Mostra a página de login e limpa o token
    function showLogin() {
        localStorage.removeItem('adminToken');
        loginContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
        if(professionalsTbody) professionalsTbody.innerHTML = ''; // Limpa tabelas ao sair
        if(patientsTbody) patientsTbody.innerHTML = '';
    }

    // --- Lógica Principal e Eventos ---

    // Evento de submissão do formulário de login
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
                showDashboard(); // **CORREÇÃO: Mostra o painel em vez de redirecionar**
            } else {
                throw new Error('Acesso de administrador negado.');
            }
        } catch (error) {
            alert('Erro no login: ' + error.message);
        }
    });

    // Evento do botão de logout
    if (logoutButton) {
        logoutButton.addEventListener('click', showLogin);
    }
    
    // Evento para salvar o status do profissional (delegação de evento)
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

    // --- Funções de Manipulação de Dados (API) ---

    // Carrega os dados de profissionais e pacientes
    async function loadAdminData(token) {
        try {
            const response = await fetch('/api/admin/data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                 // Se o token for inválido, o servidor retornará 401 ou 403
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
            showLogin(); // Se houver erro (ex: token expirado), força o logout
        }
    }
    
    // Atualiza o status de um profissional
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

    // --- Funções Auxiliares para Renderização ---

    // Preenche uma tabela com dados
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

    // Cria uma linha <tr> para a tabela de profissionais
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

    // Cria uma linha <tr> para a tabela de pacientes
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
    // Verifica o estado inicial (logado ou não) ao carregar a página
    if (localStorage.getItem('adminToken')) {
        showDashboard();
    } else {
        showLogin();
    }
});
