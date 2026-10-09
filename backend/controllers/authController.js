const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

class AuthController {
    async register(req, res) {
        const { username, email, password, full_name } = req.body;

        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin!' });
        }

        try {
            const isExist = await authService.checkExistingUser(username, email);
            if (isExist) {
                return res.status(400).json({ error: 'Username hoặc Email đã tồn tại!' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUserId = await authService.createUser(username, email, hashedPassword, full_name);

            res.status(201).json({
                message: 'Đăng ký tài khoản thành công!',
                userId: newUserId
            });
        } catch (err) {
            console.error('Lỗi Register:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async login(req, res) {
        const { account, password } = req.body;

        if (!account || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu!' });
        }

        try {
            const user = await authService.findUserByUsernameOrEmail(account);
            if (!user) {
                return res.status(400).json({ error: 'Tài khoản hoặc mật khẩu không chính xác!' });
            }

            const isPasswordMatch = await bcrypt.compare(password, user.password);
            if (!isPasswordMatch) {
                return res.status(400).json({ error: 'Tài khoản hoặc mật khẩu không chính xác!' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            const { password: _, ...userInfo } = user;
            res.json({
                message: 'Đăng nhập thành công!',
                token: token,
                user: userInfo
            });
        } catch (err) {
            console.error('Lỗi Login:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async updateAvatar(req, res) {
        try {
            const { userId } = req.body;
            if (!req.file) {
                return res.status(400).json({ error: 'Vui lòng chọn ảnh!' });
            }

            const avatarUrl = `/uploads/${req.file.filename}`;
            await authService.updateAvatar(userId, avatarUrl);

            return res.json({ message: 'Cập nhật thành công', avatar: avatarUrl });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.params.id;
            const user = await authService.getUserProfile(userId);
            if (!user) {
                return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
            }
            res.json({ data: user });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new AuthController();