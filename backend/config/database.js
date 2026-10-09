const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE
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
