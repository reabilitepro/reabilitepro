document.addEventListener('DOMContentLoaded', () => {
    const welcomeMessage = document.getElementById('welcome-message');
    const invitationLinkContainer = document.getElementById('invitation-link-container');
    const patientsTable = document.querySelector('#patients-table tbody');
    const logoutButton = document.getElementById('logout-button');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        window.location.href = '/professional-login.html';
        return;
    }

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        alert('Você foi desconectado.');
        window.location.href = '/professional-login.html';
    });

    const copyToClipboard = (text, button) => {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copiado!';
            button.disabled = true;
            button.style.backgroundColor = '#28a745';
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
                button.style.backgroundColor = '';
            }, 2500);
        }).catch(err => {
            console.error('Error copying link: ', err);
            alert('Falha ao copiar o link.');
        });
    };

    const generateAndCopyLink = async (button) => {
        try {
            const response = await fetch('/api/professional-generate-link', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('accessToken');
                window.location.href = '/professional-login.html';
                return;
            }
            if (!response.ok) {
                throw new Error('Falha ao gerar o link no servidor.');
            }

            const data = await response.json();
            const fullCorrectLink = `${window.location.origin}${data.invitation_link}`;

            copyToClipboard(fullCorrectLink, button);

        } catch (error) {
            console.error('Error generating link:', error);
            alert(error.message);
        }
    };

    const setupDashboard = () => {
        fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.ok ? res.json() : window.location.href = '/professional-login.html')
            .then(data => {
                if(data) welcomeMessage.textContent = `Bem-vindo(a), ${data.name}!`;
            })
            .catch(err => console.error('Failed to fetch professional name', err));

        invitationLinkContainer.innerHTML = '';
        const generateButton = document.createElement('button');
        generateButton.textContent = 'Gerar e Copiar Novo Link de Paciente';
        generateButton.className = 'button-primary';
        generateButton.onclick = () => generateAndCopyLink(generateButton);
        invitationLinkContainer.appendChild(generateButton);
    };

    const fetchPatients = async () => {
        try {
            const response = await fetch('/api/professional-patients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar pacientes');
            const patients = await response.json();
            patientsTable.innerHTML = '';
            patients.forEach(patient => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${patient.id}</td>
                    <td>${patient.name}</td>
                    <td>${patient.phone}</td>
                    <td><button onclick="viewPatient(${patient.id})" class="button-secondary">Ver Detalhes</button></td>
                `;
                patientsTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error:', error);
        }
    };
    
    setupDashboard();
    fetchPatients();
});

function viewPatient(patientId) {
    window.location.href = `/patient-details.html?id=${patientId}`;
}
