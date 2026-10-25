import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchAPI } from "../../services/api";
import NoticeModal from "../../components/NoticeModal";
import FellaLogo from "../../components/FellaLogo";
import styles from "./auth.module.css";

export default function Login() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: null,
    cancelText: null,
    onConfirm: null,
  });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await fetchAPI("/auth/login", {
        method: "POST",
        body: JSON.stringify({ account: account.trim(), password }),
      });

      // Lưu thông tin user để hiển thị UI
      localStorage.setItem("fella_user", JSON.stringify(data.user));

      // Hiển thị Popup Hộp thoại thành công không có nút OK
      setModal({
        isOpen: true,
        type: "success",
        title: "Đăng nhập thành công",
        message: "",
        confirmText: null,
        cancelText: null,
        onConfirm: () => navigate("/feed"),
      });

      setTimeout(() => {
        navigate("/feed");
      }, 1000);
    } catch (err) {
      if (err.status === 403) {
        const verifyEmail = err.data?.email || (account.includes("@") ? account.trim() : "");
        setModal({
          isOpen: true,
          type: "info",
          title: "Tài khoản chưa kích hoạt",
          message: "Tài khoản này chưa được kích hoạt OTP. Nhấn OK để kích hoạt ngay.",
          confirmText: "Kích hoạt ngay",
          onConfirm: () => {
            navigate(`/verify-otp${verifyEmail ? `?email=${encodeURIComponent(verifyEmail)}` : ""}`);
          },
        });
      } else {
        setModal({
          isOpen: true,
          type: "error",
          title: "Đăng nhập không thành công",
          message: err.message || "Tài khoản hoặc mật khẩu không chính xác!",
          confirmText: "Đã hiểu",
          onConfirm: () => setModal((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.authPage}>
      <div className={styles.splitLayout}>
        {/* CỘT TRÁI: THƯƠNG HIỆU & LỜI CHÀO TỰ NHIÊN */}
        <div className={styles.brandCol}>
          <div className={styles.brandLogoWrapper}>
            <FellaLogo size={56} />
            <h1 className={styles.brandLogo}>Fella</h1>
          </div>
          <p className={styles.brandSlogan}>
            Fella giúp bạn kết nối và chia sẻ với những người thân yêu trong cuộc sống.
          </p>
        </div>

        {/* CỘT PHẢI: FORM ĐĂNG NHẬP CARD ĐỘC LẬP */}
        <div className={styles.formCol}>
          <div className={styles.authCard}>
            <form onSubmit={handleLogin}>
              <div className={styles.fieldGroup}>
                <div className={styles.inputWrapper}>
                  <input
                    id="login-account"
                    type="text"
                    className={`${styles.formInput} ${styles.formInputNoEye}`}
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="Email hoặc tên người dùng"
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.inputWrapper}>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className={styles.formInput}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeIconBtn}
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>

            <div className={styles.divider} />

            <div className={styles.footerRow}>
              <Link to="/register" className={styles.btnGreen}>
                Tạo tài khoản mới
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP THÔNG BÁO */}
      <NoticeModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onClose={() => {
          if (modal.onConfirm) modal.onConfirm();
          else setModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </main>
  );
}
