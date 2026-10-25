const express = require('express');
require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const { getJwtSecret } = require('./config/jwt');
const { connectDB } = require('./config/database');
const initDatabase = require('./config/database-init');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '../frontend/pages')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages', 'login.html'));
});

async function startServer() {
    try {
        await initDatabase();
        await connectDB();
        const port = process.env.PORT || 5000;
        app.listen(port, () => console.log('Server running at: http://localhost:' + port));
    } catch (error) {
        console.error('Khong the khoi dong server:', error.message);
        process.exitCode = 1;
    }
}

startServer();