document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/professional-login.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('id');
    
    // Formulário de Evolução
    const evolutionHistoryDiv = document.getElementById('evolution-history');
    const evolutionForm = document.getElementById('evolution-form');
    const evolutionNoteTextarea = document.getElementById('evolution-note');

    // Novo: Formulário de Programa
    const programForm = document.getElementById('program-form');
    const patientProgramTextarea = document.getElementById('patient-program');

    if (!patientId) {
        alert('ID do paciente não encontrado.');
        history.back();
        return;
    }

    const focusAreaMapping = {
        mental_health: 'Saúde Mental (Psicologia)',
        nutrition: 'Nutrição e Alimentação',
        physical_fitness: 'Condicionamento Físico'
    };
    
    const renderEvolutions = (evolutions = []) => {
        evolutionHistoryDiv.innerHTML = '';
        if (evolutions.length === 0) {
            evolutionHistoryDiv.innerHTML = '<p>Nenhuma nota de evolução registrada ainda.</p>';
            return;
        }
        const evolutionList = document.createElement('ul');
        evolutionList.className = 'evolution-list';
        evolutions.slice().reverse().forEach(evo => {
            const listItem = document.createElement('li');
            listItem.className = 'evolution-item';
            listItem.innerHTML = `
                <p class="evolution-text">${evo.note}</p>
                <span class="evolution-date">${new Date(evo.date).toLocaleString('pt-BR')}</span>
            `;
            evolutionList.appendChild(listItem);
        });
        evolutionHistoryDiv.appendChild(evolutionList);
    };

    // Novo: Renderiza os detalhes específicos da anamnese
    const renderSpecificAnamnesis = (patient) => {
        const container = document.getElementById('specific-anamnesis-details');
        container.innerHTML = ''; // Limpa o container
        let detailsHtml = '';

        switch (patient.focus_area) {
            case 'physical_fitness':
                detailsHtml = `
                    <p><strong>Objetivo com os Treinos:</strong> ${patient.fitness_goal || 'Não informado'}</p>
                    <p><strong>Histórico de Lesões/Dores:</strong> ${patient.injury_history || 'Não informado'}</p>
                `;
                break;
            case 'nutrition':
                detailsHtml = `
                    <p><strong>Objetivo com a Alimentação:</strong> ${patient.nutrition_goal || 'Não informado'}</p>
                    <p><strong>Restrições/Preferências Alimentares:</strong> ${patient.dietary_restrictions || 'Não informado'}</p>
                `;
                break;
            case 'mental_health':
                 detailsHtml = `
                    <p><strong>Queixa Principal:</strong> ${patient.main_complaint_psychology || 'Não informado'}</p>
                    <p><strong>Terapia Anterior:</strong> ${patient.previous_therapy || 'Não informado'}</p>
                `;
                break;
        }
        container.innerHTML = detailsHtml;
    };

    const fetchPatientData = async () => {
        try {
            const response = await fetch(`/api/patient/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 || response.status === 403) {
                alert('Você não tem permissão para ver este paciente.');
                window.location.href = '/professional-dashboard.html';
                return;
            }
            if (!response.ok) throw new Error('Falha ao carregar os detalhes do paciente.');
            
            const patient = await response.json();

            document.getElementById('patient-name-title').textContent = patient.name;
            document.getElementById('dob').textContent = new Date(patient.dob + 'T00:00:00').toLocaleDateString('pt-BR');
            document.getElementById('phone').textContent = patient.phone;
            document.getElementById('focus_area').textContent = focusAreaMapping[patient.focus_area] || 'Não informado';
            
            document.getElementById('allergies').textContent = patient.allergies || 'Não informado';
            document.getElementById('previous_surgeries').textContent = patient.previous_surgeries || 'Não informado';
            document.getElementById('current_medications').textContent = patient.current_medications || 'Não informado';
            document.getElementById('lifestyle_habits').textContent = patient.lifestyle_habits || 'Não informado';

            renderSpecificAnamnesis(patient); // Chama a nova função
            renderEvolutions(patient.evolutions);

            // Novo: Preenche o programa do paciente, se existir
            if (patient.program) {
                patientProgramTextarea.value = patient.program;
            }

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    };

    // Novo: Listener para salvar o programa
    programForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const program = patientProgramTextarea.value.trim();
        
        try {
            const response = await fetch(`/api/patient/${patientId}/program`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ program })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Falha ao salvar o programa.');
            }

            alert('Programa do paciente salvo com sucesso!');

        } catch (error) {
            console.error('Erro ao salvar o programa:', error);
            alert(error.message);
        }
    });

    evolutionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const note = evolutionNoteTextarea.value.trim();
        if (!note) {
            alert('A nota de evolução não pode estar vazia.');
            return;
        }

        try {
            const response = await fetch(`/api/patient/${patientId}/evolution`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ note })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Falha ao salvar a nota.');
            }

            evolutionNoteTextarea.value = ''; 
            await fetchPatientData(); 

        } catch (error) {
            console.error('Erro ao salvar evolução:', error);
            alert(error.message);
        }
    });

    fetchPatientData();
});
