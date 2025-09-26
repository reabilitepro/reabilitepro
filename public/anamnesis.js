document.addEventListener('DOMContentLoaded', async () => {
    const anamnesisForm = document.getElementById('anamnesis-form');
    const errorMessage = document.getElementById('error-message');
    const token = localStorage.getItem('accessToken'); // Pega o token do paciente

    if (!token) {
        // Se não houver token, redireciona para o login, pois algo deu errado.
        window.location.href = '/patient-login.html';
        return;
    }

    // Função para buscar os dados do paciente e exibir a seção correta
    const setupForm = async () => {
        try {
            // Precisamos de uma rota no backend que retorne o perfil do próprio paciente
            const response = await fetch('/api/patient/profile', { 
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Não foi possível carregar seus dados.');
            }

            const patient = await response.json();
            const focusArea = patient.focus_area;

            // Esconde todas as seções primeiro
            document.querySelectorAll('.specialty-section').forEach(section => {
                section.style.display = 'none';
            });

            // Mostra a seção correta com base no foco do atendimento
            const sectionToShow = document.getElementById(`${focusArea}_section`);
            if (sectionToShow) {
                sectionToShow.style.display = 'block';
            }

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    };

    // Evento de envio do formulário de anamnese
    anamnesisForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.style.display = 'none';

        const formData = new FormData(anamnesisForm);
        const anamnesisData = Object.fromEntries(formData.entries());

        try {
            // Rota para atualizar o paciente com os dados da anamnese
            const response = await fetch('/api/patient/anamnesis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(anamnesisData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Falha ao enviar a anamnese.');
            }

            alert('Obrigado por preencher! Você será redirecionado para o seu painel.');
            window.location.href = '/patient-dashboard.html'; // Redireciona para o painel do paciente

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });

    // Inicia o setup do formulário assim que a página carrega
    setupForm();
});
