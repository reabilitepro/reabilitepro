document.getElementById('professional-registration-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/register-professional', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha no cadastro.');
        }

        alert('Cadastro realizado com sucesso! Sua conta está pendente de aprovação por um administrador.');
        form.reset();

    } catch (error) {
        alert(`Erro: ${error.message}`);
    }
});