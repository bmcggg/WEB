import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./userDropdown.module.css";
import { assetUrl } from "../services/api";
import { getTheme, toggleTheme } from "../utils/theme";

export default function UserDropdown({ user, isOpen, onClose, onLogoutClick }) {
  const dropdownRef = useRef(null);
  const [theme, setCurrentTheme] = useState(getTheme());
  const navigate = useNavigate();

  // Đóng dropdown khi click chuột ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Lắng nghe sự kiện thay đổi theme
  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail?.theme) setCurrentTheme(e.detail.theme);
    };
    window.addEventListener("fella-theme-change", handleThemeChange);
    return () => window.removeEventListener("fella-theme-change", handleThemeChange);
  }, []);

  if (!isOpen) return null;

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setCurrentTheme(next);
  };

  const handleGoProfile = () => {
    onClose();
    navigate("/profile");
  };

  const handleGoSaved = () => {
    onClose();
    navigate("/saved");
  };

  const isDark = theme === "dark";

  return (
    <div className={styles.dropdownMenu} ref={dropdownRef}>
      {/* KHỐI XEM TRANG CÁ NHÂN */}
      <div className={styles.profileCard} onClick={handleGoProfile} role="button" tabIndex={0}>
        <div
          className={styles.profileAvatar}
          style={user.avatar ? { backgroundImage: `url('${assetUrl(user.avatar)}')` } : {}}
        >
          {!user.avatar &&
            (user.full_name || user.username || "U").charAt(0).toUpperCase()}
        </div>
        <div className={styles.profileInfo}>
          <span className={styles.profileName}>
            {user.full_name || user.username || "Người dùng Fella"}
          </span>
          <span className={styles.profileSub}>Xem trang cá nhân của bạn</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* MỤC BÀI VIẾT ĐÃ LƯU */}
      <div className={styles.menuItem} onClick={handleGoSaved} role="button" tabIndex={0}>
        <div className={styles.iconCircle}>🔖</div>
        <span className={styles.menuLabel}>Bài viết đã lưu</span>
      </div>

      {/* MỤC CHẾ ĐỘ TỐI (DARK MODE TOGGLE) */}
      <div className={styles.menuItem} onClick={handleToggleTheme} role="button" tabIndex={0}>
        <div className={styles.iconCircle}>{isDark ? "☀️" : "🌙"}</div>
        <span className={styles.menuLabel}>
          Màn hình: {isDark ? "Chế độ tối (Đang bật)" : "Chế độ sáng"}
        </span>
        <div className={`${styles.switch} ${isDark ? styles.switchActive : ""}`}>
          <div className={styles.switchHandle} />
        </div>
      </div>

      {/* MỤC CÀI ĐẶT & QUYỀN RIÊNG TƯ */}
      <div
        className={styles.menuItem}
        onClick={() => {
          onClose();
          navigate("/profile");
        }}
        role="button"
        tabIndex={0}
      >
        <div className={styles.iconCircle}>⚙️</div>
        <span className={styles.menuLabel}>Cài đặt & quyền riêng tư</span>
      </div>

      <div className={styles.divider} />

      {/* MỤC ĐĂNG XUẤT */}
      <div
        className={`${styles.menuItem} ${styles.logoutItem}`}
        onClick={() => {
          onClose();
          onLogoutClick();
        }}
        role="button"
        tabIndex={0}
      >
        <div className={`${styles.iconCircle} ${styles.logoutIcon}`}>🚪</div>
        <span className={styles.menuLabel}>Đăng xuất</span>
      </div>
    </div>
  );
}
