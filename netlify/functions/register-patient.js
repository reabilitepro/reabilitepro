
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
        const { token, fullName, cpf, birthDate, gender, phone, email, password, address, healthInfo } = JSON.parse(event.body);

        if (!token) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Token de convite é obrigatório.' }) };
        }

        client = await pool.connect();

        // Verifica o token de convite
        const tokenResult = await client.query('SELECT * FROM invitation_tokens WHERE token = $1', [token]);
        const invitation = tokenResult.rows[0];

        if (!invitation || invitation.used || invitation.expires < Date.now()) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Token de convite inválido, expirado ou já utilizado.' }) };
        }

        // Marca o token como usado
        await client.query('UPDATE invitation_tokens SET used = true WHERE id = $1', [invitation.id]);

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insere o novo paciente
        const insertQuery = `
            INSERT INTO patients (fullName, cpf, birthDate, gender, phone, email, password, address, healthInfo, professionalId)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, fullName, email;
        `;
        const values = [fullName, cpf, birthDate, gender, phone, email, hashedPassword, address, healthInfo, invitation.professionalid];
        
        const patientResult = await client.query(insertQuery, values);
        const newPatient = patientResult.rows[0];

        return {
            statusCode: 201,
            body: JSON.stringify({ message: 'Paciente cadastrado com sucesso!', patient: newPatient })
        };

    } catch (error) {
        console.error('Erro ao registrar paciente:', error);
        // Se o erro for de violação de chave única (email ou cpf já existem)
        if (error.code === '23505') {
            return { statusCode: 409, body: JSON.stringify({ message: 'Email ou CPF já cadastrado.' }) };
        }
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
