const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendOtpEmail(toEmail, otpCode) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn(`[CẢNH BÁO SMTP] Chưa cấu hình SMTP_USER/SMTP_PASS trong .env. Mã OTP tạo cho ${toEmail} là: ${otpCode}`);
        return { mock: true, otpCode };
    }

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e4e6eb; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #1877f2; text-align: center; margin-bottom: 16px;">Xác thực tài khoản Fella</h2>
            <p style="color: #1c1e21; font-size: 15px;">Xin chào,</p>
            <p style="color: #65676b; font-size: 14px;">Bạn vừa đăng ký tài khoản tại mạng xã hội Fella. Dưới đây là mã OTP kích hoạt tài khoản của bạn:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1877f2; background: #e7f3ff; padding: 12px 24px; border-radius: 6px; display: inline-block;">
                    ${otpCode}
                </span>
            </div>
            <p style="color: #65676b; font-size: 13px;">Mã OTP có hiệu lực trong vòng <strong>10 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn cho tài khoản của bạn.</p>
            <hr style="border: none; border-top: 1px solid #e4e6eb; margin: 20px 0;" />
            <p style="color: #8a8d91; font-size: 12px; text-align: center;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
        </div>
    `;

    return transporter.sendMail({
        from: `"Fella Network" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `${otpCode} là mã xác thực tài khoản Fella của bạn`,
        html
    });
}

module.exports = { sendOtpEmail };
