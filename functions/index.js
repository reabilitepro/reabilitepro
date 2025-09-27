
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Defina as configurações do Firestore para ignorar campos indefinidos
db.settings({ ignoreUndefinedProperties: true });

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const JWT_SECRET = "your-super-secret-key-that-is-long-and-random";

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).send('Acesso não autorizado.');
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).send('Token inválido ou expirado.');
    }
};

// --- Admin Routes ---
app.post('/getAdminData', async (req, res) => {
    const { email, password } = req.body;
    const ADMIN_EMAIL = "admin@reabilite.pro";
    const ADMIN_PASSWORD = "24852230";

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: "Credenciais de administrador inválidas." });
    }

    try {
        const professionalsSnapshot = await db.collection('professionals').get();
        const professionals = professionalsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'N/A',
                email: data.email || 'N/A',
                registrationstatus: data.registrationstatus || 'Pendente', 
                patientlimit: data.patientlimit || 0,
                linkCount: 0
            };
        });

        const patientsSnapshot = await db.collection('patients').get();
        const patients = await Promise.all(patientsSnapshot.docs.map(async doc => {
            let professionalName = 'N/A';
            if (doc.data().professionalId) {
                const profDoc = await db.collection('professionals').doc(doc.data().professionalId).get();
                professionalName = profDoc.exists ? profDoc.data().name : 'Desconhecido';
            }
            return {
                id: doc.id,
                name: doc.data().name,
                phone: doc.data().phone,
                professionalName: professionalName
            };
        }));

        res.status(200).json({ professionals, patients });
    } catch (error) {
        console.error("Error fetching admin data:", error);
        res.status(500).json({ error: "Erro ao buscar dados do servidor." });
    }
});


app.post('/generateInvitationLinks', async (req, res) => {
    const { professionalId, quantity } = req.body;

    if (!professionalId || !quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: "ID do profissional e quantidade são obrigatórios." });
    }

    try {
        const professionalDoc = await db.collection('professionals').doc(professionalId).get();
        if (!professionalDoc.exists) {
            return res.status(404).json({ error: "Profissional não encontrado." });
        }

        const batch = db.batch();
        for (let i = 0; i < quantity; i++) {
            const linkRef = db.collection('invitation_links').doc();
            batch.set(linkRef, {
                professionalId: professionalId,
                used: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        await batch.commit();
        res.status(200).json({ message: `${quantity} links gerados com sucesso!` });
    } catch (error) {
        console.error("Error generating links:", error);
        res.status(500).json({ error: "Erro ao gerar links de convite." });
    }
});


// --- Professional Routes ---
app.post('/api/professionals', async (req, res) => {
    try {
        const { name, email, password, dob, crefito } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRef = await db.collection('professionals').add({
            name,
            email,
            password: hashedPassword,
            dob,
            crefito,
            registrationstatus: 'Pendente',
            patientlimit: 0
        });
        res.status(201).json({ message: 'Profissional registrado com sucesso!', id: userRef.id });
    } catch (error) {
        console.error("Error creating professional:", error);
        res.status(500).json({ message: 'Erro ao registrar profissional.' });
    }
});

// Rota de login unificada
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;
        
        let collectionName = '';
        if (userType === 'admin') {
             const ADMIN_EMAIL = "admin@reabilite.pro";
             const ADMIN_PASSWORD = "24852230"; 

             if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                 const accessToken = jwt.sign({ email: ADMIN_EMAIL, type: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
                 return res.status(200).json({ accessToken, userType: 'admin' });
             } else {
                 return res.status(401).json({ message: 'Credenciais de administrador inválidas.' });
             }
        }
        else if (userType === 'professional') {
            collectionName = 'professionals';
        } else {
            return res.status(400).json({ message: 'Tipo de usuário inválido.' });
        }

        const usersRef = db.collection(collectionName);
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        const accessToken = jwt.sign({ id: userDoc.id, type: userType }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ accessToken, userType });

    } catch (error) {
        console.error(`Error logging in ${req.body.userType}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


app.get('/api/dashboard', verifyToken, async (req, res) => {
    if (req.user.type !== 'professional') {
        return res.status(403).send('Acesso negado.');
    }
    try {
        const professionalDoc = await db.collection('professionals').doc(req.user.id).get();
        if (!professionalDoc.exists) {
            return res.status(404).send('Profissional não encontrado.');
        }

        const linksSnapshot = await db.collection('invitation_links')
            .where('professionalId', '==', req.user.id)
            .where('used', '==', false)
            .get();

        const invitation_links = linksSnapshot.docs.map(doc => `/patient-registration.html?link=${doc.id}`);

        res.status(200).json({
            name: professionalDoc.data().name,
            invitation_links: invitation_links
        });
    } catch (error) {
        console.error("Error fetching professional dashboard:", error);
        res.status(500).send('Erro ao buscar dados do dashboard.');
    }
});

// --- Patient Routes ---
app.post('/api/patient/login', async (req, res) => {
     try {
        const { phone } = req.body;
        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.where('phone', '==', phone).limit(1).get();

        if (snapshot.empty) {
            return res.status(401).json({ message: 'Telefone não encontrado.' });
        }

        const patientDoc = snapshot.docs[0];
        const accessToken = jwt.sign({ id: patientDoc.id, type: 'patient' }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ accessToken });
    } catch (error) {
        console.error("Error logging in patient:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


app.get('/api/patient/dashboard', verifyToken, async (req, res) => {
     if (req.user.type !== 'patient') {
        return res.status(403).send('Acesso negado.');
    }
    try {
        const patientDoc = await db.collection('patients').doc(req.user.id).get();
        if (!patientDoc.exists) {
            return res.status(404).send('Paciente não encontrado.');
        }
        res.status(200).json(patientDoc.data());
    } catch (error) {
        console.error("Error fetching patient dashboard:", error);
        res.status(500).send('Erro ao buscar dados do paciente.');
    }
});


exports.api = functions.https.onRequest(app);
