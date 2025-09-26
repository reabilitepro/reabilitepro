document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('patient-registration-form');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        alert('Token de convite inválido ou ausente. Por favor, use o link fornecido pelo seu profissional.');
        registrationForm.innerHTML = '<p>Link de convite inválido.</p>';
        return;
    }

    registrationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(registrationForm);
        const patientData = Object.fromEntries(formData.entries());
        
        // Validação simples dos campos
        if (patientData.password !== patientData.confirmPassword) {
            alert('As senhas não coincidem.');
            return;
        }

        try {
            const response = await fetch('/api/register-patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, ...patientData })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Ocorreu um erro ao processar seu cadastro.');
            }

            alert('Cadastro realizado com sucesso! Você será redirecionado para a página de login.');
            window.location.href = '/patient-login.html'; // Supondo que exista uma página de login para pacientes

        } catch (error) {
            console.error('Erro no cadastro:', error);
            alert(`Erro no cadastro: ${error.message}`);
        }
    });
});