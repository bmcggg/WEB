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

        // Chặn tài khoản đã bị vô hiệu hóa (xóa mềm)
        if (user.deleted_at) {
            const err = new Error('Tài khoản của bạn đã bị vô hiệu hóa.');
            err.status = 403;
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

    // 5. NGHIỆP VỤ LẤY THÔNG TIN PROFILE (TÍCH HỢP TRẠNG THÁI GRAPH)
    async getProfile(targetUserId, viewerId = null) {
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
                u.id, u.username, u.full_name, u.email, u.avatar, u.cover, u.bio, u.is_verified, u.created_at,
                (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count
            FROM users u
            WHERE u.id = @id AND u.deleted_at IS NULL
        `);
        const user = res.recordset[0];
        if (!user) {
            const err = new Error('Không tìm thấy người dùng hoặc tài khoản đã bị vô hiệu hóa!');
            err.status = 404;
            throw err;
        }

        // 1. Đếm Followers qua Graph MATCH
        const reqFollowers = new sql.Request();
        reqFollowers.input('id', sql.Int, id);
        const resFollowers = await reqFollowers.query(`
            SELECT COUNT(*) AS followers_count
            FROM users u1, follows f, users u2
            WHERE MATCH(u1-(f)->u2) AND u2.id = @id AND u1.deleted_at IS NULL
        `);
        user.followers_count = resFollowers.recordset[0]?.followers_count || 0;

        // 2. Đếm Following qua Graph MATCH
        const reqFollowing = new sql.Request();
        reqFollowing.input('id', sql.Int, id);
        const resFollowing = await reqFollowing.query(`
            SELECT COUNT(*) AS following_count
            FROM users u1, follows f, users u2
            WHERE MATCH(u1-(f)->u2) AND u1.id = @id AND u2.deleted_at IS NULL
        `);
        user.following_count = resFollowing.recordset[0]?.following_count || 0;

        // 3. Đếm Bạn bè qua Graph MATCH
        const reqFriends = new sql.Request();
        reqFriends.input('id', sql.Int, id);
        const resFriends = await reqFriends.query(`
            SELECT COUNT(*) AS friends_count
            FROM users u1, friends_with f, users u2
            WHERE MATCH(u1-(f)->u2) AND u1.id = @id AND u2.deleted_at IS NULL
        `);
        user.friends_count = resFriends.recordset[0]?.friends_count || 0;

        // 4. Nếu có viewerId và viewerId !== targetId -> Tính toán relationship
        const parsedViewerId = viewerId ? parseInt(viewerId, 10) : null;
        if (parsedViewerId && parsedViewerId !== id) {
            // Kiểm tra is_following
            const reqIsFollow = new sql.Request();
            reqIsFollow.input('viewerId', sql.Int, parsedViewerId);
            reqIsFollow.input('targetId', sql.Int, id);
            const resIsFollow = await reqIsFollow.query(`
                SELECT COUNT(*) AS cnt
                FROM users u1, follows f, users u2
                WHERE MATCH(u1-(f)->u2) AND u1.id = @viewerId AND u2.id = @targetId
            `);
            const isFollowing = (resIsFollow.recordset[0]?.cnt || 0) > 0;

            // Kiểm tra friendship_status
            const reqFriendship = new sql.Request();
            reqFriendship.input('u1', sql.Int, parsedViewerId);
            reqFriendship.input('u2', sql.Int, id);
            const resFriendship = await reqFriendship.query(`
                SELECT requester_id, receiver_id, status
                FROM friend_requests
                WHERE (requester_id = @u1 AND receiver_id = @u2)
                   OR (requester_id = @u2 AND receiver_id = @u1)
            `);
            let friendshipStatus = 'NONE';
            let isRequester = false;
            if (resFriendship.recordset.length > 0) {
                const fr = resFriendship.recordset[0];
                friendshipStatus = fr.status;
                isRequester = fr.requester_id === parsedViewerId;
            }

            // Tính số bạn chung qua Graph MATCH
            const reqMutual = new sql.Request();
            reqMutual.input('viewerId', sql.Int, parsedViewerId);
            reqMutual.input('targetId', sql.Int, id);
            const resMutual = await reqMutual.query(`
                SELECT COUNT(DISTINCT mutual.id) AS mutual_count
                FROM users u1, friends_with f1, users mutual, friends_with f2, users u2
                WHERE MATCH(u1-(f1)->mutual-(f2)->u2)
                  AND u1.id = @viewerId AND u2.id = @targetId
                  AND mutual.deleted_at IS NULL
            `);
            const mutualFriendsCount = resMutual.recordset[0]?.mutual_count || 0;

            user.relationship = {
                is_following: isFollowing,
                friendship_status: friendshipStatus,
                is_requester: isRequester,
                mutual_friends_count: mutualFriendsCount
            };
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

    // 8. NGHIỆP VỤ CẬP NHẬT ẢNH BÌA (COVER PHOTO)
    async updateCover(userId, file) {
        if (!file) {
            const err = new Error('Vui lòng chọn một file ảnh bìa hợp lệ!');
            err.status = 400;
            throw err;
        }

        const coverUrl = `/uploads/${file.filename}`;
        const req = new sql.Request();
        req.input('id', sql.Int, userId);
        req.input('cover', sql.NVarChar, coverUrl);
        await req.query(`UPDATE users SET cover = @cover WHERE id = @id`);

        return {
            message: 'Cập nhật ảnh bìa thành công!',
            cover: coverUrl
        };
    }

    // 9. NGHIỆP VỤ ĐỔI MẬT KHẨU
    async changePassword(userId, { old_password, new_password }) {
        if (!old_password || !new_password) {
            const err = new Error('Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!');
            err.status = 400;
            throw err;
        }

        if (new_password.length < 6) {
            const err = new Error('Mật khẩu mới phải có ít nhất 6 ký tự!');
            err.status = 400;
            throw err;
        }

        if (old_password === new_password) {
            const err = new Error('Mật khẩu mới không được trùng với mật khẩu cũ!');
            err.status = 400;
            throw err;
        }

        const reqUser = new sql.Request();
        reqUser.input('id', sql.Int, userId);
        const resUser = await reqUser.query('SELECT password FROM users WHERE id = @id');
        const user = resUser.recordset[0];

        if (!user) {
            const err = new Error('Không tìm thấy tài khoản người dùng!');
            err.status = 404;
            throw err;
        }

        const isMatch = await bcrypt.compare(old_password, user.password);
        if (!isMatch) {
            const err = new Error('Mật khẩu hiện tại không chính xác!');
            err.status = 400;
            throw err;
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        const reqUpdate = new sql.Request();
        reqUpdate.input('id', sql.Int, userId);
        reqUpdate.input('password', sql.VarChar, hashedPassword);
        await reqUpdate.query('UPDATE users SET password = @password WHERE id = @id');

        return { message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.' };
    }

    // 10. NGHIỆP VỤ VÔ HIỆU HÓA TÀI KHOẢN (SOFT DELETE)
    async softDeleteAccount(userId) {
        const req = new sql.Request();
        req.input('id', sql.Int, userId);
        await req.query('UPDATE users SET deleted_at = GETDATE() WHERE id = @id');

        return { message: 'Tài khoản của bạn đã được vô hiệu hóa thành công.' };
    }
}

module.exports = new AuthService();
