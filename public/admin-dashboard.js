document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('professionalToken');

    // --- ROTEAMENTO E PROTEÇÃO DE PÁGINAS ---
    if (token) {
        try {
            const userType = JSON.parse(atob(token.split('.')[1])).type;

            if (userType === 'admin' && !currentPage.includes('admin-dashboard.html')) {
                window.location.href = '/admin-dashboard.html';
                return;
            } 
            if (userType === 'professional' && !currentPage.includes('professional-dashboard.html')) {
                window.location.href = '/professional-dashboard.html';
                return;
            }
        } catch (e) {
            localStorage.clear();
            window.location.href = '/admin.html'; // Se o token for inválido, limpa tudo e volta para o login
            return;
        }
    } else {
        // Se não há token, só pode ficar na página de login/registro.
        if (currentPage.includes('admin-dashboard.html') || currentPage.includes('professional-dashboard.html')) {
            window.location.href = '/admin.html';
            return;
        }
    }

    // --- INICIALIZAÇÃO DA PÁGINA ESPECÍFICA ---
    if (currentPage.includes('admin-dashboard.html')) {
        handleAdminDashboardPage();
    } else if (currentPage.includes('professional-dashboard.html')) {
        handleProfessionalDashboardPage();
    } else if (currentPage.includes('admin.html') || currentPage.endsWith('/')) {
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
        const adminToken = localStorage.getItem('adminToken');

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
    
    // --- LÓGICA DO PAINEL DO PROFISSIONAL ---
    function handleProfessionalDashboardPage() {
        // A lógica desta página foi movida para 'professional-dashboard.js' para maior clareza.
        // Este arquivo garante que o usuário chegue aqui, e o script específico da página assume.
        console.log("Roteador confirmou: Página do Profissional. O script professional-dashboard.js assumirá.");
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
            alert(error.message);
        }
    }

    function populateProfessionalsTable(professionals, tbody) {
        tbody.innerHTML = '';
        if (!professionals || professionals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nenhum profissional encontrado.</td></tr>';
            return;
        }
        
        // CORREÇÃO: Usar os nomes de propriedade em minúsculas que vêm do banco de dados.
        professionals.forEach(prof => {
            const row = tbody.insertRow();
            row.dataset.id = prof.id;
            // CORREÇÃO APLICADA AQUI:
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
