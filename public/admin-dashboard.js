document.addEventListener('DOMContentLoaded', () => {
    // Roteamento e lógica principal
    const currentPage = window.location.pathname;

    if (currentPage.includes('admin.html')) {
        handleLoginPage();
    } else if (currentPage.includes('admin-dashboard.html')) {
        handleDashboardPage();
    }

    // Lógica da PÁGINA DE LOGIN (admin.html)
    function handleLoginPage() {
        const adminLoginForm = document.getElementById('admin-login-form');
        const adminToken = localStorage.getItem('adminToken');

        // Se já tem token, vai direto pro dashboard
        if (adminToken) {
            window.location.href = '/admin-dashboard.html';
            return;
        }

        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const email = document.getElementById('admin-email').value;
                const password = document.getElementById('admin-password').value;

                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.userType === 'admin') {
                            localStorage.setItem('adminToken', data.accessToken);
                            window.location.href = '/admin-dashboard.html'; // Redireciona!
                        } else {
                            alert('Este usuário não é um administrador.');
                        }
                    } else {
                        alert('Credenciais de administrador inválidas.');
                    }
                } catch (error) {
                    console.error('Erro no login de administrador:', error);
                    alert('Ocorreu um erro ao tentar fazer login.');
                }
            });
        }
    }

    // Lógica da PÁGINA DO PAINEL (admin-dashboard.html)
    function handleDashboardPage() {
        const professionalsTbody = document.getElementById('professionals-table-body');
        const logoutButton = document.getElementById('logout-button');
        const adminToken = localStorage.getItem('adminToken');

        // Se não tem token, volta para a página de login
        if (!adminToken) {
            window.location.href = '/admin.html';
            return;
        }

        // Configura o botão de logout
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin.html';
            });
        }
        
        // Se a tabela existe, carrega os profissionais
        if (professionalsTbody) {
            loadProfessionals(adminToken, professionalsTbody);

            // Adiciona o listener para os botões de ação
            professionalsTbody.addEventListener('click', async (event) => {
                 if (event.target.classList.contains('save-status-btn')) {
                    const row = event.target.closest('tr');
                    const id = row.dataset.id;
                    const newStatus = row.querySelector('.status-select').value;
                    updateProfessionalStatus(id, newStatus, adminToken, professionalsTbody);
                }
            });
        }
    }

    // Função para CARREGAR os profissionais via API
    async function loadProfessionals(token, tbody) {
        try {
            const timestamp = new Date().getTime(); // Cache-busting
            const response = await fetch(`/api/admin/professionals?_t=${timestamp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin.html';
                }
                throw new Error('Sessão expirada ou inválida. Faça login novamente.');
            }

            const professionals = await response.json();
            populateProfessionalsTable(professionals, tbody);

        } catch (error) {
            console.error('Erro ao carregar profissionais:', error);
            alert(error.message);
        }
    }

    // Função para PREENCHER a tabela com os dados
    function populateProfessionalsTable(professionals, tbody) {
        tbody.innerHTML = '';
        if (professionals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nenhum profissional pendente ou cadastrado.</td></tr>';
            return;
        }
        
        professionals.forEach(prof => {
            const row = tbody.insertRow();
            row.dataset.id = prof.id;

            row.innerHTML = `
                <td>${prof.fullName || 'N/A'}</td>
                <td>${prof.email || 'N/A'}</td>
                <td>${prof.profession || 'N/A'}</td>
                <td>${prof.professionalLicense || 'N/A'}</td>
                <td><span class="status status-${(prof.registrationStatus || 'pendente').toLowerCase()}">${prof.registrationStatus}</span></td>
                <td class="actions">
                    <select class="status-select">
                        <option value="Pendente" ${prof.registrationStatus === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Aprovado" ${prof.registrationStatus === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                        <option value="Rejeitado" ${prof.registrationStatus === 'Rejeitado' ? 'selected' : ''}>Rejeitado</option>
                    </select>
                    <button class="save-status-btn">Salvar</button>
                </td>
            `;
        });
    }

    // Função para ATUALIZAR o status de um profissional
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
                alert('Status do profissional atualizado com sucesso!');
                loadProfessionals(token, tbody); // Recarrega a tabela
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao atualizar o status.');
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert(error.message);
        }
    }

    // Executa a lógica da página atual
    if (currentPage.includes('admin.html')) {
        handleLoginPage();
    } else if (currentPage.includes('admin-dashboard.html')) {
        handleDashboardPage();
    }
});
