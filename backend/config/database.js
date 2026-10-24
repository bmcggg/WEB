const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'NEW',
    port: Number(process.env.DB_PORT || 1433),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== 'false',
        instanceName: process.env.DB_INSTANCE
    }
};

async function connectDB() {
    try {
        await sql.connect(config);
    } catch (err) {
        console.error('Lỗi kết nối CSDL:', err.message);
        throw err;
    }
}

module.exports = { 
    sql, 
    connectDB,
    config 
};
