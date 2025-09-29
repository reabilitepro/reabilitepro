document.addEventListener('DOMContentLoaded', () => {
    const professionalsTbody = document.querySelector('#professionals-table tbody');
    const patientsTbody = document.querySelector('#patients-table tbody');
    const logoutButton = document.getElementById('logout-button');

    const token = localStorage.getItem('accessToken'); // PADRONIZADO

    if (!token) {
        window.location.href = 'admin.html';
        return;
    }

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken'); // PADRONIZADO
        window.location.href = 'admin.html';
    });

    async function loadData() {
        try {
            const response = await fetch('/api/admin/data', { // ROTA CORRIGIDA
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Não foi possível carregar os dados do painel.');
            }

            populateTable(professionalsTbody, data.professionals, createProfessionalRow);
            populateTable(patientsTbody, data.patients, createPatientRow);

        } catch (error) {
            alert(error.message);
            // Se houver erro (ex: token expirado), redireciona para o login
            localStorage.removeItem('accessToken'); // PADRONIZADO
            window.location.href = 'admin.html';
        }
    }

    async function updateProfessionalStatus(id, newStatus) {
        try {
            const response = await fetch(`/api/admin/professionals/${id}`, { // ROTA CORRIGIDA
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ registrationStatus: newStatus })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Falha ao atualizar o status.');
            }

            alert('Status do profissional atualizado com sucesso!');
            loadData(); // Recarrega os dados para refletir a mudança

        } catch (error) {
            alert('Erro: ' + error.message);
        }
    }

    function populateTable(tbody, data, createRowFunction) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            const colSpan = tbody.closest('table').querySelector('thead th').length;
            tbody.innerHTML = `<tr><td colspan="${colSpan}">Nenhum dado encontrado.</td></tr>`;
            return;
        }
        data.forEach(item => {
            if (item) tbody.appendChild(createRowFunction(item));
        });
    }

    function createProfessionalRow(prof) {
        const row = document.createElement('tr');
        row.dataset.id = prof.id;
        const status = prof.registrationstatus || 'Pendente';
        row.innerHTML = `
            <td>${prof.fullname || 'N/A'}</td>
            <td>${prof.email || 'N/A'}</td>
            <td><span class="status status-${status.toLowerCase()}">${status}</span></td>
            <td>${prof.patientlimit ?? 'N/A'}</td>
            <td class="actions">
                <select class="status-select">
                    <option value="Pendente" ${status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Aprovado" ${status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                    <option value="Rejeitado" ${status === 'Rejeitado' ? 'selected' : ''}>Rejeitado</option>
                </select>
                <button class="save-status-btn">Salvar</button>
            </td>
        `;

        row.querySelector('.save-status-btn').addEventListener('click', () => {
            const newStatus = row.querySelector('.status-select').value;
            updateProfessionalStatus(prof.id, newStatus);
        });

        return row;
    }

    function createPatientRow(patient) {
        const row = document.createElement('tr');
        row.dataset.id = patient.id;
        row.innerHTML = `
            <td>${patient.id}</td>
            <td>${patient.name || 'N/A'}</td>
            <td>${patient.phone || 'N/A'}</td>
            <td>${patient.professional_name || 'Nenhum'}</td>
        `;
        return row;
    }

    // Carrega os dados assim que a página é aberta
    loadData();
});