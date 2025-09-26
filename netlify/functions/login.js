
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Conexão direta para garantir funcionamento
const connectionString = 'postgresql://neondb_owner:npg_BtaPk09FfeIT@ep-lucky-shadow-acnfhppr-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

// Chave secreta direta para garantir funcionamento
const JWT_SECRET = 'sua-chave-secreta-temporaria-e-segura';

exports.handler = async function(event, context) {
    context.callbackWaitsForEmptyEventLoop = false;

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    let client;
    try {
        const { email, password } = JSON.parse(event.body);

        // Login do Admin (lógica simplificada para segurança)
        if (email === 'admin@reabilite.pro' && password === 'admin123') {
            const token = jwt.sign({ type: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
            return { statusCode: 200, body: JSON.stringify({ accessToken: token, userType: 'admin' }) };
        }

        client = await pool.connect();

        // Login do Profissional
        const professionalResult = await client.query('SELECT * FROM professionals WHERE email = $1', [email]);
        if (professionalResult.rows.length > 0) {
            const professional = professionalResult.rows[0];
            const validPassword = await bcrypt.compare(password, professional.password);

            if (!validPassword) {
                return { statusCode: 401, body: JSON.stringify({ message: 'Email ou senha inválidos.' }) };
            }
            
            if (professional.registrationstatus !== 'Aprovado') {
                return { statusCode: 403, body: JSON.stringify({ message: `Sua conta está ${professional.registrationstatus.toLowerCase()}.` }) };
            }

            const token = jwt.sign({ id: professional.id, type: 'professional' }, JWT_SECRET, { expiresIn: '8h' });
            return { statusCode: 200, body: JSON.stringify({ accessToken: token, userType: 'professional' }) };
        }
        
        // Login do Paciente (a ser implementado com a tabela de pacientes)
        // Por enquanto, apenas o login de admin e profissional funciona.

        return { statusCode: 404, body: JSON.stringify({ message: 'Usuário não encontrado.' }) };

    } catch (error) {
        console.error('Erro no login:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ message: 'Erro interno do servidor.', error: error.message }) 
        };
    } finally {
        if(client) {
            client.release();
        }
    }
};
