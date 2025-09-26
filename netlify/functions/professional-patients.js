
exports.handler = async function(event, context) {
    // In a real app, you would fetch the list of patients for the logged-in professional.
    // For now, we return a mock list.
    return {
        statusCode: 200,
        body: JSON.stringify([
            {
                id: 1,
                name: 'Paciente de Teste 1',
                phone: '123-456-7890'
            },
            {
                id: 2,
                name: 'Paciente de Teste 2',
                phone: '098-765-4321'
            }
        ])
    };
};
