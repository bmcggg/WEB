import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchAPI } from "../../services/api";
import styles from "./auth.module.css";

export default function Register() {
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
  });
  const [alert, setAlert] = useState({ message: "", type: "" });
  const navigate = useNavigate();

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    const values = {
      ...form,
      full_name: form.full_name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
    };
    try {
      await fetchAPI("/auth/register", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setAlert({
        message: "Đăng ký thành công! Đang chuyển sang trang đăng nhập...",
        type: "success",
      });
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setAlert({ message: error.message, type: "error" });
    }
  };

  return (
    <main className={styles.authPage}>
      <div className={styles["auth-container"]}>
        <div className={styles["auth-header"]}>
          <h1>Fella</h1>
          <p>Tạo tài khoản mới để trải nghiệm</p>
        </div>
        {alert.message && (
          <div
            className={`${styles["alert-message"]} ${styles.alertVisible} ${alert.type === "success" ? styles["alert-success"] : styles["alert-error"]}`}
            role="alert"
          >
            {alert.message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className={styles["form-group"]}>
            <label htmlFor="full_name">Họ và tên</label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={update("full_name")}
              placeholder="Ví dụ: Nguyễn Văn A"
              required
            />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="username">Tên người dùng (Username)</label>
            <input
              id="username"
              value={form.username}
              onChange={update("username")}
              placeholder="Ví dụ: nguyenvana"
              required
            />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="email">Địa chỉ Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="name@example.com"
              required
            />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={update("password")}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>
          <button type="submit" className={styles["btn-primary"]}>
            Đăng ký
          </button>
        </form>
        <div className={styles["auth-footer"]}>
          <p>
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
