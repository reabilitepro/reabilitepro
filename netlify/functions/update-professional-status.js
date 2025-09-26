const fs = require('fs').promises;
const path = require('path');

const professionalsPath = path.resolve(__dirname, '../../db/professionals.json');

const getProfessionals = async () => {
    try {
        const data = await fs.readFile(professionalsPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
};

const saveProfessionals = async (professionals) => {
    await fs.writeFile(professionalsPath, JSON.stringify(professionals, null, 2));
};

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    // Adicionar verificação de token de admin aqui em um app real

    try {
        const { id, status } = JSON.parse(event.body);
        const professionals = await getProfessionals();

        const professionalIndex = professionals.findIndex(p => p.id === id);
        if (professionalIndex === -1) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Profissional não encontrado.' }) };
        }

        professionals[professionalIndex].registrationStatus = status;
        await saveProfessionals(professionals);

        return { statusCode: 200, body: JSON.stringify(professionals[professionalIndex]) };

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro interno do servidor.' }) };
    }
};