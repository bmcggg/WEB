const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const fs = require('node:fs');
const multer = require('multer');
const { HttpError } = require('./utils/postValidation');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

function createApp() {
    const app = express();
    app.disable('x-powered-by');

    // Tích hợp Helmet với cấu hình CORP cho phép load ảnh static qua origin khác
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    app.use(cors({
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
        credentials: true
    }));
    app.use(cookieParser());
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: false, limit: '100kb' }));

    app.use('/api/auth', authRoutes);
    app.use('/api/posts', postRoutes);
    app.use('/api', (req, res) => res.status(404).json({ error: 'Khong tim thay API.' }));
    app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), { dotfiles: 'deny' }));

    const frontend = path.join(__dirname, '../frontend/dist');
    if (fs.existsSync(path.join(frontend, 'index.html'))) {
        app.use(express.static(frontend));
        app.get(['/', '/login', '/register', '/verify-otp', '/feed', '/profile', '/saved'], (req, res) => res.sendFile(path.join(frontend, 'index.html')));
    }

    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        if (error instanceof multer.MulterError) {
            const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
            return res.status(status).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Tệp tải lên vượt quá dung lượng tối đa cho phép (5MB).' : error.message });
        }
        if (error.status && error.message) {
            return res.status(error.status).json({ error: error.message });
        }
        if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
        if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON khong hop le.' });
        if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Du lieu qua lon.' });

        console.error('Request failed:', error.message || error);
        res.status(500).json({ error: 'Loi he thong. Vui long thu lai sau.' });
    });

    return app;
}

module.exports = createApp;
