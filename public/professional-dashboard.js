document.addEventListener('DOMContentLoaded', () => {
    // CORREÇÃO: Procurar por 'professionalToken' em vez de 'accessToken'
    const token = localStorage.getItem('professionalToken');

    // Se o token não existir, o acesso é negado
    if (!token) {
        // Limpa qualquer dado residual e redireciona para a página de login correta
        localStorage.clear();
        window.location.href = '/professional-login.html';
        return;
    }

    // O resto da lógica do painel só é executada se o token existir
    const professionalName = localStorage.getItem('professionalName'); // Assumindo que o nome possa ser guardado no futuro
    if (professionalName) {
        document.getElementById('professional-name').textContent = professionalName;
    }

    const generateLinkBtn = document.getElementById('generate-link-btn');
    const invitationLinkElement = document.getElementById('invitation-link');

    generateLinkBtn.addEventListener('click', async () => {
        try {
            // CORREÇÃO: A rota para gerar links é /api/professionals/generate-link
            const response = await fetch('/api/professionals/generate-link', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                invitationLinkElement.value = data.invitationLink;
                alert('Link de convite gerado com sucesso!');
            } else {
                throw new Error(data.message || 'Falha ao gerar o link.');
            }
        } catch (error) {
            console.error('Erro ao gerar link:', error);
            alert(`Erro: ${error.message}`);
        }
    });

    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });
});
