import { useNavigate, Link } from "react-router-dom";
import styles from "./navbar.module.css";
import { assetUrl, readUser } from '../services/api';

export default function Navbar({ compact = false }) {
  const navigate = useNavigate();
  const user = readUser() || {};

  const handleLogout = () => {
    localStorage.removeItem("fella_token");
    localStorage.removeItem("fella_user");
    navigate("/login");
  };

  return (
    <header className={styles.navbar}>
      <Link className={styles.logo} to="/feed">
        Fella
      </Link>

      <div className={styles.userInfo}>
        <Link to="/saved" className={styles.userProfileLink}>Đã lưu</Link>
        {!compact && (
          <Link to="/profile" className={styles.userProfileLink}>
            <div
              className={`${styles.avatar} ${styles.avatarSm}`}
              style={
                user.avatar ? { backgroundImage: `url('${assetUrl(user.avatar)}')` } : {}
              }
            >
              {!user.avatar &&
                (user.full_name || user.username || "U")
                  .charAt(0)
                  .toUpperCase()}
            </div>
            <span className={styles.userName}>
              {user.full_name || user.username || "Xin chào!"}
            </span>
          </Link>
        )}

        <button onClick={handleLogout} className={styles.btnLogout}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
