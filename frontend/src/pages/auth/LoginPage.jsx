import './auth.module.css'

function LoginPage() {
  return (
    <div class="auth-container">
      <div class="auth-header">
        <h1>Fella</h1>
        <p>Kết nối và chia sẻ khoảnh khắc</p>
      </div>

      <div id="alertBox" class="alert-message"></div>

      <form id="loginForm">
        <div class="form-group">
          <label for="account">Tài khoản</label>
          <input
            type="text"
            id="account"
            placeholder="Username hoặc Email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Mật khẩu</label>
          <input
            type="password"
            id="password"
            placeholder="Mật khẩu"
            required
          />
        </div>

        <button type="submit" class="btn-primary">
          Đăng nhập
        </button>
      </form>

      <div class="auth-footer">
        <p>
          Chưa có tài khoản? <a href="register.html">Đăng ký ngay</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
