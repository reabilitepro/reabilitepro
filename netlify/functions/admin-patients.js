
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

const patientsPath = path.resolve(__dirname, '../../db/patients.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const getPatients = async () => {
    try {
        const data = await fs.readFile(patientsPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    const token = event.headers.authorization?.split(' ')[1];

    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Authentication token is required.' }) };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== 'admin') {
            return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden: You do not have admin privileges.' }) };
        }

        const patients = await getPatients();
        
        return {
            statusCode: 200,
            body: JSON.stringify(patients)
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
