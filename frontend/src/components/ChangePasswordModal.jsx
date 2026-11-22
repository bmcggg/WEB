import React, { useState } from "react";
import { fetchAPI } from "../services/api";
import styles from "./NoticeModal.module.css";

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMsg("Vui lòng điền đầy đủ các trường thông tin!");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp với mật khẩu mới!");
      return;
    }

    if (oldPassword === newPassword) {
      setErrorMsg("Mật khẩu mới không được trùng với mật khẩu hiện tại!");
      return;
    }

    setLoading(true);
    try {
      await fetchAPI("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || "Không thể đổi mật khẩu. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modal}
        style={{ maxWidth: "420px", textAlign: "left" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            🔑 Đổi mật khẩu
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: "rgba(250, 62, 62, 0.1)",
              border: "1px solid rgba(250, 62, 62, 0.3)",
              color: "#fa3e3e",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "14px",
              fontSize: "14px",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
              Mật khẩu hiện tại
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                boxSizing: "border-box",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
              Mật khẩu mới
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                boxSizing: "border-box",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
              Xác nhận mật khẩu mới
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                boxSizing: "border-box",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "18px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={showPass}
                onChange={() => setShowPass((prev) => !prev)}
              />
              Hiển thị mật khẩu
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={loading}
              style={{ minWidth: "120px" }}
            >
              {loading ? "Đang lưu..." : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
