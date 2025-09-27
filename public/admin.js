
document.addEventListener('DOMContentLoaded', () => {
    const adminToken = localStorage.getItem('adminToken');

    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    const adminLoginForm = document.getElementById('admin-login-form');

    // Se tem token, mostra o painel. Senão, mostra o login.
    if (adminToken) {
        loginContainer.style.display = 'none';
        adminDashboard.style.display = 'block';
        handleAdminDashboardPage(adminToken);
    } else {
        loginContainer.style.display = 'block';
        adminDashboard.style.display = 'none';
        handleLoginPage();
    }

    // --- LÓGICA DA PÁGINA DE LOGIN ---
    function handleLoginPage() {
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const email = document.getElementById('admin-email').value;
                const password = document.getElementById('admin-password').value;

                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, userType: 'admin' }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || 'Credenciais inválidas.');
                    }

                    localStorage.setItem('adminToken', data.accessToken);
                    window.location.reload(); // Recarrega a página para mostrar o painel

                } catch (error) {
                    alert(error.message);
                }
            });
        }
    }

    // --- LÓGICA DO PAINEL DE ADMIN ---
    function handleAdminDashboardPage(token) {
        const professionalsTbody = document.querySelector('#professionals-table tbody');
        
        if (professionalsTbody) {
            loadProfessionals(token, professionalsTbody);
            // Adicionar outros event listeners do painel aqui, se necessário
        }
    }

    // --- Funções Auxiliares do Painel de Admin ---

    async function loadProfessionals(token, tbody) {
        try {
            const response = await fetch(`/api/admin/professionals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) { 
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao carregar dados.'); 
            }

            const professionals = await response.json();
            populateProfessionalsTable(professionals, tbody);
        } catch (error) {
            console.error('Erro ao carregar profissionais:', error); 
            alert('Erro ao carregar profissionais: ' + error.message);
        }
    }

    function populateProfessionalsTable(professionals, tbody) {
        tbody.innerHTML = '';
        if (!professionals || professionals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Nenhum profissional encontrado.</td></tr>';
            return;
        }
        
        professionals.forEach(prof => {
            if (!prof) return; // Pula qualquer item nulo/indefinido

            const row = tbody.insertRow();
            row.dataset.id = prof.id;

            // **CORREÇÃO DEFINITIVA**
            // Garante que o status sempre tenha um valor e seja uma string antes de usar toLowerCase
            const status = prof.registrationstatus || prof.registrationStatus || 'Pendente';
            const statusClass = status.toLowerCase();
            const patientLimit = prof.patientlimit ?? 'N/A';

            row.innerHTML = `
                <td>${prof.name || 'N/A'}</td>
                <td>${prof.email || 'N/A'}</td>
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
});
