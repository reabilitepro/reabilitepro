
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = 'postgresql://neondb_owner:npg_BtaPk09FfeIT@ep-lucky-shadow-acnfhppr-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

const createTestData = async () => {
    const client = await pool.connect();
    try {
        console.log('Iniciando a criação de dados de teste...');

        // 1. Criar Profissional de Teste
        const profEmail = 'profissional.teste@reabilite.pro';
        const profPassword = 'senha123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(profPassword, salt);

        const profQuery = `
            INSERT INTO professionals (fullName, email, password, profession, registrationNumber, registrationStatus)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (email) DO NOTHING
            RETURNING id;
        `;
        const profValues = ['Profissional Teste', profEmail, hashedPassword, 'Fisioterapeuta', '12345-F', 'Aprovado'];
        const profResult = await client.query(profQuery, profValues);
        
        let professionalId;
        if (profResult.rows.length > 0) {
            professionalId = profResult.rows[0].id;
            console.log(`Profissional de teste criado com ID: ${professionalId}`);
        } else {
            // Se o profissional já existe, busca o ID dele
            const existingProf = await client.query('SELECT id FROM professionals WHERE email = $1', [profEmail]);
            if (existingProf.rows.length > 0) {
                professionalId = existingProf.rows[0].id;
                console.log(`Profissional de teste já existe com ID: ${professionalId}`);
            } else {
                // Esta parte é uma salvaguarda, não deve ser alcançada em condições normais
                throw new Error('Falha ao criar ou encontrar o profissional de teste.');
            }
        }

        // 2. Criar Paciente de Teste
        const patientEmail = 'paciente.teste@reabilite.pro';
        const patientPassword = 'senha123';
        const patientSalt = await bcrypt.genSalt(10);
        const patientHashedPassword = await bcrypt.hash(patientPassword, patientSalt);

        const patientQuery = `
            INSERT INTO patients (fullName, cpf, birthDate, gender, phone, email, password, address, healthInfo, professionalId)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (email) DO NOTHING;
        `;
        const patientValues = [
            'Paciente Teste',
            '123.456.789-00',
            '1990-01-01',
            'Outro',
            '(11) 98765-4321',
            patientEmail,
            patientHashedPassword,
            'Rua de Teste, 123',
            'Nenhuma condição de saúde relevante',
            professionalId
        ];
        await client.query(patientQuery, patientValues);
        console.log('Paciente de teste criado/verificado.');

        console.log('\nDados de teste criados com sucesso!\n');
        console.log('--- Credenciais do Profissional ---');
        console.log(`Email: ${profEmail}`);
        console.log(`Senha: ${profPassword}`);
        console.log('\n--- Credenciais do Paciente ---');
        console.log(`Email: ${patientEmail}`);
        console.log(`Senha: ${patientPassword}`);

    } catch (error) {
        console.error('Erro ao criar dados de teste:', error);
    } finally {
        await client.release();
        await pool.end();
    }
};

createTestData();
