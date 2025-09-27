document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('professionalToken');

    // Proteção da página: se não houver token, volta para o login.
    if (!token) {
        window.location.href = '/admin.html';
        return;
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('professionalToken');
            window.location.href = '/admin.html';
        });
    }

    // TODO: Adicionar aqui a lógica para carregar os dados do perfil do profissional.
    console.log('Página do profissional carregada com sucesso.');
});
