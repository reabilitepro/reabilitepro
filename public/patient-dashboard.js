document.addEventListener('DOMContentLoaded', async () => {
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const evolutionContainer = document.getElementById('evolution-notes-container');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        window.location.href = '/patient-login.html';
        return;
    }

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        alert('Você foi desconectado.');
        window.location.href = '/patient-login.html';
    });

    const renderEvolutions = (evolutions = []) => {
        evolutionContainer.innerHTML = '';
        if (!evolutions || evolutions.length === 0) {
            evolutionContainer.innerHTML = '<p>Nenhuma nota de evolução ou plano de tratamento compartilhado ainda.</p>';
            return;
        }

        const evolutionList = document.createElement('ul');
        evolutionList.className = 'evolution-list';

        evolutions.slice().reverse().forEach(evo => {
            const listItem = document.createElement('li');
            listItem.className = 'evolution-item';
            listItem.innerHTML = `
                <p class="evolution-text">${evo.note}</p>
                <span class="evolution-date">${new Date(evo.date).toLocaleString('pt-BR')}</span>
            `;
            evolutionList.appendChild(listItem);
        });

        evolutionContainer.appendChild(evolutionList);
    };

    try {
        const response = await fetch('/api/patient/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('accessToken');
            window.location.href = '/patient-login.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Não foi possível carregar os dados do painel.');
        }

        const patient = await response.json();

        welcomeMessage.textContent = `Bem-vindo(a), ${patient.name.split(' ')[0]}!`;
        document.getElementById('patient-name').textContent = patient.name;
        document.getElementById('patient-email').textContent = patient.email || 'Não informado';
        document.getElementById('patient-phone').textContent = patient.phone;
        document.getElementById('patient-dob').textContent = new Date(patient.dob + 'T00:00:00').toLocaleDateString('pt-BR');
        document.getElementById('patient-address').textContent = patient.address || 'Não informado';
        document.getElementById('patient-notes').textContent = patient.notes || 'Nenhuma observação';

        renderEvolutions(patient.evolutions);

    } catch (error) {
        console.error('Error fetching dashboard:', error);
        alert(error.message);
    }
});
