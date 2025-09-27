document.addEventListener('DOMContentLoaded', () => {
    const adminToken = localStorage.getItem('adminToken');
    const currentPage = window.location.pathname;

    // 1. Proteção da Página de Administrador
    // Se não há token de admin e estamos na página do admin, expulsa para o login.
    if (!adminToken && currentPage.includes('admin-dashboard.html')) {
        window.location.href = '/admin.html';
        return;
    }

    // Se há um token de admin, mas o usuário está na página de login, redireciona para o dashboard.
    if (adminToken && !currentPage.includes('admin-dashboard.html')) {
        window.location.href = '/admin-dashboard.html';
        return;
    }

    // --- Inicialização da Lógica Específica ---

    // Só executa o código do painel se estivermos na página correta
    if (currentPage.includes('admin-dashboard.html')) {
        handleAdminDashboardPage();
    }
    
    // Só executa a lógica de login na página de login
    if (currentPage.includes('admin.html') || currentPage.endsWith('/')) {
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
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || 'Credenciais inválidas.');
                    }

                    // O backend agora decide o tipo. O frontend apenas armazena o token correto.
                    if (data.userType === 'admin') {
                        localStorage.setItem('adminToken', data.accessToken);
                        window.location.href = '/admin-dashboard.html';
                    } else if (data.userType === 'professional') {
                        localStorage.setItem('professionalToken', data.accessToken);
                        window.location.href = '/professional-dashboard.html';
                    }
                } catch (error) {
                    alert(error.message);
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

            if (!response.ok) { throw new Error('Falha ao carregar dados.'); }

            const professionals = await response.json();
            populateProfessionalsTable(professionals, tbody);
        } catch (error) {
            console.error('Erro ao carregar profissionais:', error); // Usa console.error para não travar o usuário
            alert(error.message);
        }
    }

    function populateProfessionalsTable(professionals, tbody) {
        tbody.innerHTML = '';
        if (!professionals || professionals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nenhum profissional encontrado.</td></tr>';
            return;
        }
        
        professionals.forEach(prof => {
            const row = tbody.insertRow();
            row.dataset.id = prof.id;
            row.innerHTML = `
                <td>${prof.fullname || 'N/A'}</td>
                <td>${prof.email || 'N/A'}</td>
                <td>${prof.profession || 'N/A'}</td>
                <td>${prof.registrationnumber || 'N/A'}</td>
                <td><span class="status status-${(prof.registrationstatus || 'pendente').toLowerCase()}">${prof.registrationstatus}</span></td>
                <td class="actions">
                    <select class="status-select">
                        <option value="Pendente" ${prof.registrationstatus === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Aprovado" ${prof.registrationstatus === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                        <option value="Rejeitado" ${prof.registrationstatus === 'Rejeitado' ? 'selected' : ''}>Rejeitado</option>
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
                throw new Error((await response.json()).message || 'Falha ao atualizar.');
            }
        } catch (error) {
            alert(error.message);
        }
    }
});
