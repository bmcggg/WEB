require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const { getJwtSecret } = require('./config/jwt');
const { connectDB } = require('./config/database');
const initDatabase = require('./config/database-init');
const createApp = require('./app');

async function start() {
    getJwtSecret();
    if (process.env.DB_INIT === 'true') await initDatabase();
    await connectDB();
    const port = process.env.PORT || 5000;
    createApp().listen(port, () => console.log('Server running at: http://localhost:' + port));
}

start().catch((error) => {
    console.error('Khong the khoi dong server:', error.message);
    process.exitCode = 1;
});
