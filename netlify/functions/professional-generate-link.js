const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const tokensPath = path.resolve(__dirname, '../../db/invitation-tokens.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Função auxiliar para ler os tokens
const getTokens = async () => {
    try {
        const data = await fs.readFile(tokensPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};

// Função auxiliar para salvar os tokens
const saveTokens = async (tokens) => {
    await fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2));
};

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    const token = event.headers.authorization?.split(' ')[1];
    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Authentication token is required.' }) };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const professionalId = decoded.id;

        const invitationToken = crypto.randomBytes(32).toString('hex');
        const expiration = Date.now() + 24 * 60 * 60 * 1000; // Expira em 24 horas

        const tokens = await getTokens();

        const newLink = {
            token: invitationToken,
            professionalId,
            expires: expiration,
            used: false
        };

        tokens.push(newLink);
        await saveTokens(tokens);

        return {
            statusCode: 200,
            body: JSON.stringify({
                invitation_link: `/patient-registration.html?token=${invitationToken}`
            })
        };

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return { statusCode: 401, body: JSON.stringify({ message: 'Invalid token.' }) };
        }
        console.error('Server error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An internal server error occurred.' })
        };
    }
};