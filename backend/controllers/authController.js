const authService = require('../services/authService');

class AuthController {
    // POST /api/auth/register
    async register(req, res) {
        try {
            const result = await authService.register(req.body);
            res.status(201).json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // POST /api/auth/verify-otp
    async verifyOtp(req, res) {
        try {
            const result = await authService.verifyOtp(req.body);
            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // POST /api/auth/resend-otp
    async resendOtp(req, res) {
        try {
            const result = await authService.resendOtp(req.body.email);
            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // POST /api/auth/login
    async login(req, res) {
        try {
            const result = await authService.login(req.body);

            // Thiết lập HttpOnly Cookie an toàn tuyệt đối, chống XSS
            res.cookie('fella_token', result.token, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
            });

            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({
                error: err.message,
                requireVerify: err.requireVerify,
                email: err.email
            });
        }
    }

    // POST /api/auth/logout
    async logout(req, res) {
        res.clearCookie('fella_token', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });
        res.json({ message: 'Đăng xuất thành công!' });
    }

    // GET /api/auth/profile/:id
    async getProfile(req, res) {
        try {
            const user = await authService.getProfile(req.params.id);
            res.json({ data: user });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // PUT /api/auth/profile
    async updateProfile(req, res) {
        try {
            // req.user.id do authenticate middleware gán từ token
            const result = await authService.updateProfile(req.user.id, req.body);
            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // POST /api/auth/update-avatar
    async updateAvatar(req, res) {
        try {
            // req.user.id do authenticate middleware gán từ token -> Vá triệt để IDOR
            const result = await authService.updateAvatar(req.user.id, req.file);
            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }
}

module.exports = new AuthController();
