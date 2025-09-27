document.addEventListener('DOMContentLoaded', () => {
    // O "roteador" principal (admin-dashboard.js) já cuidou da autenticação.
    // Este script agora foca apenas nas funcionalidades DENTRO do painel.

    const generateLinkButton = document.getElementById('generate-link-btn');
    const patientsTableBody = document.querySelector('#patients-table-body');
    const logoutButton = document.getElementById('logout-button');
    
    // O token é necessário para as chamadas de API, mas a proteção da página já foi feita.
    const professionalToken = localStorage.getItem('professionalToken');

    // Se, por algum motivo, o token não estiver aqui, a próxima chamada de API falhará e a lógica de erro do roteador principal assumirá.

    // --- LÓGICA DE LOGOUT ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('professionalToken');
            alert('Você foi desconectado.');
            window.location.href = '/admin.html'; // Redireciona para a página de login unificada
        });
    }

    // --- FUNÇÃO PARA COPIAR TEXTO ---
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
            }, 3000);
        }).catch(err => {
            console.error('Erro ao copiar o link: ', err);
            alert('Falha ao copiar o link.');
        });
    };

    // --- LÓGICA PARA GERAR LINK DE CONVITE ---
    const handleGenerateLink = async () => {
        const button = generateLinkButton;
        button.disabled = true;
        button.textContent = 'Gerando...';

        try {
            const response = await fetch('/api/professionals/generate-link', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${professionalToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                 // A lógica de erro no roteador principal (admin-dashboard.js) cuidará do redirecionamento se for 401/403
                throw new Error(data.message || 'Falha ao gerar o link no servidor.');
            }

            copyToClipboard(data.invitationLink, button);

        } catch (error) {
            console.error('Erro ao gerar link:', error);
            alert(error.message);
            button.textContent = 'Gerar e Copiar Novo Link de Paciente';
        } finally {
            if (button.textContent !== 'Copiado!') {
                button.disabled = false;
            }
        }
    };

    if (generateLinkButton) {
        generateLinkButton.addEventListener('click', handleGenerateLink);
    }

    // --- LÓGICA PARA CARREGAR PACIENTES (a ser implementada) ---
    const fetchPatients = async () => {
        console.log("Ainda a implementar: carregar pacientes do profissional.");
        // Exemplo: 
        // const response = await fetch('/api/professionals/my-patients', { headers: { 'Authorization': `Bearer ${professionalToken}` } });
        // const patients = await response.json();
        // popularTabelaDePacientes(patients);
    };

    // Inicializa as funcionalidades do painel
    fetchPatients();
});
