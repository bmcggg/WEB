const sql = require('mssql');

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '123456',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'fella_db',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE || 'SQLEXPRESS'
    }
};

async function connectDB() {
    try {
        await sql.connect(config);
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}

module.exports = { 
    sql, 
    connectDB 
};