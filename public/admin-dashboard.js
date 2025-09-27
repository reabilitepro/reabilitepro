document.addEventListener('DOMContentLoaded', () => {
    const professionalsTableBody = document.getElementById('professionals-table-body');
    const patientsTableBody = document.getElementById('patients-table-body');
    const logoutButton = document.getElementById('logout-button');

    // CORREÇÃO: Usar 'accessToken' e redirecionar para a página de login correta.
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = '/professional-login.html';
    });

    // CORREÇÃO: Buscar o token pelo nome correto ('accessToken').
    const token = localStorage.getItem('accessToken');
    if (!token) {
        // CORREÇÃO: Redirecionar para a página de login correta.
        window.location.href = '/professional-login.html';
        return; // Parar a execução do script se não houver token.
    }

    const fetchProfessionals = async () => {
        try {
            const response = await fetch('/api/admin-professionals', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao buscar profissionais.');
            const professionals = await response.json();
            renderProfessionals(professionals);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchPatients = async () => {
        try {
            const response = await fetch('/api/admin-patients', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao buscar pacientes.');
            const patients = await response.json();
            renderPatients(patients);
        } catch (error) {
            console.error(error);
        }
    };

    const renderProfessionals = (professionals) => {
        professionalsTableBody.innerHTML = '';
        professionals.forEach(prof => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prof.name}</td>
                <td>${prof.email}</td>
                <td>${prof.profession}</td>
                <td>${prof.registrationNumber}</td>
                <td>${prof.registrationStatus}</td>
                <td>
                    ${prof.registrationStatus === 'Pendente' ?
                    `<button onclick="updateStatus(${prof.id}, 'Aprovado')" class="button-approve">Aprovar</button>
                     <button onclick="updateStatus(${prof.id}, 'Recusado')" class="button-reject">Recusar</button>` : ''}
                </td>
            `;
            professionalsTableBody.appendChild(row);
        });
    };

    const renderPatients = (patients) => {
        patientsTableBody.innerHTML = '';
        patients.forEach(patient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.name}</td>
                <td>${patient.email}</td>
                <td>${patient.phone}</td>
                <td></td>
            `;
            patientsTableBody.appendChild(row);
        });
    };

    window.updateStatus = async (id, status) => {
        try {
            const response = await fetch('/api/update-professional-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id, status })
            });
            if (!response.ok) throw new Error('Falha ao atualizar status.');
            fetchProfessionals();
        } catch (error) {
            console.error(error);
        }
    };

    fetchProfessionals();
    fetchPatients();
});