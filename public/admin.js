document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    const adminLoginForm = document.getElementById('admin-login-form');
    const professionalsTbody = document.getElementById('professionals-table').querySelector('tbody');
    const logoutButton = document.createElement('button');

    logoutButton.textContent = 'Sair';
    logoutButton.id = 'logout-button';
    
    const header = document.querySelector('header');
    if(header) header.appendChild(logoutButton);

    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        loginContainer.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadProfessionals();
    } else {
        loginContainer.style.display = 'block';
        adminDashboard.style.display = 'none';
    }

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
                    localStorage.setItem('accessToken', data.accessToken);
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

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = '/admin.html';
    });

    async function loadProfessionals() {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/admin/professionals?_t=${timestamp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if(response.status === 403) {
                    localStorage.removeItem('accessToken');
                    window.location.reload();
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
        professionalsTbody.innerHTML = '';
        professionals.forEach(prof => {
            const row = professionalsTbody.insertRow();
            row.dataset.id = prof.id;

            const status = prof.registrationstatus || 'Indefinido';
            const statusClass = status.toLowerCase();

            row.innerHTML = `
                <td>${prof.fullname || 'N/A'}</td>
                <td>${prof.email || 'N/A'}</td>
                <td><span class="status status-${statusClass}">${status}</span></td>
                <td><input type="number" class="patient-limit-input" value="${prof.patientlimit || 0}" min="0"></td>
                <td class="actions"></td>
            `;

            const actionsCell = row.querySelector('.actions');
            
            if (status === 'Pendente') {
                const approveButton = document.createElement('button');
                approveButton.textContent = 'Aprovar';
                approveButton.className = 'approve-btn';
                actionsCell.appendChild(approveButton);
            }

            const saveButton = document.createElement('button');
            saveButton.textContent = 'Salvar';
            saveButton.className = 'save-btn';
            actionsCell.appendChild(saveButton);
        });
    }

    professionalsTbody.addEventListener('click', async (event) => {
        const target = event.target;
        const row = target.closest('tr');
        if (!row) return;
        
        const id = row.dataset.id;
        const token = localStorage.getItem('accessToken');
        
        if (!id || !token) return;

        let body = {};
        let action = '';

        if (target.classList.contains('approve-btn')) {
            action = 'aprovar';
            body.registrationStatus = 'Aprovado';
            const limitInput = row.querySelector('.patient-limit-input');
            body.patientLimit = parseInt(limitInput.value, 10);

        } else if (target.classList.contains('save-btn')) {
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
                alert('Profissional atualizado com sucesso!');
                loadProfessionals(); 
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