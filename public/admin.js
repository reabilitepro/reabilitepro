document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    const logoutButton = document.getElementById('logout-button');
    const professionalsTbody = document.querySelector('#professionals-table tbody');
    const patientsTbody = document.querySelector('#patients-table tbody');

    function showDashboard() {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        loadAdminData();
    }

    function showLogin() {
        localStorage.removeItem('accessToken');
        loginContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
    }

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

            localStorage.setItem('accessToken', data.accessToken);
            showDashboard();
        } catch (error) {
            alert('Erro no login: ' + error.message);
        }
    });

    logoutButton.addEventListener('click', showLogin);

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
                // Se a sessão for inválida, o servidor retorna 403
                if (response.status === 403) {
                    alert(data.message); // Exibe a mensagem do servidor (ex: "Sessão inválida ou expirada.")
                }
                throw new Error(data.message || 'Falha ao carregar dados do painel.');
            }

            populateTable(professionalsTbody, data.professionals, createProfessionalRow);
            populateTable(patientsTbody, data.patients, createPatientRow);

        } catch (error) {
            console.error('Erro ao carregar dados do painel:', error);
            alert(error.message); // Mostra o erro e força o logout
            showLogin();
        }
    }
    
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
            loadAdminData(); // Recarrega para refletir a mudança
        } catch (error) {
            alert('Erro ao atualizar status: ' + error.message);
        }
    }

    function populateTable(tbody, data, createRowFunction) {
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            const colSpan = tbody.closest('table').rows[0].cells.length;
            tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center;">Nenhum dado para exibir.</td></tr>`;
            return;
        }
        data.forEach(item => tbody.appendChild(createRowFunction(item)));
    }

    function createProfessionalRow(prof) {
        const row = document.createElement('tr');
        const status = prof.registrationstatus || 'Pendente';
        row.innerHTML = `
            <td>${prof.fullname}</td>
            <td>${prof.email}</td>
            <td><span class="status status-${status.toLowerCase()}">${status}</span></td>
            <td>${prof.patientlimit}</td>
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

    function createPatientRow(patient) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${patient.id}</td>
            <td>${patient.name}</td>
            <td>${patient.phone || 'N/A'}</td>
            <td>${patient.professional_name || 'Nenhum'}</td>
        `;
        return row;
    }

    // Lógica de arranque: verifica se já está logado
    if (localStorage.getItem('accessToken')) {
        showDashboard();
    } else {
        showLogin();
    }
});
