
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO SEGURA DO BANCO DE DADOS E JWT ---
const connectionString = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!connectionString || !JWT_SECRET) {
    console.error("Erro Crítico: As variáveis de ambiente DATABASE_URL e JWT_SECRET não estão definidas.");
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

// Função para criar tabelas se não existirem
const createTables = async () => {
    const client = await pool.connect();
    try {
        // Adiciona a coluna patientlimit em professionals se não existir
        await client.query(`
            ALTER TABLE professionals 
            ADD COLUMN IF NOT EXISTS patientlimit INTEGER DEFAULT 4`);

        // Cria a tabela invitation_links
        await client.query(`
            CREATE TABLE IF NOT EXISTS invitation_links (
                id SERIAL PRIMARY KEY,
                professional_id INTEGER NOT NULL REFERENCES professionals(id),
                token TEXT NOT NULL UNIQUE,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Adiciona a coluna professional_id em patients se não existir
        await client.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS professional_id INTEGER REFERENCES professionals(id)`);

        console.log("Estrutura do banco de dados verificada/atualizada com sucesso.");
    } catch (error) {
        console.error("Erro ao criar/verificar as tabelas:", error);
    } finally {
        client.release();
    }
};

app.use(express.json());
app.use(express.static('public'));

// --- ROTA DE LOGIN UNIFICADA ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (email === 'admin@reabilite.pro' && password === 'admin123') {
        const token = jwt.sign({ type: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ accessToken: token, userType: 'admin' });
    }

    let client;
    try {
        client = await pool.connect();
        
        const professionalResult = await client.query('SELECT * FROM professionals WHERE email = $1', [email]);
        if (professionalResult.rows.length > 0) {
            const professional = professionalResult.rows[0];
            if (!await bcrypt.compare(password, professional.password)) {
                return res.status(401).json({ message: 'Email ou senha inválidos.' });
            }
            if (professional.registrationstatus !== 'Aprovado') {
                return res.status(403).json({ message: `Sua conta está ${professional.registrationstatus.toLowerCase()}.` });
            }
            const token = jwt.sign({ id: professional.id, type: 'professional' }, JWT_SECRET, { expiresIn: '8h' });
            return res.json({ accessToken: token, userType: 'professional' });
        }

        return res.status(404).json({ message: 'Usuário não encontrado.' });

    } catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if(client) client.release();
    }
});

// --- ROTA DE CADASTRO DE PROFISSIONAL ---
app.post('/api/professionals', async (req, res) => {
    const { fullName, email, password, profession, registrationNumber } = req.body;
    if (!fullName || !email || !password || !profession || !registrationNumber) {
        return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });
    }
    
    let client;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        client = await pool.connect();
        const check = await client.query('SELECT id FROM professionals WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            client.release();
            return res.status(409).json({ message: 'Este email já está cadastrado.' });
        }
        // Adicionado patientlimit na inserção
        const query = 'INSERT INTO professionals (fullname, email, password, profession, registrationnumber, registrationstatus, patientlimit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id';
        await client.query(query, [fullName, email, hashedPassword, profession, registrationNumber, 'Pendente', 4]);
        res.status(201).json({ message: 'Cadastro realizado com sucesso! Aguardando aprovação do administrador.' });
    } catch (error) {
        console.error('ERRO DURANTE O CADASTRO DE PROFISSIONAL:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao tentar cadastrar.' });
    } finally {
        if (client) client.release();
    }
});

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- ROTA PARA GERAR LINK DE CONVITE ---
app.post('/api/professionals/generate-link', authenticateToken, async (req, res) => {
    const professionalId = req.user.id;
    if (req.user.type !== 'professional') {
        return res.status(403).json({ message: "Acesso negado. Apenas profissionais podem gerar links." });
    }

    let client;
    try {
        client = await pool.connect();

        // Verifica o limite de pacientes
        const professionalResult = await client.query('SELECT patientlimit FROM professionals WHERE id = $1', [professionalId]);
        const patientLimit = professionalResult.rows[0].patientlimit;

        // Conta quantos pacientes já foram cadastrados por este profissional
        const patientCountResult = await client.query('SELECT COUNT(*) FROM patients WHERE professional_id = $1', [professionalId]);
        const patientCount = parseInt(patientCountResult.rows[0].count, 10);

        if (patientCount >= patientLimit) {
            return res.status(403).json({ message: "Você atingiu o seu limite de pacientes. Contate o administrador para liberar mais cadastros." });
        }

        // Gera um token único para o link
        const inviteToken = crypto.randomBytes(20).toString('hex');
        await client.query(
            'INSERT INTO invitation_links (professional_id, token) VALUES ($1, $2)',
            [professionalId, inviteToken]
        );

        const invitationLink = `${req.protocol}://${req.get('host')}/patient-registration.html?token=${inviteToken}`;
        res.json({ invitationLink });

    } catch (error) {
        console.error("Erro ao gerar link de convite:", error);
        res.status(500).json({ message: "Falha ao gerar o link no servidor." });
    } finally {
        if (client) client.release();
    }
});


// --- ROTA DE CADASTRO DE PACIENTE (MODIFICADA) ---
app.post('/api/patients', async (req, res) => {
    const { name, email, password, dob, phone, inviteToken } = req.body;

    if (!name || !email || !password || !inviteToken) {
        return res.status(400).json({ message: 'Campos obrigatórios ausentes ou link de convite inválido.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Inicia a transação

        // Valida o token de convite
        const linkResult = await client.query('SELECT * FROM invitation_links WHERE token = $1 AND is_used = FALSE', [inviteToken]);
        if (linkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Link de convite inválido ou já utilizado." });
        }

        const link = linkResult.rows[0];
        const professionalId = link.professional_id;

        // Verifica se o email do paciente já existe
        const patientCheck = await client.query('SELECT id FROM patients WHERE email = $1', [email]);
        if (patientCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Este email de paciente já está cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insere o paciente com a referência ao profissional
        const query = 'INSERT INTO patients (name, email, password, dob, phone, professional_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
        await client.query(query, [name, email, hashedPassword, dob, phone, professionalId]);

        // Marca o link como usado
        await client.query('UPDATE invitation_links SET is_used = TRUE WHERE id = $1', [link.id]);

        await client.query('COMMIT'); // Confirma a transação
        res.status(201).json({ message: 'Paciente cadastrado com sucesso!' });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Erro no cadastro do paciente:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao cadastrar paciente.' });
    } finally {
        if(client) client.release();
    }
});

// --- ROTAS DE ADMINISTRAÇÃO (sem alterações) ...
// (O resto do código de admin permanece o mesmo)

// --- ROTA CATCH-ALL (serve o frontend) ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor e as tabelas
const startServer = async () => {
    await createTables();
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
};

startServer();
