const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql } = require('../config/database');
const redis = require('../config/redis');
const { sendOtpEmail } = require('../utils/emailService');
const { getJwtSecret } = require('../config/jwt');

class AuthService {
    // 1. NGHIỆP VỤ ĐĂNG KÝ
    async register({ username, email, password, full_name }) {
        if (!username || !email || !password || !full_name) {
            const err = new Error('Vui lòng điền đầy đủ các thông tin!');
            err.status = 400;
            throw err;
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedUsername = username.trim();
        const trimmedFullName = full_name.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            const err = new Error('Địa chỉ email không hợp lệ!');
            err.status = 400;
            throw err;
        }
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(trimmedUsername)) {
            const err = new Error('Username từ 3-30 ký tự, chỉ chứa chữ cái, số và dấu gạch dưới!');
            err.status = 400;
            throw err;
        }
        if (password.length < 6) {
            const err = new Error('Mật khẩu phải có ít nhất 6 ký tự!');
            err.status = 400;
            throw err;
        }

        // Kiểm tra trùng username hoặc email
        const reqCheck = new sql.Request();
        reqCheck.input('username', sql.VarChar, trimmedUsername);
        reqCheck.input('email', sql.VarChar, trimmedEmail);
        const checkRes = await reqCheck.query(`
            SELECT username, email FROM users WHERE username = @username OR email = @email
        `);

        if (checkRes.recordset.length > 0) {
            const exists = checkRes.recordset[0];
            const msg = exists.username.toLowerCase() === trimmedUsername.toLowerCase()
                ? 'Username đã tồn tại!'
                : 'Email đã được đăng ký!';
            const err = new Error(msg);
            err.status = 409;
            throw err;
        }

        // Băm mật khẩu và lưu user với is_verified = 0
        const hashedPassword = await bcrypt.hash(password, 10);
        const reqInsert = new sql.Request();
        reqInsert.input('username', sql.VarChar, trimmedUsername);
        reqInsert.input('email', sql.VarChar, trimmedEmail);
        reqInsert.input('password', sql.VarChar, hashedPassword);
        reqInsert.input('full_name', sql.NVarChar, trimmedFullName);
        const insertRes = await reqInsert.query(`
            INSERT INTO users (username, email, password, full_name, is_verified)
            OUTPUT INSERTED.id
            VALUES (@username, @email, @password, @full_name, 0)
        `);
        const userId = insertRes.recordset[0].id;

