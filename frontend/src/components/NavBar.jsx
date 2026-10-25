import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "./navbar.module.css";
import { assetUrl, readUser, logoutAPI } from "../services/api";
import NoticeModal from "./NoticeModal";
import UserDropdown from "./UserDropdown";
import FellaLogo from "./FellaLogo";
import { getTheme, toggleTheme } from "../utils/theme";

export default function Navbar() {
  const navigate = useNavigate();
  const user = readUser() || {};
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [theme, setAppTheme] = useState(getTheme());
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: null,
    onConfirm: null,
  });

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail?.theme) setAppTheme(e.detail.theme);
    };
    window.addEventListener("fella-theme-change", handleThemeChange);
    return () => window.removeEventListener("fella-theme-change", handleThemeChange);
  }, []);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setAppTheme(next);
  };

  const handleLogoutClick = () => {
    setModal({
      isOpen: true,
      type: "info",
      title: "Đăng xuất tài khoản",
      message: "Bạn có chắc chắn muốn đăng xuất khỏi Fella không?",
      confirmText: "Đăng xuất",
      cancelText: "Hủy",
      onConfirm: async () => {
        await logoutAPI();
        setModal({
          isOpen: true,
          type: "success",
          title: "Đăng xuất thành công!",
          message: "Hẹn gặp lại bạn trên Fella!",
          confirmText: "OK",
          cancelText: null,
          onConfirm: () => navigate("/login"),
        });
        setTimeout(() => navigate("/login"), 1000);
      },
    });
  };

  const isDark = theme === "dark";

  return (
    <>
      <header className={styles.navbar}>
        {/* KHỐI TRÁI: LOGO TRÒN CHỮ F + FELLA & THANH SEARCH */}
        <div className={styles.navLeft}>
          <div className={styles.brandWrapper}>
            <Link className={styles.brandLink} to="/feed">
              <FellaLogo size={42} />
              <span className={styles.brandText}>Fella</span>
            </Link>
          </div>

          <div className={`${styles.searchWrapper} ${isSearchFocused ? styles.searchWrapperActive : ""}`}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm kiếm trên Fella"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsSearchFocused(false);
              }}
            />
          </div>
        </div>

        {/* LỚP PHỦ MỜ MÀN HÌNH KHI BẤM VÀO THANH TÌM KIẾM */}
        {isSearchFocused && (
          <div
            className={styles.searchBackdrop}
            onClick={() => setIsSearchFocused(false)}
          />
        )}

        {/* KHỐI PHẢI: NÚT DARK MODE + AVATAR DROPDOWN */}
        <div className={styles.navRight}>
          {/* Nút bật/tắt nhanh Dark mode */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleToggleTheme}
            title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          {/* Nút Avatar người dùng để mở Dropdown */}
          <div className={styles.avatarTriggerWrapper}>
            <button
              type="button"
              className={`${styles.avatarBtn} ${isDropdownOpen ? styles.avatarBtnActive : ""}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-label="Tài khoản của bạn"
              aria-expanded={isDropdownOpen}
            >
              <div
                className={styles.avatar}
                style={user.avatar ? { backgroundImage: `url('${assetUrl(user.avatar)}')` } : {}}
              >
                {!user.avatar &&
                  (user.full_name || user.username || "U").charAt(0).toUpperCase()}
              </div>
              <span className={styles.chevronIcon}>▾</span>
            </button>

            {/* Dropdown Menu xổ xuống */}
            <UserDropdown
              user={user}
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              onLogoutClick={handleLogoutClick}
            />
          </div>
        </div>
      </header>

      {/* HỘP THOẠI POPUP THÔNG BÁO XÁC NHẬN ĐĂNG XUẤT */}
      <NoticeModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText || "OK"}
        cancelText={modal.cancelText}
        onCancel={() => setModal((prev) => ({ ...prev, isOpen: false }))}
        onClose={() => {
          if (modal.onConfirm) modal.onConfirm();
          else setModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </>
  );
}
