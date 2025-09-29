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

// Garante que o usuário admin exista e tenha a senha correta
const ensureAdminUser = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = 'admin123'; // A senha que usamos para o admin
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT id, password FROM professionals WHERE email = $1', [adminEmail]);
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        if (rows.length > 0) {
            // Se o usuário existe, mas a senha não corresponde, atualiza a senha.
            if (!await bcrypt.compare(adminPassword, rows[0].password)) {
                await client.query('UPDATE professionals SET password = $1 WHERE email = $2', [hashedPassword, adminEmail]);
                console.log(`Senha do administrador (${adminEmail}) foi atualizada para 'admin123'.`);
            }
        } else {
            // Se o usuário não existe, cria-o.
            await client.query(
                'INSERT INTO professionals (fullname, email, password, profession, registrationnumber, registrationstatus) VALUES ($1, $2, $3, $4, $5, $6)',
                ['Administrador', adminEmail, hashedPassword, 'Admin', 'N/A', 'Aprovado']
            );
            console.log(`Usuário administrador (${adminEmail}) foi criado com a senha 'admin123'.`);
        }
    } catch (error) {
        console.error('Erro ao garantir a existência do usuário administrador:', error);
    } finally {
        client.release();
    }
};

// Cria as tabelas se elas não existirem
const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS professionals (id SERIAL PRIMARY KEY, fullname VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password TEXT NOT NULL, profession VARCHAR(255), registrationnumber VARCHAR(255), registrationstatus VARCHAR(50) DEFAULT 'Pendente', patientlimit INTEGER DEFAULT 4, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS patients (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password TEXT NOT NULL, dob DATE, phone VARCHAR(50), address TEXT, notes TEXT, professional_id INTEGER REFERENCES professionals(id) ON DELETE SET NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS evolution_notes (id SERIAL PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE, professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE, note TEXT NOT NULL, shared_with_patient BOOLEAN DEFAULT FALSE, date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS invitation_links (id SERIAL PRIMARY KEY, professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE, token TEXT NOT NULL UNIQUE, is_used BOOLEAN DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
        `);
    } catch (error) {
        console.error("Erro ao criar tabelas:", error);
    } finally {
        client.release();
    }
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
};

// Rota de Login
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

// Rota de Cadastro de Profissionais
app.post('/api/professionals', async (req, res) => {
    const { fullName, email, password, profession, registrationNumber } = req.body;
    const client = await pool.connect();
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query('INSERT INTO professionals (fullname, email, password, profession, registrationnumber) VALUES ($1, $2, $3, $4, $5)', [fullName, email, hashedPassword, profession, registrationNumber]);
        res.status(201).json({ message: 'Cadastro realizado com sucesso! Aguarde a aprovação.' });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Email já cadastrado.' });
        console.error('Erro no cadastro de profissional:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
});

// --- ROTA DE ADMIN RESTAURADA E FUNCIONAL ---
app.get('/api/admin/data', authenticateToken, async (req, res) => {
    if (req.user.type !== 'admin') return res.status(403).json({ message: "Acesso negado." });

    const client = await pool.connect();
    try {
        const professionalsResult = await client.query('SELECT id, fullname, email, registrationstatus, patientlimit FROM professionals WHERE email != $1 ORDER BY created_at DESC', [process.env.ADMIN_EMAIL]);
        
        const patientsResult = await client.query(`
            SELECT p.id, p.name, p.phone, prof.fullname as professional_name
            FROM patients p
            LEFT JOIN professionals prof ON p.professional_id = prof.id
            ORDER BY p.created_at DESC
        `);

        res.json({
            professionals: professionalsResult.rows,
            patients: patientsResult.rows
        });

    } catch (error) {
        console.error("Erro ao carregar dados do painel de administração:", error);
        res.status(500).json({ message: 'Não foi possível carregar os dados do painel.' });
    } finally {
        client.release();
    }
});

// --- ROTA PARA ATUALIZAR STATUS DO PROFISSIONAL RESTAURADA ---
app.put('/api/admin/professionals/:id', authenticateToken, async (req, res) => {
    if (req.user.type !== 'admin') return res.status(403).json({ message: "Acesso negado." });

    const { id } = req.params;
    const { registrationStatus } = req.body;

    if (!['Aprovado', 'Pendente', 'Rejeitado'].includes(registrationStatus)) {
        return res.status(400).json({ message: 'Status inválido.' });
    }
    
    const client = await pool.connect();
    try {
        const result = await client.query('UPDATE professionals SET registrationstatus = $1 WHERE id = $2 RETURNING id', [registrationStatus, id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Profissional não encontrado.' });
        res.json({ message: 'Status do profissional atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar status do profissional:', error);
        res.status(500).json({ message: 'Erro interno ao atualizar o status.' });
    } finally {
        client.release();
    }
});

// Outras rotas da aplicação (deixar como estão)

app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'public', req.path.endsWith('.html') ? req.path : `${req.path}.html`);
    res.sendFile(filePath, err => {
        if (err) {
            res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }
    });
});

const startServer = async () => {
    await createTables();
    await ensureAdminUser();
    app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
};

startServer();
