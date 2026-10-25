import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchAPI } from "../../services/api";
import NoticeModal from "../../components/NoticeModal";
import FellaLogo from "../../components/FellaLogo";
import styles from "./auth.module.css";

export default function Register() {
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Đã hiểu",
    onConfirm: null,
  });
  const navigate = useNavigate();

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password.length < 6) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Mật khẩu quá ngắn",
        message: "Mật khẩu phải chứa ít nhất 6 ký tự để đảm bảo an toàn!",
        confirmText: "Đã hiểu",
      });
      return;
    }

    if (form.password !== confirmPassword) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Mật khẩu không khớp",
        message: "Mật khẩu xác nhận không trùng khớp với mật khẩu đã nhập!",
        confirmText: "Đã hiểu",
      });
      return;
    }

    setLoading(true);

    try {
      const values = {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      };

      const res = await fetchAPI("/auth/register", {
        method: "POST",
        body: JSON.stringify(values),
      });

      setModal({
        isOpen: true,
        type: "success",
        title: "Đăng ký thành công!",
        message: res.message || "Mã OTP đã được gửi về email của bạn. Nhấn OK để kích hoạt tài khoản.",
        confirmText: "Kích hoạt tài khoản",
        onConfirm: () => navigate(`/verify-otp?email=${encodeURIComponent(values.email)}`),
      });

      setTimeout(() => {
        navigate(`/verify-otp?email=${encodeURIComponent(values.email)}`);
      }, 1500);
    } catch (error) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Đăng ký thất bại",
        message: error.message || "Không thể hoàn tất đăng ký. Vui lòng kiểm tra lại thông tin!",
        confirmText: "Đã hiểu",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.authPage}>
      <div className={styles.splitLayout}>
        {/* CỘT TRÁI: FORM ĐĂNG KÝ CARD ĐỘC LẬP */}
        <div className={styles.formCol}>
          <div className={styles.authCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Đăng ký</h2>
              <p className={styles.cardSubtitle}>Nhanh chóng và dễ dàng.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <div className={styles.inputWrapper}>
                  <input
                    id="register-fullname"
                    type="text"
                    className={`${styles.formInput} ${styles.formInputNoEye}`}
                    value={form.full_name}
                    onChange={update("full_name")}
                    placeholder="Họ và tên"
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.inputWrapper}>
                  <input
                    id="register-username"
                    type="text"
                    className={`${styles.formInput} ${styles.formInputNoEye}`}
                    value={form.username}
                    onChange={update("username")}
                    placeholder="Tên người dùng (username)"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.inputWrapper}>
                  <input
                    id="register-email"
                    type="email"
                    className={`${styles.formInput} ${styles.formInputNoEye}`}
                    value={form.email}
                    onChange={update("email")}
                    placeholder="Địa chỉ Email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.inputWrapper}>
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    className={styles.formInput}
                    value={form.password}
                    onChange={update("password")}
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    required
                    autoComplete="new-password"
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

              <div className={styles.fieldGroup}>
                <div className={styles.inputWrapper}>
                  <input
                    id="register-confirm-password"
                    type={showConfirm ? "text" : "password"}
                    className={styles.formInput}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeIconBtn}
                    onClick={() => setShowConfirm((prev) => !prev)}
                    title={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    tabIndex={-1}
                  >
                    {showConfirm ? (
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
                className={styles.btnGreen}
                style={{ width: "100%", marginTop: "4px", padding: "12px", fontSize: "16px" }}
                disabled={loading}
              >
                {loading ? "Đang đăng ký..." : "Đăng ký"}
              </button>
            </form>

            <div className={styles.divider} />

            <div className={styles.footerRow}>
              <Link to="/login" className={styles.footerLink}>
                Bạn đã có tài khoản? Đăng nhập
              </Link>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: THƯƠNG HIỆU */}
        <div className={styles.brandCol}>
          <div className={styles.brandLogoWrapper}>
            <FellaLogo size={56} />
            <h1 className={styles.brandLogo}>Fella</h1>
          </div>
          <p className={styles.brandSlogan}>
            Fella giúp bạn kết nối và chia sẻ với những người thân yêu trong cuộc sống.
          </p>
        </div>
      </div>

      <NoticeModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        onClose={() => {
          if (modal.onConfirm) modal.onConfirm();
          else setModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </main>
  );
}
