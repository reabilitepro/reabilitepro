document.addEventListener('DOMContentLoaded', () => {
    const adminToken = localStorage.getItem('adminToken');
    const currentPage = window.location.pathname;

    if (!adminToken && currentPage.includes('admin-dashboard.html')) {
        window.location.href = '/admin.html';
        return;
    }

    if (adminToken && (currentPage.includes('admin.html') || currentPage === '/')) {
        window.location.href = '/admin-dashboard.html';
        return;
    }

    if (currentPage.includes('admin-dashboard.html')) {
        handleAdminDashboardPage();
    } else if (currentPage.includes('admin.html')) {
        handleLoginPage();
    }

    function handleLoginPage() {
        const loginForm = document.getElementById('admin-login-form');
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
                    window.location.href = '/admin-dashboard.html';
                } else {
                    throw new Error('Acesso de administrador negado.');
                }
            } catch (error) {
                alert('Erro no login: ' + error.message);
            }
        });
    }

    function handleAdminDashboardPage() {
        const professionalsTbody = document.getElementById('professionals-table-body');
        const patientsTbody = document.getElementById('patients-table-body');
        const logoutButton = document.getElementById('logout-button');

        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin.html';
        });

        loadAdminData(adminToken, professionalsTbody, patientsTbody);

        professionalsTbody.addEventListener('click', (event) => {
            if (event.target.classList.contains('save-status-btn')) {
                const row = event.target.closest('tr');
                const id = row.dataset.id;
                const newStatus = row.querySelector('.status-select').value;
                updateProfessionalStatus(id, newStatus, adminToken, () => 
                    loadAdminData(adminToken, professionalsTbody, patientsTbody)
                );
            }
        });
    }

    async function loadAdminData(token, professionalsTbody, patientsTbody) {
        try {
            const response = await fetch('/api/admin/data', { // ROTA CORRIGIDA
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Falha ao carregar dados: ${response.status} ${errorText}`);
            }

            const { professionals, patients } = await response.json();
            populateTable(professionalsTbody, professionals, createProfessionalRow);
            populateTable(patientsTbody, patients, createPatientRow);
        } catch (error) {
            console.error('Erro detalhado ao carregar dados de admin:', error);
            alert(error.message);
        }
    }

    function populateTable(tbody, data, createRowFunction) {
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            const colSpan = tbody.id === 'professionals-table-body' ? 5 : 4;
            tbody.innerHTML = `<tr><td colspan="${colSpan}">Nenhum dado encontrado.</td></tr>`;
            return;
        }
        data.forEach(item => {
            if (item) {
                const row = createRowFunction(item);
                tbody.appendChild(row);
            }
        });
    }

    function createProfessionalRow(prof) {
        const row = document.createElement('tr');
        row.dataset.id = prof.id;
        const status = prof.registrationstatus || 'Pendente';
        const statusClass = String(status).toLowerCase();
        const patientLimit = prof.patientlimit ?? 'N/A';
        const name = prof.fullname || 'N/A';
        const email = prof.email || 'N/A';

        row.innerHTML = `
            <td>${name}</td>
            <td>${email}</td>
            <td><span class="status status-${statusClass}">${status}</span></td>
            <td>${patientLimit}</td>
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

    async function updateProfessionalStatus(id, newStatus, token, callback) {
        try {
            const response = await fetch(`/api/admin/professionals/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ registrationStatus: newStatus })
            });

            if (response.ok) {
                alert('Status atualizado com sucesso!');
                if (callback) callback();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao atualizar.');
            }
        } catch (error) {
            alert('Erro ao atualizar status: ' + error.message);
        }
    }
});
