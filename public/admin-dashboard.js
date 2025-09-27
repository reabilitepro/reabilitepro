document.addEventListener('DOMContentLoaded', () => {
    const adminToken = localStorage.getItem('adminToken');
    const currentPage = window.location.pathname;

    // 1. Proteção da Página de Administrador
    if (!adminToken && currentPage.includes('admin-dashboard.html')) {
        window.location.href = '/admin.html';
        return;
    }

    if (adminToken && (currentPage.includes('admin.html') || currentPage === '/')) {
        window.location.href = '/admin-dashboard.html';
        return;
    }

    // --- Inicialização da Lógica Específica ---
    if (currentPage.includes('admin-dashboard.html')) {
        handleAdminDashboardPage();
    }
    
    if (currentPage.includes('admin.html')) {
        handleLoginPage();
    }

    // --- LÓGICA DA PÁGINA DE LOGIN (admin.html) ---
    function handleLoginPage() {
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const email = document.getElementById('admin-email').value;
                const password = document.getElementById('admin-password').value;

                try {
                    // A rota de login é a mesma, mas o frontend redireciona com base no sucesso
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, userType: 'admin' }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || 'Credenciais inválidas.');
                    }

                    // Apenas armazena o token de admin e redireciona
                    if (data.userType === 'admin') {
                        localStorage.setItem('adminToken', data.accessToken);
                        window.location.href = '/admin-dashboard.html';
                    } else {
                        // Caso a API retorne um tipo diferente por engano
                        throw new Error('Acesso de administrador negado.');
                    }
                } catch (error) {
                    alert('Erro no login: ' + error.message);
                }
            });
        }
    }

    // --- LÓGICA DO PAINEL DE ADMIN ---
    function handleAdminDashboardPage() {
        const professionalsTbody = document.getElementById('professionals-table-body');
        const logoutButton = document.getElementById('logout-button');

        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin.html';
            });
        }
        
        if (professionalsTbody) {
            loadProfessionals(adminToken, professionalsTbody);
            professionalsTbody.addEventListener('click', (event) => {
                 if (event.target.classList.contains('save-status-btn')) {
                    const row = event.target.closest('tr');
                    const id = row.dataset.id;
                    const newStatus = row.querySelector('.status-select').value;
                    updateProfessionalStatus(id, newStatus, adminToken, professionalsTbody);
                }
            });
        }
    }

    // --- Funções Auxiliares do Painel de Admin ---

    async function loadProfessionals(token, tbody) {
        try {
            const response = await fetch(`/api/admin/professionals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) { 
                const errorText = await response.text();
                throw new Error(`Falha ao carregar dados: ${response.status} ${errorText}`); 
            }

            const professionals = await response.json();
            populateProfessionalsTable(professionals, tbody);
        } catch (error) {
            console.error('Erro detalhado ao carregar profissionais:', error);
            alert(error.message);
        }
    }

    function populateProfessionalsTable(professionals, tbody) {
        tbody.innerHTML = '';
        if (!professionals || professionals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Nenhum profissional encontrado.</td></tr>';
            return;
        }
        
        professionals.forEach(prof => {
            if (!prof) return; 

            const row = tbody.insertRow();
            row.dataset.id = prof.id;

            // **CORREÇÃO DEFINITIVA E FINAL**
            const status = prof.registrationstatus || prof.registrationStatus || 'Pendente';
            const statusClass = String(status).toLowerCase(); // Garante que é uma string
            const patientLimit = prof.patientlimit ?? 'N/A';
            const name = prof.name || prof.fullname || 'N/A';
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
        });
    }

    async function updateProfessionalStatus(id, newStatus, token, tbody) {
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
                loadProfessionals(token, tbody);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao atualizar.');
            }
        } catch (error) {
            alert('Erro ao atualizar status: ' + error.message);
        }
    }
});
