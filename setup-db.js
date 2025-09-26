
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_BtaPk09FfeIT@ep-lucky-shadow-acnfhppr-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

const setupDatabase = async () => {
    console.log("Iniciando a configuração do banco de dados...");
    const client = await pool.connect();
    console.log("Conectado ao banco de dados.");

    try {
        // Tabela de profissionais
        await client.query(`
            CREATE TABLE IF NOT EXISTS professionals (
                id SERIAL PRIMARY KEY,
                fullName VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                profession VARCHAR(255),
                registrationNumber VARCHAR(255),
                registrationStatus VARCHAR(50) DEFAULT 'Pendente'
            );
        `);
        console.log("Tabela 'professionals' verificada/criada com sucesso.");

        // Tabela de pacientes
        await client.query(`
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                fullName VARCHAR(255) NOT NULL,
                cpf VARCHAR(14) UNIQUE NOT NULL,
                birthDate DATE,
                gender VARCHAR(50),
                phone VARCHAR(20),
                email VARCHAR(255) NOT NULL, -- Removida a constraint UNIQUE daqui para ser adicionada abaixo
                address TEXT,
                healthInfo TEXT,
                professionalId INTEGER REFERENCES professionals(id),
                uniqueLink VARCHAR(255) UNIQUE
            );
        `);
        console.log("Tabela 'patients' verificada/criada com sucesso.");

        // Adiciona a coluna de senha à tabela de pacientes, se não existir
        await client.query(`
            ALTER TABLE patients ADD COLUMN IF NOT EXISTS password VARCHAR(255);
        `);
        console.log("Coluna 'password' verificada/adicionada à tabela 'patients'.");

        // Adiciona a restrição UNIQUE à coluna de email, se não existir
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'patients_email_key' AND conrelid = 'patients'::regclass
                ) THEN
                    ALTER TABLE patients ADD CONSTRAINT patients_email_key UNIQUE (email);
                END IF;
            END;
            $$;
        `);
        console.log("Restrição UNIQUE para a coluna 'email' da tabela 'patients' verificada/adicionada.");

        // Tabela de tokens de convite
        await client.query(`
            CREATE TABLE IF NOT EXISTS invitation_tokens (
                id SERIAL PRIMARY KEY,
                token VARCHAR(255) NOT NULL,
                professionalId INTEGER REFERENCES professionals(id),
                patientEmail VARCHAR(255) NOT NULL,
                expires BIGINT NOT NULL,
                used BOOLEAN DEFAULT false
            );
        `);
        console.log("Tabela 'invitation_tokens' verificada/criada com sucesso.");

        console.log("Configuração do banco de dados concluída com sucesso!");

    } catch (error) {
        console.error('Erro durante a configuração do banco de dados:', error);
    } finally {
        await client.release();
        await pool.end();
        console.log("Conexão com o banco de dados encerrada.");
    }
};

setupDatabase();
