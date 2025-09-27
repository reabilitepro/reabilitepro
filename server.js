
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

// --- FUNÇÃO DE INICIALIZAÇÃO DO BANCO DE DADOS ---
const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            ALTER TABLE professionals 
            ADD COLUMN IF NOT EXISTS patientlimit INTEGER DEFAULT 4`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS invitation_links (
                id SERIAL PRIMARY KEY,
                professional_id INTEGER NOT NULL REFERENCES professionals(id),
                token TEXT NOT NULL UNIQUE,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
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

// --- ROTAS DA API ---

// ROTA DE LOGIN UNIFICADA
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    // Login do Admin
    if (email === 'admin@reabilite.pro' && password === 'admin123') {
        const token = jwt.sign({ type: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ accessToken: token, userType: 'admin' });
    }

    // Login do Profissional
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT * FROM professionals WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Email ou senha inválidos.' });
        }

        const professional = result.rows[0];
        if (!await bcrypt.compare(password, professional.password)) {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        if (professional.registrationstatus !== 'Aprovado') {
            return res.status(403).json({ message: `Sua conta está com status: ${professional.registrationstatus}.` });
        }

        const token = jwt.sign({ id: professional.id, type: 'professional' }, JWT_SECRET, { expiresIn: '8h' });
        // Retorno corrigido para userType: 'professional'
        return res.json({ accessToken: token, userType: 'professional' });

    } catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if(client) client.release();
    }
});

// ROTA DE CADASTRO PÚBLICA PARA PROFISSIONAIS
app.post('/api/professionals', async (req, res) => {
    const { fullName, email, password, profession, registrationNumber } = req.body;
    if (!fullName || !email || !password || !profession || !registrationNumber) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    
    let client;
    try {
        client = await pool.connect();
        const check = await client.query('SELECT id FROM professionals WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(409).json({ message: 'Este email já está cadastrado.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO professionals (fullname, email, password, profession, registrationnumber, registrationstatus, patientlimit) VALUES ($1, $2, $3, $4, $5, $6, $7)';
        await client.query(query, [fullName, email, hashedPassword, profession, registrationNumber, 'Pendente', 4]); // Limite padrão de 4 pacientes
        
        res.status(201).json({ message: 'Cadastro realizado com sucesso! Aguardando aprovação do administrador.' });
    } catch (error) {
        console.error('ERRO DURANTE O CADASTRO DE PROFISSIONAL:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (client) client.release();
    }
});

// ROTA PROTEGIDA PARA PROFISSIONAL GERAR LINK DE CONVITE
app.post('/api/professionals/generate-link', authenticateToken, async (req, res) => {
    if (req.user.type !== 'professional') {
        return res.status(403).json({ message: "Acesso negado." });
    }
    const professionalId = req.user.id;

    let client;
    try {
        client = await pool.connect();

        const profResult = await client.query('SELECT patientlimit FROM professionals WHERE id = $1', [professionalId]);
        const patientLimit = profResult.rows[0].patientlimit;

        const patientCountResult = await client.query('SELECT COUNT(*) FROM patients WHERE professional_id = $1', [professionalId]);
        const patientCount = parseInt(patientCountResult.rows[0].count, 10);

        if (patientCount >= patientLimit) {
            return res.status(403).json({ message: "Você atingiu o seu limite de pacientes." });
        }

        const inviteToken = crypto.randomBytes(20).toString('hex');
        await client.query('INSERT INTO invitation_links (professional_id, token) VALUES ($1, $2)', [professionalId, inviteToken]);

        const invitationLink = `https://reabilitepro.onrender.com/patient-registration.html?token=${inviteToken}`;
        res.json({ invitationLink });

    } catch (error) {
        console.error("Erro ao gerar link:", error);
        res.status(500).json({ message: "Falha ao gerar o link no servidor." });
    } finally {
        if (client) client.release();
    }
});

// ROTA PÚBLICA PARA CADASTRO DE PACIENTE COM TOKEN
app.post('/api/patients', async (req, res) => {
    const { name, email, password, dob, phone, inviteToken } = req.body;
    if (!name || !email || !password || !inviteToken) {
        return res.status(400).json({ message: 'Campos obrigatórios ou token de convite ausentes.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const linkResult = await client.query('SELECT * FROM invitation_links WHERE token = $1 AND is_used = FALSE', [inviteToken]);
        if (linkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Link de convite inválido ou já utilizado." });
        }

        const { professional_id, id: link_id } = linkResult.rows[0];

        const patientCheck = await client.query('SELECT id FROM patients WHERE email = $1', [email]);
        if (patientCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Este email de paciente já está cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query(
            'INSERT INTO patients (name, email, password, dob, phone, professional_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [name, email, hashedPassword, dob, phone, professional_id]
        );

        await client.query('UPDATE invitation_links SET is_used = TRUE WHERE id = $1', [link_id]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Paciente cadastrado com sucesso!' });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Erro no cadastro do paciente:', error);
        return res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if(client) client.release();
    }
});


// --- ROTAS PROTEGIDAS DE ADMINISTRAÇÃO ---
app.get('/api/admin/professionals', authenticateToken, async (req, res) => {
    if (req.user.type !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
    }
    try {
        const { rows } = await pool.query('SELECT id, fullname, email, profession, registrationnumber, registrationstatus, patientlimit FROM professionals ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

app.put('/api/admin/professionals/:id', authenticateToken, async (req, res) => {
    if (req.user.type !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
    }
    const { id } = req.params;
    const { registrationStatus, patientLimit } = req.body;

    if (registrationStatus === undefined && patientLimit === undefined) {
        return res.status(400).json({ message: 'Nenhuma informação para atualizar foi fornecida.' });
    }

    try {
        const updates = [];
        const values = [];
        let queryIndex = 1;

        if (registrationStatus !== undefined) {
            updates.push(`registrationstatus = $${queryIndex++}`);
            values.push(registrationStatus);
        }

        if (patientLimit !== undefined) {
            updates.push(`patientlimit = $${queryIndex++}`);
            values.push(patientLimit);
        }

        values.push(id);

        const queryText = `UPDATE professionals SET ${updates.join(', ')} WHERE id = $${queryIndex} RETURNING *`;

        const { rows } = await pool.query(queryText, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Profissional não encontrado' });
        }
        res.json({ message: 'Profissional atualizado com sucesso', professional: rows[0] });

    } catch (error) {
        console.error('Erro ao atualizar profissional:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// --- ROTA DA IA ---
app.post('/api/ai/command', authenticateToken, async (req, res) => {
    if (req.user.type !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
    }

    const { command } = req.body;
    console.log(`[Comando IA Recebido]: ${command}`); // Log para vermos no servidor

    // SIMULAÇÃO: No futuro, aqui chamaremos a lógica real da IA.
    // Por enquanto, apenas devolvemos uma resposta de confirmação.
    const aiResponse = `Recebi seu comando: \"${command}\". Estou processando a resposta e logo ela aparecerá aqui.`;

    res.json({ reply: aiResponse });
});


// --- ROTA CATCH-ALL (DEVE SER A ÚLTIMA) ---
// Serve a página de login para qualquer rota não correspondida pela API ou arquivos estáticos.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const startServer = async () => {
    await createTables();
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
};

startServer();
