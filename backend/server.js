require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const createApp = require('./app');
const { connectDB } = require('./config/database');
const initDatabase = require('./config/database-init');

const app = createApp();

async function startServer() {
    try {
        await initDatabase();
        await connectDB();
        const port = process.env.PORT || 5001;
        app.listen(port, () => console.log('Server running at: http://localhost:' + port));
    } catch (error) {
        console.error('Khong the khoi dong server:', error.message);
        process.exitCode = 1;
    }
}

startServer();
