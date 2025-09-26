
const { Pool } = require('pg');

exports.handler = async function(event, context) {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    const createProfessionalsTable = `
        CREATE TABLE IF NOT EXISTS professionals (
            id SERIAL PRIMARY KEY,
            fullName VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            profession VARCHAR(255),
            registrationNumber VARCHAR(255),
            registrationStatus VARCHAR(50) DEFAULT 'Pendente'
        );
    `;

    const createPatientsTable = `
        CREATE TABLE IF NOT EXISTS patients (
            id SERIAL PRIMARY KEY,
            fullName VARCHAR(255) NOT NULL,
            cpf VARCHAR(14) UNIQUE NOT NULL,
            birthDate DATE,
            gender VARCHAR(50),
            phone VARCHAR(20),
            email VARCHAR(255),
            address TEXT,
            healthInfo TEXT,
            professionalId INTEGER REFERENCES professionals(id),
            uniqueLink VARCHAR(255) UNIQUE
        );
    `;

    try {
        const client = await pool.connect();
        await client.query(createProfessionalsTable);
        await client.query(createPatientsTable);
        client.release();
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tabelas 'professionals' e 'patients' criadas com sucesso!' })
        };
    } catch (error) {
        console.error('Erro ao criar tabelas:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Erro ao criar tabelas no banco de dados.', error: error.message })
        };
    }
};
