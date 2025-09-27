document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('professionalToken');

    // Proteção da página: se não houver token, volta para o login correto.
    if (!token) {
        window.location.href = '/professional-login.html';
        return;
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('professionalToken');
            // Envia para a página de login correta ao sair.
            window.location.href = '/professional-login.html';
        });
    }

    // TODO: Adicionar aqui a lógica para carregar os dados do perfil do profissional.
    console.log('Página do profissional carregada com sucesso.');
});
