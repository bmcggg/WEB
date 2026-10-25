const rateLimit = require('express-rate-limit');

// Chặn brute-force đăng nhập / xác thực OTP: 10 lần / 15 phút
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau 15 phút!' }
});

// Chặn spam gửi lại mã OTP: 3 lần / 5 phút
const resendOtpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Vui lòng chờ 5 phút trước khi yêu cầu gửi lại OTP tiếp theo!' }
});

module.exports = { authLimiter, resendOtpLimiter };
