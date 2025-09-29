document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    const logoutButton = document.getElementById('logout-button');
    const professionalsTbody = document.querySelector('#professionals-table tbody');
    const patientsTbody = document.querySelector('#patients-table tbody');

    // Função para mostrar o painel e carregar os dados
    function showDashboard() {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        loadAdminData();
    }

    // Função para mostrar o ecrã de login e limpar o estado
    function showLogin() {
        localStorage.removeItem('accessToken');
        loginContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
        if (professionalsTbody) professionalsTbody.innerHTML = '';
        if (patientsTbody) patientsTbody.innerHTML = '';
    }

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
                localStorage.setItem('accessToken', data.accessToken);
                showDashboard();
            } else {
                throw new Error('Acesso de administrador negado.');
            }
        } catch (error) {
            alert('Erro no login: ' + error.message);
        }
    });

    // Evento de clique no botão de logout
    if (logoutButton) {
        logoutButton.addEventListener('click', showLogin);
    }

    // Função para carregar os dados do painel a partir da API
    async function loadAdminData() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            showLogin();
            return;
        }

        try {
            const response = await fetch('/api/admin/data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            if (!response.ok) {
                // Se o token for inválido/expirado, o servidor retornará 403
                if (response.status === 403) {
                    alert('Sua sessão expirou. Por favor, faça login novamente.');
                }
                throw new Error(data.message || 'Falha ao carregar dados.');
            }

            populateTable(professionalsTbody, data.professionals, createProfessionalRow);
            populateTable(patientsTbody, data.patients, createPatientRow);
        } catch (error) {
            console.error('Erro ao carregar dados do admin:', error);
            alert(error.message);
            showLogin(); // Em caso de erro, força o logout
        }
    }
    
    // Função para atualizar o status de um profissional
    async function updateProfessionalStatus(id, newStatus) {
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`/api/admin/professionals/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ registrationStatus: newStatus })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha ao atualizar.');
            alert('Status atualizado com sucesso!');
            loadAdminData(); // Recarrega os dados para mostrar a atualização
        } catch (error) {
            alert('Erro ao atualizar status: ' + error.message);
        }
    }

    // Função genérica para preencher uma tabela
    function populateTable(tbody, data, createRowFunction) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            const colSpan = tbody.closest('table').rows[0].cells.length;
            tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center;">Nenhum dado encontrado.</td></tr>`;
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
            <td>${prof.patientlimit ?? '4'}</td>
            <td class="actions">
                <select class="status-select">
                    <option value="Pendente" ${status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Aprovado" ${status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                    <option value="Rejeitado" ${status === 'Rejeitado' ? 'selected' : ''}>Rejeitado</option>
                </select>
                <button class="save-status-btn">Salvar</button>
            </td>
        `;
        row.querySelector('.save-status-btn').addEventListener('click', () => {
            const newStatus = row.querySelector('.status-select').value;
            updateProfessionalStatus(prof.id, newStatus);
        });
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

    // Verifica se já existe um token ao carregar a página
    if (localStorage.getItem('accessToken')) {
        showDashboard();
    } else {
        showLogin();
    }
});
