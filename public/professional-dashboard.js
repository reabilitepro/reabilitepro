document.addEventListener('DOMContentLoaded', () => {
    // Seletores de elementos da página
    const generateLinkButton = document.getElementById('generate-link-btn');
    const patientsTableBody = document.querySelector('#patients-table tbody');
    const logoutButton = document.getElementById('logout-button');

    // Pega o token do profissional do localStorage
    const professionalToken = localStorage.getItem('professionalToken');

    // 1. VERIFICAÇÃO DE AUTENTICAÇÃO
    // Se não houver token, redireciona imediatamente para a página de login.
    if (!professionalToken) {
        window.location.href = '/admin.html'; 
        return; // Interrompe a execução do script
    }

    // 2. CONFIGURAÇÃO DO BOTÃO DE LOGOUT
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('professionalToken');
            alert('Você foi desconectado.');
            window.location.href = '/admin.html';
        });
    }

    // 3. FUNÇÃO PARA COPIAR TEXTO PARA A ÁREA DE TRANSFERÊNCIA
    const copyToClipboard = (text, button) => {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copiado!';
            button.disabled = true;
            button.style.backgroundColor = '#28a745'; // Verde para indicar sucesso
            // Retorna ao estado original após um tempo
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
                button.style.backgroundColor = ''; // Cor original
            }, 3000);
        }).catch(err => {
            console.error('Erro ao copiar o link: ', err);
            alert('Falha ao copiar o link para a área de transferência.');
        });
    };

    // 4. FUNÇÃO PARA GERAR O LINK DE CONVITE
    const handleGenerateLink = async () => {
        const button = generateLinkButton;
        button.disabled = true; // Desabilita o botão para evitar cliques múltiplos
        button.textContent = 'Gerando...';

        try {
            // Chama a nova rota do backend para gerar o link
            const response = await fetch('/api/professionals/generate-link', {
                method: 'POST',
                headers: {
                    // Envia o token de profissional para autenticação
                    'Authorization': `Bearer ${professionalToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            // Se a resposta não for OK, trata como um erro
            if (!response.ok) {
                // Se a sessão expirou ou o acesso foi negado, desloga o usuário
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('professionalToken');
                    window.location.href = '/admin.html';
                }
                throw new Error(data.message || 'Falha ao gerar o link no servidor.');
            }

            // Se tudo deu certo, copia o link recebido para a área de transferência
            copyToClipboard(data.invitationLink, button);

        } catch (error) {
            console.error('Erro ao gerar link:', error);
            alert(error.message); // Exibe a mensagem de erro para o usuário (ex: "Limite de pacientes atingido")
            button.textContent = 'Gerar e Copiar Novo Link de Paciente'; // Restaura o texto do botão em caso de erro
        } finally {
            // Garante que o botão seja reativado se não estiver no modo "Copiado!"
            if (button.textContent !== 'Copiado!') {
                button.disabled = false;
            }
        }
    };

    // 5. Adiciona o listener de evento ao botão de gerar link
    if (generateLinkButton) {
        generateLinkButton.addEventListener('click', handleGenerateLink);
    }

    // 6. FUNÇÃO PARA CARREGAR PACIENTES (a ser implementada ou conectada)
    const fetchPatients = async () => {
        // Esta função será conectada à rota correta para buscar os pacientes do profissional
        console.log("Funcionalidade de carregar pacientes ainda será implementada.");
        if (patientsTableBody) {
            //patientsTableBody.innerHTML = '<tr><td colspan="4">Carregando pacientes...</td></tr>';
            // Implementar a chamada fetch para /api/professionals/patients aqui
        }
    };
    
    // Inicializa o dashboard
    fetchPatients();
});

// Função global para ver detalhes do paciente (se aplicável)
function viewPatient(patientId) {
    window.location.href = `/patient-details.html?id=${patientId}`;
}
