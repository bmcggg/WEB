require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { sql, connectDB } = require('./config/database');
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

initDatabase().then(async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running at: http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Không thể khởi động server:', err.message);
});
