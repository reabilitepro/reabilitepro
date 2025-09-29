const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Função para garantir que o usuário admin exista com a senha correta
const ensureAdminUser = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = 'admin123';
    const adminFullName = 'Administrador';
    const adminProfession = 'Admin';

    if (!adminEmail) {
        console.log('Variável ADMIN_EMAIL não definida, pulando a criação/atualização do admin.');
        return;
    }

    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT id FROM professionals WHERE email = $1', [adminEmail]);
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        if (rows.length > 0) {
            await client.query(
                'UPDATE professionals SET password = $1, registrationstatus = $2 WHERE email = $3',
                [hashedPassword, 'Aprovado', adminEmail]
            );
        } else {
            await client.query(
                'INSERT INTO professionals (fullname, email, password, profession, registrationnumber, registrationstatus) VALUES ($1, $2, $3, $4, $5, $6)',
                [adminFullName, adminEmail, hashedPassword, adminProfession, 'N/A', 'Aprovado']
            );
        }
    } catch (error) {
        console.error('Erro crítico ao garantir a existência do usuário administrador:', error);
    } finally {
        client.release();
    }
};


const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS professionals (id SERIAL PRIMARY KEY, fullname VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password TEXT NOT NULL, profession VARCHAR(255), registrationnumber VARCHAR(255), registrationstatus VARCHAR(50) DEFAULT 'Pendente', patientlimit INTEGER DEFAULT 4, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS patients (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password TEXT NOT NULL, dob DATE, phone VARCHAR(50), address TEXT, notes TEXT, professional_id INTEGER REFERENCES professionals(id) ON DELETE SET NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
        `);
        console.log("Tabelas verificadas/criadas com sucesso.");
    } catch (error) {
        console.error("Erro ao criar tabelas:", error);
        process.exit(1);
    } finally {
        client.release();
    }
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const authenticateToken = (req, res, next) => {
    const tokenHeader = req.headers['authorization'];
    const token = tokenHeader && tokenHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (email === process.env.ADMIN_EMAIL) {
        try {
            const result = await pool.query('SELECT * FROM professionals WHERE email = $1', [email]);
            if (result.rows.length === 0) return res.status(401).json({ message: 'Credenciais de administrador inválidas.' });
            const adminUser = result.rows[0];
            const passwordMatch = await bcrypt.compare(password, adminUser.password);
            if (passwordMatch) {
                const token = jwt.sign({ id: adminUser.id, type: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
                return res.json({ adminToken: token, userType: 'admin' });
            } else {
                return res.status(401).json({ message: 'Credenciais de administrador inválidas.' });
            }
        } catch (error) {
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
    }
});

// --- ROTA DE ADMIN PARA DIAGNÓSTICO ---
app.get('/api/admin/data', authenticateToken, async (req, res) => {
    if (req.user.type !== 'admin') {
        return res.status(403).json({ message: "Acesso negado." });
    }

    // Retorna dados estáticos para isolar o problema.
    // Se a página carregar com tabelas vazias, o problema é no banco de dados.
    console.log("Rota de diagnóstico /api/admin/data atingida. Retornando listas vazias.");
    res.json({
        professionals: [],
        patients: []
    });
});

app.put('/api/admin/professionals/:id', authenticateToken, async (req, res) => {
    if (req.user.type !== 'admin') return res.status(403).json({ message: "Acesso negado." });
    const { id } = req.params;
    const { registrationStatus } = req.body;
    if (!['Aprovado', 'Pendente', 'Rejeitado'].includes(registrationStatus)) {
        return res.status(400).json({ message: 'Status inválido.' });
    }
    try {
        const result = await pool.query('UPDATE professionals SET registrationstatus = $1 WHERE id = $2 RETURNING id', [registrationStatus, id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Profissional não encontrado.' });
        res.json({ message: 'Status do profissional atualizado com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno ao atualizar o status.' });
    }
});

app.post('/api/professionals', async (req, res) => {
    const { fullName, email, password, profession, registrationNumber } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO professionals (fullname, email, password, profession, registrationnumber) VALUES ($1, $2, $3, $4, $5)', [fullName, email, hashedPassword, profession, registrationNumber]);
        res.status(201).json({ message: 'Cadastro realizado com sucesso! Aguarde a aprovação.' });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Email já cadastrado.' });
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'public', req.path.endsWith('.html') ? req.path : `${req.path}.html`);
    res.sendFile(filePath, err => {
        if (err) res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    });
});

const startServer = async () => {
    await createTables();
    await ensureAdminUser(); 
    app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
};

startServer();