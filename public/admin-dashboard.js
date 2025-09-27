document.addEventListener('DOMContentLoaded', () => {
    // Ponto de entrada único para a lógica de autenticação
    const currentPage = window.location.pathname;

    if (currentPage.includes('admin.html') || currentPage.endsWith('/')) { // A raiz também é uma página de login
        handleLoginPage();
    } else if (currentPage.includes('admin-dashboard.html')) {
        handleAdminDashboardPage();
    } else if (currentPage.includes('professional-dashboard.html')) {
        handleProfessionalDashboardPage();
    }

    // --- LÓGICA DA PÁGINA DE LOGIN (admin.html) ---
    function handleLoginPage() {
        const loginForm = document.getElementById('admin-login-form'); // O formulário é o mesmo para ambos
        const token = localStorage.getItem('adminToken') || localStorage.getItem('professionalToken');

        // Se já existe um token, redireciona para o painel correto
        if (token) {
            // É preciso decodificar o token para saber o tipo de usuário
            try {
                const userType = JSON.parse(atob(token.split('.')[1])).type;
                if (userType === 'admin') {
                    window.location.href = '/admin-dashboard.html';
                } else if (userType === 'professional') {
                    window.location.href = '/professional-dashboard.html';
                }
                return; // Impede a execução do resto da função
            } catch (e) {
                // Se o token for inválido, limpa e continua para o login
                localStorage.clear();
            }
        }

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

                    // Redirecionamento baseado no tipo de usuário
                    if (data.userType === 'admin') {
                        localStorage.setItem('adminToken', data.accessToken);
                        window.location.href = '/admin-dashboard.html';
                    } else if (data.userType === 'professional') {
                        localStorage.setItem('professionalToken', data.accessToken);
                        window.location.href = '/professional-dashboard.html';
                    } else {
                        throw new Error('Tipo de usuário desconhecido.');
                    }

                } catch (error) {
                    console.error('Erro no login:', error);
                    alert(error.message);
                }
            });
        }
    }

    // --- LÓGICA DO PAINEL DE ADMIN (admin-dashboard.html) ---
    function handleAdminDashboardPage() {
        const professionalsTbody = document.getElementById('professionals-table-body');
        const logoutButton = document.getElementById('logout-button');
        const adminToken = localStorage.getItem('adminToken');

        if (!adminToken) {
            window.location.href = '/admin.html'; // Protege a página
            return;
        }

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
    
    // --- LÓGICA DO PAINEL DO PROFISSIONAL (professional-dashboard.html) ---
    function handleProfessionalDashboardPage() {
        const logoutButton = document.getElementById('logout-button'); // Assumindo que tenha um botão de logout
        const professionalToken = localStorage.getItem('professionalToken');

        if (!professionalToken) {
            window.location.href = '/admin.html'; // Protege a página
            return;
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('professionalToken');
                window.location.href = '/admin.html';
            });
        }
        
        // TODO: Adicionar aqui a lógica específica do painel do profissional
        // Ex: Carregar pacientes, agenda, etc.
        console.log("Painel do profissional carregado com sucesso.");
    }

    // --- Funções Auxiliares (compartilhadas pelo painel de admin) ---

    async function loadProfessionals(token, tbody) {
        try {
            const response = await fetch(`/api/admin/professionals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.clear(); // Limpa todos os tokens
                    window.location.href = '/admin.html';
                }
                throw new Error('Não foi possível carregar os profissionais.');
            }
            const professionals = await response.json();
            populateProfessionalsTable(professionals, tbody);
        } catch (error) {
            console.error('Erro ao carregar profissionais:', error);
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
                loadProfessionals(token, tbody);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao atualizar o status.');
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert(error.message);
        }
    }
});
