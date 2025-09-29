document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('accessToken');
    const user = parseJwt(token);

    // Se não houver token ou o usuário não for admin, redireciona para a página de login de admin
    if (!token || user.type !== 'admin') {
        alert('Acesso negado. Por favor, faça login como administrador.');
        window.location.href = 'admin.html';
        return;
    }

    fetchDashboardData(token);

    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = 'index.html';
    });
});

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

async function fetchDashboardData(token) {
    try {
        const response = await fetch('/api/admin/dashboard-data', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar dados do painel.');
        }

        const data = await response.json();
        populateProfessionalsTable(data.professionals, token);
        populatePatientsTable(data.patients);

    } catch (error) {
        console.error('Erro:', error);
        alert(error.message);
    }
}

function populateProfessionalsTable(professionals, token) {
    const tableBody = document.querySelector('#professionals-table tbody');
    tableBody.innerHTML = ''; // Limpa a tabela antes de preencher

    if (professionals.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">Nenhum profissional encontrado.</td></tr>';
        return;
    }

    professionals.forEach(prof => {
        const row = document.createElement('tr');

        let statusClass = '';
        if (prof.registrationstatus === 'Pendente') statusClass = 'status-pendente';
        if (prof.registrationstatus === 'Aprovado') statusClass = 'status-aprovado';

        row.innerHTML = `
            <td>${prof.fullname}</td>
            <td>${prof.email}</td>
            <td>${prof.profession}</td>
            <td>${prof.registrationnumber}</td>
            <td><span class="${statusClass}">${prof.registrationstatus}</span></td>
            <td>
                ${prof.registrationstatus === 'Pendente' ? 
                `<button class="button-approve" data-id="${prof.id}">Aprovar</button>` : 
                '-'}
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Adiciona os event listeners para os botões de aprovar
    document.querySelectorAll('.button-approve').forEach(button => {
        button.addEventListener('click', (event) => {
            const professionalId = event.target.getAttribute('data-id');
            approveProfessional(professionalId, token);
        });
    });
}

function populatePatientsTable(patients) {
    const tableBody = document.querySelector('#patients-table tbody');
    tableBody.innerHTML = ''; // Limpa a tabela

    if (patients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">Nenhum paciente encontrado.</td></tr>';
        return;
    }

    patients.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${patient.name}</td>
            <td>${patient.email}</td>
            <td>${patient.phone || 'Não informado'}</td>
            <td>${patient.professional_id || 'Nenhum'}</td>
        `;
        tableBody.appendChild(row);
    });
}

async function approveProfessional(id, token) {
    if (!confirm('Tem certeza que deseja aprovar este profissional?')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/professionals/${id}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Falha ao aprovar profissional.');
        }

        alert('Profissional aprovado com sucesso!');
        fetchDashboardData(token); // Recarrega os dados para atualizar a tabela

    } catch (error) {
        console.error('Erro ao aprovar:', error);
        alert(error.message);
    }
}