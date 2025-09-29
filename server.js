const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

const connectionString = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!connectionString || !JWT_SECRET) {
    console.error("Erro Crítico: DATABASE_URL e JWT_SECRET devem ser definidas.");
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

// Função normal para criar tabelas se não existirem
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
    } finally {
        client.release();
    }
};

// Função normal para garantir a existência do usuário admin
const ensureAdminUser = async () => {
    const client = await pool.connect();
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const result = await client.query('SELECT id FROM professionals WHERE email = $1', [adminEmail]);
        if (result.rows.length === 0) {
            const adminPassword = await bcrypt.hash('admin123', 10);
            await client.query('INSERT INTO professionals (fullname, email, password, profession, registrationnumber, registrationstatus) VALUES ($1, $2, $3, $4, $5, $6)', ['Administrador', adminEmail, adminPassword, 'Admin', 'N/A', 'Aprovado']);
            console.log("Usuário administrador criado com sucesso.");
        }
    } catch (error) {
        console.error("Erro ao garantir usuário admin:", error);
    } finally {
        client.release();
    }
};


app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Sessão inválida ou expirada.' });
        req.user = user;
        next();
    });
};

app.post('/api/login', async (req, res) => {
    const { email, password, userType } = req.body;
    const isAdminLogin = userType === 'admin' && email === process.env.ADMIN_EMAIL;
    const table = isAdminLogin || userType === 'professional' ? 'professionals' : 'patients';

    const client = await pool.connect();
    try {
        const result = await client.query(`SELECT * FROM ${table} WHERE email = $1`, [email]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Credenciais inválidas.' });

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ message: 'Credenciais inválidas.' });

        if (userType === 'professional' && user.registrationstatus !== 'Aprovado') {
            return res.status(403).json({ message: `Sua conta está: ${user.registrationstatus}` });
        }

        const finalUserType = isAdminLogin ? 'admin' : userType;
        const token = jwt.sign({ id: user.id, type: finalUserType }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ accessToken: token, userType: finalUserType });

    } catch (error) {
        console.error(`Erro no login de ${userType}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/data', authenticateToken, async (req, res) => {
    if (req.user.type !== 'admin') return res.status(403).json({ message: "Acesso negado." });

    const client = await pool.connect();
    try {
        const professionalsResult = await client.query('SELECT id, fullname, email, registrationstatus, patientlimit FROM professionals WHERE email != $1 ORDER BY created_at DESC', [process.env.ADMIN_EMAIL]);
        const patientsResult = await client.query(`SELECT p.id, p.name, p.phone, prof.fullname as professional_name FROM patients p LEFT JOIN professionals prof ON p.professional_id = prof.id ORDER BY p.created_at DESC`);
        res.json({ professionals: professionalsResult.rows, patients: patientsResult.rows });
    } catch (error) {
        console.error("Erro ao carregar dados do admin:", error);
        res.status(500).json({ message: 'Falha crítica ao carregar dados do painel.' });
    } finally {
        client.release();
    }
});

app.put('/api/admin/professionals/:id', authenticateToken, async (req, res) => {
    if (req.user.type !== 'admin') return res.status(403).json({ message: "Acesso negado." });
    const { id } = req.params;
    const { registrationStatus } = req.body;
    if (!['Aprovado', 'Pendente', 'Rejeitado'].includes(registrationStatus)) {
        return res.status(400).json({ message: 'Status inválido.' });
    }
    const client = await pool.connect();
    try {
        await client.query('UPDATE professionals SET registrationstatus = $1 WHERE id = $2', [registrationStatus, id]);
        res.json({ message: 'Status atualizado com sucesso!' });
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        res.status(500).json({ message: 'Erro interno ao atualizar status.' });
    } finally {
        client.release();
    }
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.path.endsWith('.html') ? req.path : `${req.path}.html`), (err) => {
        if (err) res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    });
});

const startServer = async () => {
    await createTables();      // Comportamento normal: cria se não existir
    await ensureAdminUser();      // Comportamento normal: garante que o admin existe
    app.listen(PORT, () => console.log(`Servidor a correr normalmente na porta ${PORT}.`));
};

startServer();
