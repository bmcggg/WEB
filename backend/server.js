require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { sql, connectDB } = require('./config/database'); 

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Phục vụ file tĩnh (CSS, JS, Images) từ thư mục gốc frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// 2. Phục vụ trực tiếp các file HTML nằm trong frontend/pages
app.use(express.static(path.join(__dirname, '../frontend/pages')));

// 3. Routes API
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// 4. Route static cho thư mục uploads ảnh
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Trang chủ mặc định -> login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages', 'login.html'));
});

async function initDatabase() {
    try {
        if (typeof connectDB === 'function') {
            await connectDB();
        }

        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            const request = new sql.Request();
            await request.query(schemaSql);
        }
    } catch (err) {
        console.error('Lỗi khởi tạo DB:', err.message);
    }
}

initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running at: http://localhost:${PORT}`);
    });
});