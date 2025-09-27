document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    const adminLoginForm = document.getElementById('admin-login-form');
    const professionalsTbody = document.getElementById('professionals-table-body');

    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        // Se houver token, assumimos que o usuário está logado.
        // Ocultamos o login e exibimos o painel.
        if(loginContainer) loginContainer.style.display = 'none';
        if(adminDashboard) adminDashboard.style.display = 'block';
        loadProfessionals();
    } else {
        // Se não houver token, garantimos que o painel de admin não seja mostrado
        // e que o formulário de login (se existir na página) seja visível.
        if(adminDashboard) adminDashboard.style.display = 'none';
    }

    if(adminLoginForm) {
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
                        // Redireciona para a página do painel após o login bem-sucedido
                        window.location.href = '/admin-dashboard.html';
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

    async function loadProfessionals() {
        const token = localStorage.getItem('adminToken');
        // Se não houver token, não faz nada. A verificação já acontece no início.
        if (!token) return;
        // Se a tabela de profissionais não existir na página, não continue.
        if (!professionalsTbody) return; 

        try {
            const timestamp = new Date().getTime(); // Cache-busting
            const response = await fetch(`/api/admin/professionals?_t=${timestamp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if(response.status === 401 || response.status === 403) {
                    localStorage.removeItem('adminToken');
                    // Redireciona para a página de login se o token for inválido
                    window.location.href = '/admin.html'; 
                }
                throw new Error('Não foi possível carregar os profissionais.');
            }

            const professionals = await response.json();
            populateProfessionalsTable(professionals);

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    }

    function populateProfessionalsTable(professionals) {
        if (!professionalsTbody) return;
        professionalsTbody.innerHTML = '';
        professionals.forEach(prof => {
            const row = professionalsTbody.insertRow();
            row.dataset.id = prof.id;

            row.innerHTML = `
                <td>${prof.fullName}</td>
                <td>${prof.email}</td>
                <td>${prof.profession}</td>
                <td>${prof.professionalLicense}</td>
                <td><span class="status status-${prof.registrationStatus.toLowerCase()}">${prof.registrationStatus}</span></td>
                <td class="actions">
                    <select class="status-select">
                        <option value="Pendente" ${prof.registrationStatus === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Aprovado" ${prof.registrationStatus === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                        <option value="Rejeitado" ${prof.registrationStatus === 'Rejeitado' ? 'selected' : ''}>Rejeitado</option>
                    </select>
                    <button class="save-status-btn">Salvar Status</button>
                </td>
            `;
        });
    }
    
    const logoutButton = document.getElementById('logout-button');
    if(logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin.html'; // Leva para a página de login
        });
    }

    if(professionalsTbody){
        professionalsTbody.addEventListener('click', async (event) => {
            const target = event.target;
            if (target.classList.contains('save-status-btn')) {
                const row = target.closest('tr');
                const id = row.dataset.id;
                const token = localStorage.getItem('adminToken');
                const newStatus = row.querySelector('.status-select').value;

                if (!id || !token) return;

                try {
                    const response = await fetch(`/api/admin/professionals/${id}` , {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ registrationStatus: newStatus })
                    });

                    if (response.ok) {
                        alert('Status do profissional atualizado com sucesso!');
                        loadProfessionals(); // Recarrega a tabela
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
    }

    // Carrega os profissionais na carga inicial da página (se o token existir)
    loadProfessionals();
});
