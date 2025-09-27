
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

// --- ROTA DE LOGIN DO PACIENTE ---
app.post('/api/patient/login', async (req, res) => {
    const { email, password } = req.body;
    let client;
    try {
        client = await pool.connect();
        const patientResult = await client.query('SELECT * FROM patients WHERE email = $1', [email]);
        
        if (patientResult.rows.length === 0) {
            return res.status(404).json({ message: 'Paciente não encontrado.' });
        }

        const patient = patientResult.rows[0];
        if (!await bcrypt.compare(password, patient.password)) {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        const token = jwt.sign({ id: patient.id, type: 'patient' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ accessToken: token, userType: 'patient' });

    } catch (error) {
        console.error('Erro no login do paciente:', error);
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
        const query = 'INSERT INTO professionals (fullName, email, password, profession, registrationNumber, registrationStatus) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
        await client.query(query, [fullName, email, hashedPassword, profession, registrationNumber, 'Pendente']);
        res.status(201).json({ message: 'Cadastro realizado com sucesso! Aguardando aprovação do administrador.' });
    } catch (error) {
        console.error('ERRO DURANTE O CADASTRO DE PROFISSIONAL:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao tentar cadastrar.' });
    } finally {
        if (client) client.release();
    }
});

// --- ROTA DE CADASTRO DE PACIENTE ---
app.post('/api/patients', async (req, res) => {
    const { name, email, password, dob, phone } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    let client;
    try {
        client = await pool.connect();
        const check = await client.query('SELECT id FROM patients WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(409).json({ message: 'Este email de paciente já está cadastrado.' });
        }
        const query = 'INSERT INTO patients (name, email, password, dob, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        await client.query(query, [name, email, hashedPassword, dob, phone]);
        res.status(201).json({ message: 'Paciente cadastrado com sucesso!' });
    } catch (error) {
        console.error('Erro no cadastro do paciente:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao cadastrar paciente.' });
    } finally {
        if(client) client.release();
    }
});

// --- MIDDLEWARE DE AUTENTICAÇÃO DE ADMIN ---
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err || user.type !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado.' });
        }
        req.user = user;
        next();
    });
};

// --- ROTAS DE ADMINISTRAÇÃO ---
app.get('/api/admin/professionals', authenticateAdmin, async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        // CORREÇÃO: Removida a coluna "patientLimit". Adicionadas as colunas que o frontend espera.
        const query = 'SELECT id, "fullName", email, profession, "registrationNumber" AS "professionalLicense", "registrationStatus" FROM professionals ORDER BY "registrationStatus" ASC, id DESC';
        const result = await client.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (client) client.release();
    }
});

app.put('/api/admin/professionals/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    // CORREÇÃO: Apenas o `registrationStatus` é esperado do body.
    const { registrationStatus } = req.body;

    if (!registrationStatus) {
        return res.status(400).json({ message: 'O novo status de registro é obrigatório.' });
    }

    let client;
    try {
        client = await pool.connect();
        const values = [registrationStatus, id];
        const query = `UPDATE professionals SET "registrationStatus" = $1 WHERE id = $2 RETURNING *`;
        
        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Profissional não encontrado.' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao atualizar profissional:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (client) client.release();
    }
});


// --- ROTA CATCH-ALL (serve o frontend) ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
