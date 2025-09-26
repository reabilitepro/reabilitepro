document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    const adminLoginForm = document.getElementById('admin-login-form');

    const professionalsTbody = document.getElementById('professionals-table').querySelector('tbody');
    const patientsTbody = document.getElementById('patients-table').querySelector('tbody');

    adminLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        try {
            const response = await fetch('/getAdminData', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                loginContainer.style.display = 'none';
                adminDashboard.style.display = 'block';
                populateTables(data.professionals, data.patients);
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Credenciais de administrador inválidas.');
            }
        } catch (error) {
            console.error('Erro no login de administrador:', error);
            alert('Ocorreu um erro ao tentar fazer login. Verifique o console para mais detalhes.');
        }
    });

    function populateTables(professionals, patients) {
        professionalsTbody.innerHTML = '';
        patientsTbody.innerHTML = '';

        professionals.forEach(prof => {
            const row = professionalsTbody.insertRow();
            row.innerHTML = `
                <td>${prof.id}</td>
                <td>${prof.name}</td>
                <td>${prof.email}</td>
                <td>${prof.linkCount}</td>
                <td><button onclick="addLinks('${prof.id}')">Adicionar Links</button></td>
            `;
        });

        patients.forEach(patient => {
            const row = patientsTbody.insertRow();
            row.innerHTML = `
                <td>${patient.id}</td>
                <td>${patient.name}</td>
                <td>${patient.phone}</td>
                <td>${patient.professionalName}</td>
            `;
        });
    }

    window.addLinks = async function(professionalId) {
        const quantity = prompt('Quantos links de convite deseja gerar?');
        if (quantity && !isNaN(quantity) && Number(quantity) > 0) {
            try {
                const response = await fetch('/generateInvitationLinks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ professionalId, quantity: Number(quantity) })
                });

                if (response.ok) {
                    alert('Links gerados com sucesso! Atualizando dados...');
                    document.getElementById('admin-login-form').dispatchEvent(new Event('submit'));
                } else {
                    const error = await response.json();
                    alert(`Erro ao gerar links: ${error.error}`);
                }
            } catch (error) {
                console.error('Erro ao gerar links:', error);
                alert('Ocorreu um erro ao gerar os links.');
            }
        } else if (quantity) {
            alert('Por favor, insira um número válido.');
        }
    }
});
