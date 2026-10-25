import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { fetchAPI } from "../../services/api";
import NoticeModal from "../../components/NoticeModal";
import FellaLogo from "../../components/FellaLogo";
import styles from "./auth.module.css";

export default function VerifyOtp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
  });

  // Chỉ cho phép vào trang Verify OTP khi có email từ luồng Đăng ký hoặc Đăng nhập chưa kích hoạt
  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Mã OTP không hợp lệ",
        message: "Mã OTP phải có chính xác 6 chữ số!",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });

      setModal({
        isOpen: true,
        type: "success",
        title: "Kích hoạt thành công!",
        message: res.message || "Tài khoản của bạn đã được kích hoạt thành công. Vui lòng đăng nhập để trải nghiệm!",
        onConfirm: () => navigate("/login"),
      });

      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Xác thực thất bại",
        message: err.message || "Mã OTP không chính xác hoặc đã hết hạn!",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    try {
      const res = await fetchAPI("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });

      setModal({
        isOpen: true,
        type: "success",
        title: "Đã gửi lại mã OTP",
        message: res.message || "Mã OTP mới đã được gửi vào hộp thư của bạn. Vui lòng kiểm tra!",
      });
      setCountdown(60);
    } catch (err) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Không thể gửi lại mã",
        message: err.message || "Gửi lại OTP thất bại. Vui lòng thử lại sau!",
      });
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <main className={styles.authPage}>
      <div className={styles.dialogCard}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <FellaLogo size={56} />
        </div>

        <div className={styles.dialogHeader}>
          <h1>Xác nhận tài khoản</h1>
          <p>
            Nhập mã gồm 6 chữ số đã được gửi đến: <strong style={{ color: "var(--primary)" }}>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify}>
          <input
            id="otp-input"
            type="text"
            maxLength={6}
            className={styles.otpBox}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            required
            autoFocus
          />

          <button
            type="submit"
            className={styles.btnPrimaryAuth}
            disabled={loading || otp.length < 6}
          >
            {loading ? "Đang kiểm tra..." : "Xác nhận & Tiếp tục"}
          </button>
        </form>

        <div className={styles.dialogFooter}>
          <p>
            Bạn chưa nhận được mã?{" "}
            {countdown > 0 ? (
              <span style={{ color: "#8a8d91", fontWeight: "600" }}>
                Gửi lại sau {countdown}s
              </span>
            ) : (
              <button
                type="button"
                className={styles.resendBtn}
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? "Đang gửi..." : "Gửi lại mã xác nhận"}
              </button>
            )}
          </p>
          <p style={{ marginTop: "14px" }}>
            <Link to="/login">Quay lại Đăng nhập</Link>
          </p>
        </div>
      </div>

      <NoticeModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => {
          if (modal.onConfirm) modal.onConfirm();
          else setModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </main>
  );
}
