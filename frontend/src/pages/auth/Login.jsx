import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchAPI } from "../../services/api";
import styles from "./auth.module.css";

export default function Login() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState({ message: "", type: "" });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await fetchAPI("/auth/login", {
        method: "POST",
        body: JSON.stringify({ account, password }),
      });

      localStorage.setItem("fella_token", data.token);
      localStorage.setItem("fella_user", JSON.stringify(data.user));

      setAlert({
        message: "Đăng nhập thành công! Đang chuyển hướng...",
        type: "success",
      });
      setTimeout(() => navigate("/feed"), 1000);
    } catch (err) {
      setAlert({ message: err.message, type: "error" });
    }
  };

  return (
    <main className={styles.authPage}>
    <div className={styles["auth-container"]}>
      <div className={styles["auth-header"]}>
        <h1>Fella</h1>
        <p>Kết nối và chia sẻ khoảnh khắc</p>
      </div>

      {alert.message && (
        <div
          className={`${styles["alert-message"]} ${styles.alertVisible} ${
            alert.type === "success"
              ? styles["alert-success"]
              : styles["alert-error"]
          }`}
          role="alert"
        >
          {alert.message}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div className={styles["form-group"]}>
          <label>Tài khoản</label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Username hoặc Email"
            required
          />
        </div>

        <div className={styles["form-group"]}>
          <label>Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            required
          />
        </div>

        <button type="submit" className={styles["btn-primary"]}>
          Đăng nhập
        </button>
      </form>

      <div className={styles["auth-footer"]}>
        <p>
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
    </main>
  );
}
