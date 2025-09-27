document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'professional') {
        window.location.href = '/professional-login.html';
        return;
    }

    const professionalName = localStorage.getItem('professionalName');
    if (professionalName) {
        document.getElementById('professional-name').textContent = professionalName;
    }

    const generateLinkBtn = document.getElementById('generate-link-btn');
    const invitationLinkElement = document.getElementById('invitation-link');

    generateLinkBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/admin/generate-invitation-links', {
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
