import React from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./leftSidebar.module.css";
import { assetUrl, readUser } from "../services/api";

export default function LeftSidebar() {
  const user = readUser() || {};
  const location = useLocation();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navList}>
        {/* PROFILE LINK */}
        <Link to="/profile" className={styles.navItem}>
          <div
            className={styles.avatar}
            style={user.avatar ? { backgroundImage: `url('${assetUrl(user.avatar)}')` } : {}}
          >
            {!user.avatar &&
              (user.full_name || user.username || "U").charAt(0).toUpperCase()}
          </div>
          <span className={styles.navLabelBold}>
            {user.full_name || user.username || "Trang cá nhân"}
          </span>
        </Link>

        {/* BẢNG TIN */}
        <Link
          to="/feed"
          className={`${styles.navItem} ${location.pathname === "/feed" ? styles.navItemActive : ""}`}
        >
          <div className={styles.iconWrapper}>📰</div>
          <span className={styles.navLabel}>Bảng tin</span>
        </Link>

        {/* BẠN BÈ */}
        <div className={styles.navItem} role="button" tabIndex={0}>
          <div className={styles.iconWrapper}>👥</div>
          <span className={styles.navLabel}>Bạn bè</span>
        </div>

        {/* ĐÃ LƯU */}
        <Link
          to="/saved"
          className={`${styles.navItem} ${location.pathname === "/saved" ? styles.navItemActive : ""}`}
        >
          <div className={styles.iconWrapper}>🔖</div>
          <span className={styles.navLabel}>Đã lưu</span>
        </Link>

        {/* NHÓM */}
        <div className={styles.navItem} role="button" tabIndex={0}>
          <div className={styles.iconWrapper}>👥</div>
          <span className={styles.navLabel}>Nhóm</span>
        </div>

        {/* VIDEO */}
        <div className={styles.navItem} role="button" tabIndex={0}>
          <div className={styles.iconWrapper}>📺</div>
          <span className={styles.navLabel}>Video</span>
        </div>

        {/* KỶ NIỆM */}
        <div className={styles.navItem} role="button" tabIndex={0}>
          <div className={styles.iconWrapper}>⏰</div>
          <span className={styles.navLabel}>Kỷ niệm</span>
        </div>
      </nav>

      <footer className={styles.sidebarFooter}>
        <p>Quyền riêng tư · Điều khoản · Quảng cáo · Fella © 2026</p>
      </footer>
    </aside>
  );
}
