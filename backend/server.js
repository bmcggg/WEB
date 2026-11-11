require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const { getJwtSecret } = require('./config/jwt');
const { connectDB } = require('./config/database');
const initDatabase = require('./config/database-init');
const createApp = require('./app');
const { startStoryCleanup } = require('./utils/storyCleanup');
const PORT = Number(process.env.PORT || 5000);

async function startServer() {
    getJwtSecret();
    await initDatabase();
    await connectDB();

    const app = createApp();
    const server = app.listen(PORT, () => {
        console.log(`Server running at: http://localhost:${PORT}`);
    });
    startStoryCleanup();
    return server;
}

startServer().catch((error) => {
    console.error('Khong the khoi dong server:', error.message);
    process.exitCode = 1;
});
