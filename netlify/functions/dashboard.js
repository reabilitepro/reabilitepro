
exports.handler = async function(event, context) {
    // In a real app, you'd verify the token and get user info from a database.
    // For now, we'll just return a mock name.
    return {
        statusCode: 200,
        body: JSON.stringify({
            name: 'Dr. Exemplo'
        })
    };
};
