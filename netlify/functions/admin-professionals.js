
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

const professionalsPath = path.resolve(__dirname, '../../db/professionals.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Função auxiliar para ler os profissionais do arquivo
const getProfessionals = async () => {
    try {
        const data = await fs.readFile(professionalsPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Se o arquivo não existir, retorna um array vazio
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};

// Função auxiliar para salvar os profissionais no arquivo
const saveProfessionals = async (professionals) => {
    await fs.writeFile(professionalsPath, JSON.stringify(professionals, null, 2));
};

exports.handler = async function(event, context) {
    const token = event.headers.authorization?.split(' ')[1];

    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Authentication token is required.' }) };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'admin') {
            return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden: You do not have admin privileges.' }) };
        }

        // Lógica para obter a lista de profissionais (GET)
        if (event.httpMethod === 'GET') {
            const professionals = await getProfessionals();
            // Garante que todos os profissionais tenham os campos necessários
            const professionalsWithDefaults = professionals.map(prof => ({
                ...prof,
                registrationstatus: prof.registrationstatus || 'Pendente',
                patientlimit: prof.patientlimit || 0
            }));
            return {
                statusCode: 200,
                body: JSON.stringify(professionalsWithDefaults)
            };
        }

        // Lógica para adicionar um novo profissional (POST)
        if (event.httpMethod === 'POST') {
            const { name, email, profession } = JSON.parse(event.body);

            if (!name || !email || !profession) {
                return { statusCode: 400, body: JSON.stringify({ message: 'Nome, email e profissão são obrigatórios.' }) };
            }

            const professionals = await getProfessionals();

            // Verifica se o email já está em uso
            if (professionals.some(prof => prof.email === email)) {
                return { statusCode: 409, body: JSON.stringify({ message: 'Este email já está cadastrado.' }) };
            }

            const newProfessional = {
                id: Date.now(), // Usando timestamp como ID simples
                name,
                email,
                profession,
                password: 'pro123', // Senha padrão temporária
                registrationNumber: 'N/A',
                registrationStatus: 'Pendente',
                patientlimit: 0 // Adiciona o limite de pacientes padrão
            };

            professionals.push(newProfessional);
            await saveProfessionals(professionals);

            return {
                statusCode: 201, // 201 Created
                body: JSON.stringify(newProfessional)
            };
        }

        // Se o método não for GET nem POST
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return { statusCode: 401, body: JSON.stringify({ message: 'Invalid token.' }) };
        }
        console.error('Server error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An internal server error occurred.' })
        };
    }
};
