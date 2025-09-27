document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    const adminLoginForm = document.getElementById('admin-login-form');
    const professionalsTbody = document.getElementById('professionals-table').querySelector('tbody');

    // Verifica se já existe um token de admin no localStorage
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        loginContainer.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadProfessionals();
    }

    // Handler para o login do admin
    adminLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        try {
            // Rota de login unificada, que também serve para admin
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                // Verifica se o tipo de usuário é realmente 'admin'
                if (data.userType === 'admin') {
                    localStorage.setItem('adminToken', data.accessToken);
                    loginContainer.style.display = 'none';
                    adminDashboard.style.display = 'block';
                    loadProfessionals();
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

    // Carrega e exibe a lista de profissionais
    async function loadProfessionals() {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            const response = await fetch('/api/admin/professionals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if(response.status === 403) localStorage.removeItem('adminToken'); // Token inválido
                throw new Error('Não foi possível carregar os profissionais.');
            }

            const professionals = await response.json();
            populateProfessionalsTable(professionals);

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    }

    // Preenche a tabela de profissionais com os dados
    function populateProfessionalsTable(professionals) {
        professionalsTbody.innerHTML = '';
        professionals.forEach(prof => {
            const row = professionalsTbody.insertRow();
            row.dataset.id = prof.id; // Adiciona o ID do profissional na linha

            row.innerHTML = `
                <td>${prof.fullName}</td>
                <td>${prof.email}</td>
                <td><span class="status status-${prof.registrationStatus.toLowerCase()}">${prof.registrationStatus}</span></td>
                <td><input type="number" class="patient-limit-input" value="${prof.patientLimit || 0}" min="0"></td>
                <td class="actions"></td>
            `;

            const actionsCell = row.querySelector('.actions');
            
            // Adiciona o botão de Aprovar se o status for Pendente
            if (prof.registrationStatus === 'Pendente') {
                const approveButton = document.createElement('button');
                approveButton.textContent = 'Aprovar';
                approveButton.className = 'approve-btn';
                actionsCell.appendChild(approveButton);
            }

            // Adiciona o botão de Salvar para o limite de pacientes
            const saveButton = document.createElement('button');
            saveButton.textContent = 'Salvar';
            saveButton.className = 'save-btn';
            actionsCell.appendChild(saveButton);
        });
    }

    // Delegação de eventos para os botões de ação na tabela
    professionalsTbody.addEventListener('click', async (event) => {
        const target = event.target;
        const row = target.closest('tr');
        const id = row.dataset.id;
        const token = localStorage.getItem('adminToken');
        
        if (!id || !token) return;

        let body = {};
        let action = '';

        // Se o botão 'Aprovar' foi clicado
        if (target.classList.contains('approve-btn')) {
            action = 'aprovar';
            body.registrationStatus = 'Aprovado';
        } 
        // Se o botão 'Salvar' foi clicado
        else if (target.classList.contains('save-btn')) {
            action = 'salvar';
            const limitInput = row.querySelector('.patient-limit-input');
            body.patientLimit = parseInt(limitInput.value, 10);
        }

        if (!action) return;

        try {
            const response = await fetch(`/api/admin/professionals/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                alert(`Profissional atualizado com sucesso!`);
                loadProfessionals(); // Recarrega a tabela para mostrar o estado atualizado
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || `Falha ao ${action}.`);
            }
        } catch (error) {
            console.error(`Erro ao ${action} profissional:`, error);
            alert(error.message);
        }
    });
});
