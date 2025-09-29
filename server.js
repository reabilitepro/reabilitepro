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

// Função para resetar a senha do admin
const resetAdminPassword = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const newAdminPassword = 'admin123'; // A senha que queremos definir

    if (!adminEmail) {
        console.log('Variável ADMIN_EMAIL não definida, pulando o reset de senha do admin.');
        return;
    }

    try {
        const client = await pool.connect();
        // Verifica se o usuário admin existe
        const userCheck = await client.query('SELECT * FROM professionals WHERE email = $1', [adminEmail]);
        if (userCheck.rows.length > 0) {
            // Criptografa a nova senha
            const hashedNewPassword = await bcrypt.hash(newAdminPassword, 10);
            // Atualiza a senha no banco de dados
            await client.query('UPDATE professionals SET password = $1 WHERE email = $2', [hashedNewPassword, adminEmail]);
            console.log(`Senha do administrador (${adminEmail}) foi resetada com sucesso.`);
        } else {
            console.log(`Usuário administrador (${adminEmail}) não encontrado no banco de dados. Nenhum reset de senha foi feito.`);
        }
        client.release();
    } catch (error) {
        console.error('Erro ao tentar resetar a senha do administrador:', error);
    }
};


const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS professionals (
                id SERIAL PRIMARY KEY,
                fullname VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                profession VARCHAR(255),
                registrationnumber VARCHAR(255),
                registrationstatus VARCHAR(50) DEFAULT 'Pendente',
                patientlimit INTEGER DEFAULT 4,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                dob DATE,
                phone VARCHAR(50),
                address TEXT,
                notes TEXT,
                professional_id INTEGER REFERENCES professionals(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS evolution_notes (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
                note TEXT NOT NULL,
                shared_with_patient BOOLEAN DEFAULT FALSE,
                date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS invitation_links (
                id SERIAL PRIMARY KEY,
                professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
                token TEXT NOT NULL UNIQUE,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
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
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/api/login', async (req, res) => {
    const { email, password, userType } = req.body;

    // Admin login check
    if (email === process.env.ADMIN_EMAIL) {
        try {
            const result = await pool.query('SELECT * FROM professionals WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Credenciais de administrador inválidas.' });
            }
            
            const adminUser = result.rows[0];
            const passwordMatch = await bcrypt.compare(password, adminUser.password);

            if (passwordMatch) {
                const token = jwt.sign({ id: adminUser.id, type: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
                return res.json({ accessToken: token, userType: 'admin' });
            } else {
                return res.status(401).json({ message: 'Credenciais de administrador inválidas.' });
            }
        } catch (error) {
            console.error('Erro no login de admin:', error);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
    }

    // Professional & Patient login logic
    let table;
    if (userType === 'professional') {
        table = 'professionals';
    } else if (userType === 'patient') {
        table = 'patients';
    } else {
        return res.status(400).json({ message: "Tipo de usuário inválido para este email." });
    }

    try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE email = $1`, [email]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Credenciais inválidas.' });
        
        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ message: 'Credenciais inválidas.' });

        if (userType === 'professional' && user.registrationstatus !== 'Aprovado') {
            return res.status(403).json({ message: `Sua conta está: ${user.registrationstatus}` });
        }

        const idField = 'id';
        const token = jwt.sign({ id: user[idField], type: userType }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ accessToken: token, userType });

    } catch (error) {
        console.error(`Erro no login de ${userType}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


app.post('/api/professionals', async (req, res) => {
    const { fullName, email, password, profession, registrationNumber } = req.body;
    if (!fullName || !email || !password || !profession || !registrationNumber) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO professionals (fullname, email, password, profession, registrationnumber) VALUES ($1, $2, $3, $4, $5)',
            [fullName, email, hashedPassword, profession, registrationNumber]
        );
        res.status(201).json({ message: 'Cadastro realizado com sucesso! Aguarde a aprovação.' });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Email já cadastrado.' });
        console.error('Erro no cadastro de profissional:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.post('/api/professionals/generate-link', authenticateToken, async (req, res) => {
    if (req.user.type !== 'professional') return res.status(403).json({ message: "Acesso negado." });
    
    const professionalId = req.user.id;
    try {
        const { rows: [prof] } = await pool.query('SELECT patientlimit FROM professionals WHERE id = $1', [professionalId]);
        const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) FROM patients WHERE professional_id = $1', [professionalId]);

        if (parseInt(count, 10) >= prof.patientlimit) {
            return res.status(403).json({ message: "Você atingiu o seu limite de pacientes." });
        }

        const inviteToken = crypto.randomBytes(20).toString('hex');
        await pool.query('INSERT INTO invitation_links (professional_id, token) VALUES ($1, $2)', [professionalId, inviteToken]);
        
        const invitationLink = `${req.protocol}://${req.get('host')}/patient-registration.html?token=${inviteToken}`;
        res.json({ invitationLink });
    } catch (error) {
        console.error("Erro ao gerar link:", error);
        res.status(500).json({ message: "Falha ao gerar o link no servidor." });
    }
});

app.get('/api/professional/dashboard', authenticateToken, async (req, res) => {
    if (req.user.type !== 'professional') return res.status(403).json({ message: "Acesso negado" });

    try {
        const professionalResult = await pool.query('SELECT fullname as name, email FROM professionals WHERE id = $1', [req.user.id]);
        const patientsResult = await pool.query('SELECT id, name, phone FROM patients WHERE professional_id = $1 ORDER BY name', [req.user.id]);

        if (professionalResult.rows.length === 0) {
            return res.status(404).json({ message: "Profissional não encontrado." });
        }

        res.json({
            professional: professionalResult.rows[0],
            patients: patientsResult.rows
        });
    } catch (error) {
        console.error("Erro ao carregar dados do painel do profissional:", error);
        res.status(500).json({ message: 'Não foi possível carregar os dados do painel.' });
    }
});

app.get('/api/patient/dashboard', authenticateToken, async (req, res) => {
    if (req.user.type !== 'patient') return res.status(403).json({ message: "Acesso negado" });

    try {
        const patientResult = await pool.query('SELECT name, email, dob, phone, address, notes FROM patients WHERE id = $1', [req.user.id]);
        const evolutionResult = await pool.query('SELECT note, date FROM evolution_notes WHERE patient_id = $1 AND shared_with_patient = TRUE ORDER BY date DESC', [req.user.id]);

        if (patientResult.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }

        res.json({ ...patientResult.rows[0], evolutions: evolutionResult.rows });
    } catch (error) {
        console.error("Erro ao carregar dados do painel do paciente:", error);
        res.status(500).json({ message: 'Não foi possível carregar os dados do painel.' });
    }
});

// --- ROTAS DE ADMIN ---
app.get('/api/admin/data', authenticateToken, (req, res) => { /* ... */ });
app.put('/api/admin/professionals/:id', authenticateToken, (req, res) => { /* ... */ });

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
    await resetAdminPassword(); // <-- Adicionado o reset da senha do admin
    app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
};

startServer();