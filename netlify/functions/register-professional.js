
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// A URL de conexão que você forneceu
const connectionString = 'postgresql://neondb_owner:npg_BtaPk09FfeIT@ep-lucky-shadow-acnfhppr-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    let client;
    try {
        const { fullName, email, password, profession, registrationNumber } = JSON.parse(event.body);

        if (!fullName || !email || !password || !profession || !registrationNumber) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Todos os campos são obrigatórios.' }) };
        }

        client = await pool.connect();

        // Verifica se o email já existe
        const emailCheck = await client.query('SELECT id FROM professionals WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return { statusCode: 409, body: JSON.stringify({ message: 'Email já cadastrado.' }) };
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insere o novo profissional
        const insertQuery = `
            INSERT INTO professionals (fullName, email, password, profession, registrationNumber, registrationStatus)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, fullName, email, profession, registrationNumber, registrationStatus;
        `;
        const values = [fullName, email, hashedPassword, profession, registrationNumber, 'Pendente'];
        
        const result = await client.query(insertQuery, values);
        const newProfessional = result.rows[0];

        return {
            statusCode: 201,
            body: JSON.stringify(newProfessional)
        };

    } catch (error) {
        console.error('Erro ao registrar profissional:', error);
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