        // Sinh mã OTP 6 số và lưu vào Redis (TTL 10 phút = 600 giây)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            await redis.set(`otp:${trimmedEmail}`, otpCode, 'EX', 600);
        } catch (redisErr) {
            console.error('Lỗi lưu OTP vào Redis:', redisErr.message);
        }

        // Gửi email OTP
        try {
            await sendOtpEmail(trimmedEmail, otpCode);
        } catch (mailErr) {
            console.error('Lỗi gửi email OTP:', mailErr.message);
        }

        return {
            message: 'Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP.',
            email: trimmedEmail,
            userId
        };
    }

    // 2. NGHIỆP VỤ XÁC THỰC OTP
    async verifyOtp({ email, otp }) {
        if (!email || !otp) {
            const err = new Error('Vui lòng cung cấp email và mã OTP!');
            err.status = 400;
            throw err;
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedOtp = String(otp).trim();

        let storedOtp = null;
        try {
            storedOtp = await redis.get(`otp:${trimmedEmail}`);
        } catch (redisErr) {
            console.error('Lỗi đọc Redis:', redisErr.message);
            const err = new Error('Lỗi kết nối bộ nhớ đệm xác thực. Vui lòng thử lại!');
            err.status = 500;
            throw err;
        }

        if (!storedOtp) {
            const err = new Error('Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu gửi lại!');
            err.status = 400;
            throw err;
        }

        if (storedOtp !== trimmedOtp) {
            const err = new Error('Mã OTP không chính xác!');
            err.status = 400;
            throw err;
        }

        // Kích hoạt tài khoản và xóa OTP khỏi Redis
        const reqUpdate = new sql.Request();
        reqUpdate.input('email', sql.VarChar, trimmedEmail);
        await reqUpdate.query(`UPDATE users SET is_verified = 1 WHERE email = @email`);

        try {
            await redis.del(`otp:${trimmedEmail}`);
        } catch (delErr) {
            console.error('Lỗi xóa OTP sau xác thực:', delErr.message);
        }

        return { message: 'Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.' };
    }

    // 3. NGHIỆP VỤ GỬI LẠI OTP
    async resendOtp(email) {
        if (!email) {
            const err = new Error('Vui lòng cung cấp email!');
            err.status = 400;
            throw err;
        }

        const trimmedEmail = email.trim().toLowerCase();
        const reqFind = new sql.Request();
        reqFind.input('email', sql.VarChar, trimmedEmail);
        const res = await reqFind.query(`SELECT id, is_verified FROM users WHERE email = @email`);
        const user = res.recordset[0];

        if (!user) {
            const err = new Error('Không tìm thấy tài khoản với email này!');
            err.status = 404;
            throw err;
        }
        if (user.is_verified) {
            const err = new Error('Tài khoản này đã được xác thực trước đó!');
            err.status = 400;
            throw err;
        }

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            await redis.set(`otp:${trimmedEmail}`, newOtp, 'EX', 600);
        } catch (redisErr) {
            console.error('Lỗi lưu OTP mới vào Redis:', redisErr.message);
        }

        try {
            await sendOtpEmail(trimmedEmail, newOtp);
        } catch (mailErr) {
            console.error('Lỗi gửi lại email OTP:', mailErr.message);
        }

        return { message: 'Mã OTP mới đã được gửi vào email của bạn!' };
    }

    // 4. NGHIỆP VỤ ĐĂNG NHẬP
    async login({ account, password }) {
        if (!account || !password) {
            const err = new Error('Vui lòng nhập tài khoản và mật khẩu!');
            err.status = 400;
            throw err;
        }

        const trimmedAccount = account.trim();
        const reqUser = new sql.Request();
        reqUser.input('account', sql.VarChar, trimmedAccount);
        const userRes = await reqUser.query(`
            SELECT * FROM users WHERE username = @account OR email = @account
        `);
        const user = userRes.recordset[0];

        if (!user) {
            const err = new Error('Tài khoản hoặc mật khẩu không chính xác!');
            err.status = 400;
            throw err;
        }

        // Chặn tài khoản chưa xác thực OTP
        if (!user.is_verified) {
            const err = new Error('Tài khoản chưa được xác thực email. Vui lòng nhập mã OTP để kích hoạt!');
            err.status = 403;
            err.requireVerify = true;
            err.email = user.email;
            throw err;
        }

        // So khớp mật khẩu đã băm
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const err = new Error('Tài khoản hoặc mật khẩu không chính xác!');
            err.status = 400;
            throw err;
        }

        // Tạo JWT Token có thời hạn 7 ngày
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            getJwtSecret(),
            { expiresIn: '7d', algorithm: 'HS256' }
        );

        const { password: _, ...userInfo } = user;
        return {
            message: 'Đăng nhập thành công!',
            token,
            user: userInfo
        };
    }

    // 5. NGHIỆP VỤ LẤY THÔNG TIN PROFILE
    async getProfile(targetUserId) {
        const id = parseInt(targetUserId, 10);
        if (isNaN(id) || id <= 0) {
            const err = new Error('ID người dùng không hợp lệ!');
            err.status = 400;
            throw err;
        }

        const req = new sql.Request();
        req.input('id', sql.Int, id);
        const res = await req.query(`
            SELECT 
                u.id, u.username, u.full_name, u.email, u.avatar, u.bio, u.is_verified,
                (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
                (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count
            FROM users u
            WHERE u.id = @id
        `);
        const user = res.recordset[0];
        if (!user) {
            const err = new Error('Không tìm thấy người dùng!');
            err.status = 404;
            throw err;
        }
        return user;
    }

    // 6. NGHIỆP VỤ CẬP NHẬT THÔNG TIN PROFILE
    async updateProfile(userId, { full_name, bio }) {
        if (!full_name || full_name.trim().length < 2) {
            const err = new Error('Họ và tên phải có ít nhất 2 ký tự!');
            err.status = 400;
            throw err;
        }

        const trimmedFullName = full_name.trim();
        const trimmedBio = bio !== undefined && bio !== null ? bio.trim() : null;

        const req = new sql.Request();
        req.input('id', sql.Int, userId);
        req.input('full_name', sql.NVarChar, trimmedFullName);
        req.input('bio', sql.NVarChar, trimmedBio);
        await req.query(`
            UPDATE users SET full_name = @full_name, bio = @bio WHERE id = @id
        `);

        return {
            message: 'Cập nhật thông tin cá nhân thành công!',
            user: { id: userId, full_name: trimmedFullName, bio: trimmedBio }
        };
    }

    // 7. NGHIỆP VỤ CẬP NHẬT ẢNH ĐẠI DIỆN (Vá IDOR: userId lấy từ JWT token)
    async updateAvatar(userId, file) {
        if (!file) {
            const err = new Error('Vui lòng chọn một file ảnh hợp lệ!');
            err.status = 400;
            throw err;
        }

        const avatarUrl = `/uploads/${file.filename}`;
        const req = new sql.Request();
        req.input('id', sql.Int, userId);
        req.input('avatar', sql.NVarChar, avatarUrl);
        await req.query(`UPDATE users SET avatar = @avatar WHERE id = @id`);

        return {
            message: 'Cập nhật ảnh đại diện thành công!',
            avatar: avatarUrl
        };
    }
}

module.exports = new AuthService();
